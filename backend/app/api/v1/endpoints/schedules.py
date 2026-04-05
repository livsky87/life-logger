from datetime import datetime as DateTime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.api.deps import ScheduleServiceDep, DBSession
from app.api.schemas.schedule import (
    ScheduleBatchCreate,
    ScheduleBatchResult,
    ScheduleCreate,
    ScheduleResponse,
    ScheduleTimelineLocation,
    ScheduleTimelineResponse,
    ScheduleTimelineUser,
    ScheduleUpdate,
)
from app.infrastructure.db.models import LocationORM, UserORM

router = APIRouter()

KST = timezone(timedelta(hours=9))


def _date_range(date: int, days: int = 1) -> tuple[DateTime, DateTime]:
    """Return UTC-aware [start, end) for a KST YYYYMMDD date range."""
    s = str(date)
    day_start_kst = DateTime(int(s[:4]), int(s[4:6]), int(s[6:8]), 0, 0, 0, tzinfo=KST)
    day_end_kst = day_start_kst + timedelta(days=days)
    return day_start_kst.astimezone(timezone.utc), day_end_kst.astimezone(timezone.utc)


def _to_response(schedule) -> ScheduleResponse:
    return ScheduleResponse(
        id=schedule.id,
        user_id=schedule.user_id,
        datetime=schedule.timestamp,   # ORM column is "timestamp", API field is "datetime"
        description=schedule.description,
        calls=schedule.calls,
        location=schedule.location,
        is_home=schedule.is_home,
        metadata=schedule.metadata,
        status=schedule.status if isinstance(schedule.status, list) else [],
        created_at=schedule.created_at,
    )


def _datetime_to_date_int(dt: DateTime) -> int:
    kst_dt = dt.astimezone(KST)
    return int(kst_dt.strftime("%Y%m%d"))


@router.post("/batch", response_model=ScheduleBatchResult, status_code=201)
async def batch_upload_schedules(
    body: ScheduleBatchCreate,
    service: ScheduleServiceDep,
    db: DBSession,
):
    """
    Batch upload a full day's schedule for one user.
    - location_id in body takes priority over metadata.home.locationId.
    - user_job is stored if provided.
    - Derives date from first entry's datetime (KST).
    - If replace=True, deletes existing entries for that user+day first.
    """
    if not body.entries:
        raise HTTPException(status_code=400, detail="entries must not be empty")

    first = body.entries[0]
    if first.user_id is None:
        raise HTTPException(status_code=400, detail="user_id is required in entries")

    user_id = first.user_id
    date_int = _datetime_to_date_int(first.datetime)
    date_start, date_end = _date_range(date_int)

    # Resolve location_id: explicit body field > metadata.home.locationId
    location_id: UUID | None = None
    if body.location_id:
        try:
            location_id = UUID(str(body.location_id))
        except (ValueError, AttributeError):
            pass

    if location_id is None:
        home_meta = first.metadata.get("home", {}) if first.metadata else {}
        raw_loc_id = home_meta.get("locationId")
        if raw_loc_id:
            try:
                location_id = UUID(str(raw_loc_id))
            except (ValueError, AttributeError):
                pass

    # Upsert location
    if location_id:
        loc_orm = await db.get(LocationORM, location_id)
        if not loc_orm:
            loc_name = body.location_name or "홈"
            loc_orm = LocationORM(
                id=location_id,
                name=loc_name,
                timezone=body.timezone,
            )
            db.add(loc_orm)
            await db.flush()
    else:
        loc_name = body.location_name or "홈"
        loc_orm = LocationORM(name=loc_name, timezone=body.timezone)
        db.add(loc_orm)
        await db.flush()
        location_id = loc_orm.id

    # Upsert user
    user_orm = await db.get(UserORM, user_id)
    if not user_orm:
        user_orm = UserORM(
            id=user_id,
            location_id=location_id,
            name=body.user_name or f"사용자_{str(user_id)[:8]}",
            job=body.user_job,
        )
        db.add(user_orm)
        await db.flush()
    else:
        # Update name/job if provided
        if body.user_name:
            user_orm.name = body.user_name
        if body.user_job:
            user_orm.job = body.user_job

    # Delete existing if replace=True
    deleted = 0
    if body.replace:
        deleted = await service.delete_by_user_date(user_id, date_start, date_end)

    # Bulk create — map schema "datetime" → internal "timestamp"
    entries_dicts = [
        {
            "user_id": user_id,
            "timestamp": e.datetime,
            "description": e.description,
            "calls": [c.model_dump() for c in e.calls],
            "location": e.location,
            "is_home": e.is_home,
            "metadata": e.metadata,
            "status": e.status if isinstance(e.status, list) else [],
        }
        for e in body.entries
    ]
    created_list = await service.bulk_create(entries_dicts)

    return ScheduleBatchResult(
        deleted=deleted,
        created=len(created_list),
        user_id=str(user_id),
        location_id=str(location_id),
        date=date_int,
    )


@router.delete("/day", status_code=200)
async def delete_day_schedules(
    service: ScheduleServiceDep,
    user_id: UUID = Query(..., description="User UUID"),
    date: int = Query(..., description="Date in YYYYMMDD format (KST)"),
):
    """Delete all schedule entries for a user on a specific KST date."""
    date_start, date_end = _date_range(date)
    deleted = await service.delete_by_user_date(user_id, date_start, date_end)
    return {"deleted": deleted, "user_id": str(user_id), "date": date}


@router.get("/timeline", response_model=ScheduleTimelineResponse)
async def get_schedule_timeline(
    db: DBSession,
    service: ScheduleServiceDep,
    date: int = Query(..., description="Date in YYYYMMDD format (KST)"),
    days: int = Query(default=1, ge=1, le=31, description="Inclusive day count from start date"),
    location_id: UUID | None = Query(default=None, description="Filter by location UUID"),
):
    """Return schedule data grouped by location → user for timeline rendering."""
    date_start, date_end = _date_range(date, days=days)
    schedules = await service.get_by_date(date_start, date_end)

    if not schedules:
        if location_id:
            loc = await db.get(LocationORM, location_id)
            if loc:
                return ScheduleTimelineResponse(
                    date=date,
                    range_days=days,
                    locations=[ScheduleTimelineLocation(
                        location_id=str(loc.id),
                        name=loc.name,
                        timezone=loc.timezone,
                        users=[],
                    )],
                )
        return ScheduleTimelineResponse(date=date, range_days=days, locations=[])

    user_ids = list({s.user_id for s in schedules if s.user_id})

    users_result = await db.execute(
        select(UserORM).where(UserORM.id.in_([UUID(uid) for uid in user_ids]))
    )
    users_map = {str(u.id): u for u in users_result.scalars()}

    loc_ids = list({u.location_id for u in users_map.values()})
    locs_result = await db.execute(
        select(LocationORM).where(LocationORM.id.in_(loc_ids))
    )
    locs_map = {str(l.id): l for l in locs_result.scalars()}

    if location_id:
        target_loc_id = str(location_id)
        user_ids = [uid for uid in user_ids if str(users_map.get(uid, UserORM()).location_id) == target_loc_id]
        locs_map = {k: v for k, v in locs_map.items() if k == target_loc_id}

    from collections import defaultdict
    loc_user_entries: dict[str, dict[str, list]] = defaultdict(lambda: defaultdict(list))

    for sched in schedules:
        if not sched.user_id:
            continue
        user = users_map.get(sched.user_id)
        if not user:
            continue
        loc_id_str = str(user.location_id)
        if location_id and loc_id_str != str(location_id):
            continue
        loc_user_entries[loc_id_str][sched.user_id].append(sched)

    locations_out = []
    for loc_id_str, user_entries in loc_user_entries.items():
        loc = locs_map.get(loc_id_str)
        if not loc:
            continue
        users_out = []
        for uid, entries in user_entries.items():
            user = users_map.get(uid)
            if not user:
                continue
            users_out.append(ScheduleTimelineUser(
                user_id=uid,
                user_name=user.name,
                user_job=user.job,
                entries=[_to_response(e) for e in sorted(entries, key=lambda x: x.timestamp)],
            ))
        locations_out.append(ScheduleTimelineLocation(
            location_id=loc_id_str,
            name=loc.name,
            timezone=loc.timezone,
            users=users_out,
        ))

    return ScheduleTimelineResponse(date=date, range_days=days, locations=locations_out)


@router.post("", response_model=ScheduleResponse, status_code=201)
async def create_schedule(body: ScheduleCreate, service: ScheduleServiceDep):
    schedule = await service.create(
        user_id=body.user_id,
        timestamp=body.datetime,
        description=body.description,
        calls=[c.model_dump() for c in body.calls],
        location=body.location,
        is_home=body.is_home,
        metadata=body.metadata,
        status=body.status if isinstance(body.status, list) else [],
    )
    return _to_response(schedule)


@router.get("", response_model=list[ScheduleResponse])
async def list_schedules(
    service: ScheduleServiceDep,
    date: int = Query(..., description="Date in YYYYMMDD format (KST)"),
    user_id: UUID | None = Query(default=None, description="Filter by user UUID"),
):
    date_start, date_end = _date_range(date)
    schedules = await service.get_by_date(date_start, date_end, user_id=user_id)
    return [_to_response(s) for s in schedules]


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(schedule_id: int, body: ScheduleUpdate, service: ScheduleServiceDep):
    calls_raw = [c.model_dump() for c in body.calls] if body.calls is not None else None
    schedule = await service.update(
        schedule_id=schedule_id,
        user_id=body.user_id,
        timestamp=body.datetime,
        description=body.description,
        calls=calls_raw,
        location=body.location,
        is_home=body.is_home,
        metadata=body.metadata,
        status=body.status,
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return _to_response(schedule)


@router.delete("/{schedule_id}", status_code=204)
async def delete_schedule(schedule_id: int, service: ScheduleServiceDep):
    deleted = await service.delete(schedule_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Schedule not found")
