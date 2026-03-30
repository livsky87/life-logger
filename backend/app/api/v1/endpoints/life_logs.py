from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import LifeLogServiceDep
from app.api.schemas.life_log import LifeLogCreate, LifeLogEndEvent, LifeLogResponse

router = APIRouter()


@router.post("", response_model=LifeLogResponse, status_code=201)
async def ingest_log(body: LifeLogCreate, service: LifeLogServiceDep):
    """Ingest a new life log event. Real-time entry point."""
    log = await service.ingest(
        user_id=body.user_id,
        location_id=body.location_id,
        category=body.category,
        event_type=body.event_type,
        started_at=body.started_at,
        ended_at=body.ended_at,
        data=body.data,
    )
    return LifeLogResponse.model_validate(log)


@router.patch("/{log_id}/end", response_model=LifeLogResponse)
async def end_event(log_id: int, body: LifeLogEndEvent, service: LifeLogServiceDep):
    """Close an open event by setting its ended_at."""
    log = await service.close_event(log_id, body.ended_at)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    return LifeLogResponse.model_validate(log)


@router.get("/timeline")
async def get_timeline(
    service: LifeLogServiceDep,
    start: str = Query(..., description="Range start in YYYY-MM-DD format"),
    end: str = Query(..., description="Range end (exclusive) in YYYY-MM-DD format"),
    location_ids: list[UUID] = Query(default=[], alias="location_id"),
    period: str = Query(default="1d", description="View period: 1d | 1w | 1m"),
):
    """
    Core dashboard endpoint. Returns Gantt-style events grouped by location > user.
    start/end define the time window (end is exclusive).
    period controls event sampling density to handle large datasets.
    """
    return await service.get_timeline(start, end, location_ids or None, period)


@router.get("", response_model=list[LifeLogResponse])
async def list_logs(
    service: LifeLogServiceDep,
    user_id: UUID | None = None,
    location_id: UUID | None = None,
    category: str | None = None,
    limit: int = Query(default=50, le=200),
    cursor: int | None = None,
):
    logs = await service.get_paginated(user_id, location_id, category, limit, cursor)
    return [LifeLogResponse.model_validate(log) for log in logs]


@router.get("/{log_id}", response_model=LifeLogResponse)
async def get_log(log_id: int, service: LifeLogServiceDep):
    log = await service.get_by_id(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    return LifeLogResponse.model_validate(log)


@router.delete("/{log_id}", status_code=204)
async def delete_log(log_id: int, service: LifeLogServiceDep):
    deleted = await service.delete(log_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Log not found")
