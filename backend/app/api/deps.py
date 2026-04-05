from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.life_log_service import LifeLogService
from app.application.location_service import LocationService
from app.application.schedule_service import ScheduleService
from app.application.user_service import UserService
from app.database import get_db
from app.infrastructure.db.repositories.life_log_repository import SQLAlchemyLifeLogRepository
from app.infrastructure.db.repositories.location_repository import SQLAlchemyLocationRepository
from app.infrastructure.db.repositories.schedule_repository import SQLAlchemyScheduleRepository
from app.infrastructure.db.repositories.user_repository import SQLAlchemyUserRepository

DBSession = Annotated[AsyncSession, Depends(get_db)]


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


LocationServiceDep = Annotated[LocationService, Depends(get_location_service)]
UserServiceDep = Annotated[UserService, Depends(get_user_service)]
LifeLogServiceDep = Annotated[LifeLogService, Depends(get_life_log_service)]
ScheduleServiceDep = Annotated[ScheduleService, Depends(get_schedule_service)]
