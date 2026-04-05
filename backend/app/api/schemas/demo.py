from uuid import UUID

from pydantic import BaseModel, Field


class ShiftSchedulesToTodayBody(BaseModel):
    """KST 기준 source_date 하루 스케줄을 오늘 날짜로 복제합니다."""

    source_date: int = Field(..., ge=20000101, le=20991231, description="YYYYMMDD (KST)")
    replace: bool = Field(default=True, description="오늘(KST) 기존 스케줄을 동일 사용자 범위에서 먼저 삭제")
    user_id: UUID | None = Field(default=None, description="지정 시 해당 사용자만 이동·덮어쓰기")


class ShiftSchedulesToTodayResponse(BaseModel):
    source_date: int
    target_date: int
    day_offset: int = 0
    created: int = 0
    deleted_today: int = 0
    skipped_no_user: int = 0
    users_affected: int = 0
    message: str | None = None


class ObservationHeartbeatResponse(BaseModel):
    recorded: bool
    probed_url: str
    http_status: int | None
    outcome: str
    description: str
    location_id: str


class SeedFakeTodayBody(BaseModel):
    """오늘(KST) 가짜 스케줄 + 5분 간격 가짜 api_observations 적재."""

    location_id: UUID | None = Field(
        default=None,
        description="점검 데이터에 붙일 위치. 비우면 기존 사용자의 location 또는 자동 생성 위치",
    )
    user_id: UUID | None = Field(default=None, description="스케줄만 이 사용자에게만 넣기(비우면 전체 사용자)")
    replace_schedules: bool = Field(default=True, description="오늘(KST) 해당 사용자 스케줄 선삭제")
    seed_schedules: bool = Field(default=True)
    seed_observations: bool = Field(default=True)
    observation_interval_minutes: int = Field(default=5, ge=1, le=60)
    observations_full_kst_day: bool = Field(
        default=True,
        description="True면 오늘 0시~24시(KST) 전 구간에 채움. False면 현재 시각까지만",
    )
    assign_observations_to_users: bool = Field(
        default=False,
        description="True면 가짜 점검에 user_id를 순환 부여(사용자 스트립에도 표시)",
    )
    create_demo_entities_if_empty: bool = Field(
        default=True,
        description="사용자가 없으면 데모 위치·사용자 1명 자동 생성",
    )


class SeedFakeTodayResponse(BaseModel):
    location_id: str = ""
    user_ids: list[str] = Field(default_factory=list)
    schedules_created: int = 0
    schedules_deleted: int = 0
    observations_created: int = 0
    created_demo_entities: bool = False
    message: str | None = None
