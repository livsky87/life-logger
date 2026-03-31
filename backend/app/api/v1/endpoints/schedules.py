from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import ScheduleServiceDep
from app.api.schemas.schedule import ScheduleCreate, ScheduleResponse, ScheduleUpdate

router = APIRouter()


def _to_response(schedule) -> ScheduleResponse:
    return ScheduleResponse.model_validate(
        schedule.__dict__ | {"metadata": schedule.metadata, "user_id": schedule.user_id}
    )


@router.post("", response_model=ScheduleResponse, status_code=201)
async def create_schedule(body: ScheduleCreate, service: ScheduleServiceDep):
    """Create a new schedule entry."""
    schedule = await service.create(
        user_id=body.user_id,
        date=body.date,
        hour=body.hour,
        minute=body.minute,
        description=body.description,
        calls=[c.model_dump() for c in body.calls],
        location=body.location,
        is_home=body.is_home,
        metadata=body.metadata,
        status=body.status,
    )
    return _to_response(schedule)


@router.get("", response_model=list[ScheduleResponse])
async def list_schedules(
    service: ScheduleServiceDep,
    date: int = Query(..., description="Date in YYYYMMDD format, e.g. 20260331"),
    user_id: UUID | None = Query(default=None, description="Filter by user UUID"),
):
    """List all schedule entries for a given date, ordered by hour/minute."""
    schedules = await service.get_by_date(date, user_id=user_id)
    return [_to_response(s) for s in schedules]


@router.get("/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(schedule_id: int, service: ScheduleServiceDep):
    schedule = await service.get_by_id(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return _to_response(schedule)


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(schedule_id: int, body: ScheduleUpdate, service: ScheduleServiceDep):
    """Update a schedule entry. Only provided fields are updated."""
    calls_raw = [c.model_dump() for c in body.calls] if body.calls is not None else None
    schedule = await service.update(
        schedule_id=schedule_id,
        user_id=body.user_id,
        date=body.date,
        hour=body.hour,
        minute=body.minute,
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
