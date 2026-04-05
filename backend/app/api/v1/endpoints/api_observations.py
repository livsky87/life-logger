from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import ApiObservationServiceDep
from app.api.schemas.api_observation import (
    ApiObservationBatchCreate,
    ApiObservationResponse,
)

router = APIRouter()


def _to_response(o) -> ApiObservationResponse:
    return ApiObservationResponse(
        id=o.id,
        observed_at=o.observed_at,
        method=o.method,
        detail=o.detail,
        http_status=o.http_status,
        outcome=o.outcome,
        description=o.description,
        location_id=str(o.location_id) if o.location_id else None,
        user_id=str(o.user_id) if o.user_id else None,
        created_at=o.created_at,
    )


@router.post("/batch", response_model=list[ApiObservationResponse], status_code=201)
async def create_observations_batch(body: ApiObservationBatchCreate, service: ApiObservationServiceDep):
    """HDE 수집 등 다건 기록. 비-GET 요청은 Admin Bearer 필요."""
    try:
        items = [it.model_dump() for it in body.items]
        created = await service.ingest_batch(items)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return [_to_response(x) for x in created]


@router.get("", response_model=list[ApiObservationResponse])
async def list_observations(
    service: ApiObservationServiceDep,
    start: datetime = Query(..., description="Range start (inclusive), ISO 8601"),
    end: datetime = Query(..., description="Range end (exclusive), ISO 8601"),
    location_id: UUID | None = Query(default=None),
    user_id: UUID | None = Query(default=None),
    system_only: bool = Query(
        default=False,
        description="If true, only rows with user_id IS NULL (위치 공통 점검)",
    ),
):
    """타임라인 표시용 구간 조회. location_id로 위치별 필터."""
    if end <= start:
        raise HTTPException(status_code=400, detail="end must be after start")
    use_system_only = system_only and user_id is None
    rows = await service.list_for_timeline(
        start,
        end,
        location_id=location_id,
        user_id=user_id,
        user_id_is_null=use_system_only,
    )
    return [_to_response(x) for x in rows]
