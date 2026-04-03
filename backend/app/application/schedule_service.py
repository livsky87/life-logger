from datetime import datetime
from uuid import UUID

from app.domain.models.schedule import Schedule
from app.domain.repositories.schedule_repository import ScheduleRepository


class ScheduleService:
    def __init__(self, repo: ScheduleRepository) -> None:
        self._repo = repo

    async def create(
        self,
        user_id: UUID | None,
        timestamp: datetime,
        description: str,
        calls: list,
        location: str,
        is_home: bool,
        metadata: dict,
        status: list,
    ) -> Schedule:
        return await self._repo.create(
            user_id=user_id,
            timestamp=timestamp,
            description=description,
            calls=calls,
            location=location,
            is_home=is_home,
            metadata=metadata,
            status=status,
        )

    async def get_by_id(self, schedule_id: int) -> Schedule | None:
        return await self._repo.get_by_id(schedule_id)

    async def get_by_date(
        self,
        date_start: datetime,
        date_end: datetime,
        user_id: UUID | None = None,
    ) -> list[Schedule]:
        return await self._repo.get_by_date(date_start, date_end, user_id=user_id)

    async def bulk_create(self, entries: list[dict]) -> list[Schedule]:
        return await self._repo.bulk_create(entries)

    async def delete_by_user_date(
        self, user_id: UUID, date_start: datetime, date_end: datetime
    ) -> int:
        return await self._repo.delete_by_user_date(user_id, date_start, date_end)

    async def update(
        self,
        schedule_id: int,
        user_id: UUID | None = None,
        timestamp: datetime | None = None,
        description: str | None = None,
        calls: list | None = None,
        location: str | None = None,
        is_home: bool | None = None,
        metadata: dict | None = None,
        status: list | None = None,
    ) -> Schedule | None:
        return await self._repo.update(
            schedule_id=schedule_id,
            user_id=user_id,
            timestamp=timestamp,
            description=description,
            calls=calls,
            location=location,
            is_home=is_home,
            metadata=metadata,
            status=status,
        )

    async def delete(self, schedule_id: int) -> bool:
        return await self._repo.delete(schedule_id)
