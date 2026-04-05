from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.api.deps import DemoSeedServiceDep, require_admin_bearer
from app.api.schemas.demo import (
    ObservationHeartbeatResponse,
    SeedFakeTodayBody,
    SeedFakeTodayResponse,
    ShiftSchedulesToTodayBody,
    ShiftSchedulesToTodayResponse,
)

router = APIRouter(dependencies=[Depends(require_admin_bearer)])


@router.post(
    "/shift-schedules-to-today",
    response_model=ShiftSchedulesToTodayResponse,
    summary="스케줄을 KST 오늘 날짜로 복제(분석·데모용)",
)
async def shift_schedules_to_today(body: ShiftSchedulesToTodayBody, svc: DemoSeedServiceDep):
    """
    `source_date`(KST 하루)에 있는 스케줄을 **같은 시·분**으로 **오늘(KST)** 타임스탬프에 복제합니다.
    `replace=true`이면 복제에 관여한 사용자의 오늘(KST) 스케줄을 먼저 삭제합니다.
    """
    raw = await svc.shift_schedules_to_today(
        body.source_date,
        replace=body.replace,
        user_id=body.user_id,
    )
    return ShiftSchedulesToTodayResponse(**raw)


@router.get(
    "/observation-heartbeat",
    response_model=ObservationHeartbeatResponse,
    summary="5분 크론 등: /health 프로브 후 api_observations 기록",
)
async def observation_heartbeat(
    request: Request,
    svc: DemoSeedServiceDep,
    location_id: UUID = Query(..., description="기록에 붙일 위치 UUID"),
):
    """
    서버 자신의 `GET /health`를 호출하고, 결과를 `api_observations`에 1건 저장합니다.
    **Authorization: Bearer** (API_ADMIN_TOKEN) 필요. (GET이라 미들웨어가 아닌 라우트 의존성으로 검사)
    """
    base = str(request.base_url)
    raw = await svc.observation_heartbeat(base_url=base, location_id=location_id)
    return ObservationHeartbeatResponse(**raw)


@router.post(
    "/seed-fake-today",
    response_model=SeedFakeTodayResponse,
    summary="오늘(KST) 가짜 스케줄 + N분 간격 가짜 api_observations 적재",
)
async def seed_fake_today(body: SeedFakeTodayBody, svc: DemoSeedServiceDep):
    """
    - 스케줄: 하루 패턴(가짜 활동)을 오늘 KST 시각으로 삽입합니다. 설명·메타에 `[가짜]`/`demo_seed` 표기.
    - 점검: 오늘 0시(KST)부터 **현재 시각까지** `observation_interval_minutes` 간격으로 가짜 `api_observations`를 넣습니다.
    - 사용자가 없고 `create_demo_entities_if_empty=true`이면 위치·사용자 1명을 만듭니다.
    """
    raw = await svc.seed_fake_today(
        location_id=body.location_id,
        user_id=body.user_id,
        replace_schedules=body.replace_schedules,
        seed_schedules=body.seed_schedules,
        seed_observations=body.seed_observations,
        observation_interval_minutes=body.observation_interval_minutes,
        observations_full_kst_day=body.observations_full_kst_day,
        assign_observations_to_users=body.assign_observations_to_users,
        create_demo_entities_if_empty=body.create_demo_entities_if_empty,
    )
    return SeedFakeTodayResponse(**raw)
