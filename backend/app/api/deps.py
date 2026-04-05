import hmac
from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.api_observation_service import ApiObservationService
from app.application.demo_seed_service import DemoSeedService
from app.application.life_log_service import LifeLogService
from app.application.location_service import LocationService
from app.application.schedule_service import ScheduleService
from app.application.user_service import UserService
from app.config import settings
from app.database import get_db
from app.infrastructure.db.repositories.api_observation_repository import SQLAlchemyApiObservationRepository
from app.infrastructure.db.repositories.life_log_repository import SQLAlchemyLifeLogRepository
from app.infrastructure.db.repositories.location_repository import SQLAlchemyLocationRepository
from app.infrastructure.db.repositories.schedule_repository import SQLAlchemyScheduleRepository
from app.infrastructure.db.repositories.user_repository import SQLAlchemyUserRepository

DBSession = Annotated[AsyncSession, Depends(get_db)]


def require_admin_bearer(authorization: str | None = Header(None)) -> None:
    """GET 등 미들웨어를 통과하는 라우트용 Bearer 검사."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization 헤더가 필요합니다.")
    parts = authorization.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authorization: Bearer <token> 형식이어야 합니다.")
    if not hmac.compare_digest(parts[1].strip().encode("utf-8"), settings.api_admin_token.encode("utf-8")):
        raise HTTPException(status_code=401, detail="토큰이 올바르지 않습니다.")


def get_location_service(db: DBSession) -> LocationService:
    return LocationService(SQLAlchemyLocationRepository(db))


def get_user_service(db: DBSession) -> UserService:
    return UserService(SQLAlchemyUserRepository(db))


def get_life_log_service(db: DBSession) -> LifeLogService:
    return LifeLogService(
        SQLAlchemyLifeLogRepository(db),
        SQLAlchemyLocationRepository(db),
    )


def get_schedule_service(db: DBSession) -> ScheduleService:
    return ScheduleService(SQLAlchemyScheduleRepository(db))


def get_api_observation_service(db: DBSession) -> ApiObservationService:
    return ApiObservationService(SQLAlchemyApiObservationRepository(db))


def get_demo_seed_service(db: DBSession) -> DemoSeedService:
    return DemoSeedService(
        schedule_service=ScheduleService(SQLAlchemyScheduleRepository(db)),
        observation_service=ApiObservationService(SQLAlchemyApiObservationRepository(db)),
        user_service=UserService(SQLAlchemyUserRepository(db)),
        location_service=LocationService(SQLAlchemyLocationRepository(db)),
    )


LocationServiceDep = Annotated[LocationService, Depends(get_location_service)]
UserServiceDep = Annotated[UserService, Depends(get_user_service)]
LifeLogServiceDep = Annotated[LifeLogService, Depends(get_life_log_service)]
ScheduleServiceDep = Annotated[ScheduleService, Depends(get_schedule_service)]
ApiObservationServiceDep = Annotated[ApiObservationService, Depends(get_api_observation_service)]
DemoSeedServiceDep = Annotated[DemoSeedService, Depends(get_demo_seed_service)]
