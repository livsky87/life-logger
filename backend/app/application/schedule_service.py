from uuid import UUID

from app.domain.models.schedule import Schedule
from app.domain.repositories.schedule_repository import ScheduleRepository


class ScheduleService:
    def __init__(self, repo: ScheduleRepository) -> None:
        self._repo = repo

    async def create(
        self,
        user_id: UUID | None,
        date: int,
        hour: int,
        minute: int,
        description: str,
        calls: list,
        location: str,
        is_home: bool,
        metadata: dict,
        status: str,
    ) -> Schedule:
        return await self._repo.create(
            user_id=user_id,
            date=date,
            hour=hour,
            minute=minute,
            description=description,
            calls=calls,
            location=location,
            is_home=is_home,
            metadata=metadata,
            status=status,
        )

    async def get_by_id(self, schedule_id: int) -> Schedule | None:
        return await self._repo.get_by_id(schedule_id)

    async def get_by_date(self, date: int, user_id: UUID | None = None) -> list[Schedule]:
        return await self._repo.get_by_date(date, user_id=user_id)

    async def update(
        self,
        schedule_id: int,
        user_id: UUID | None = None,
        date: int | None = None,
        hour: int | None = None,
        minute: int | None = None,
        description: str | None = None,
        calls: list | None = None,
        location: str | None = None,
        is_home: bool | None = None,
        metadata: dict | None = None,
        status: str | None = None,
    ) -> Schedule | None:
        return await self._repo.update(
            schedule_id=schedule_id,
            user_id=user_id,
            date=date,
            hour=hour,
            minute=minute,
            description=description,
            calls=calls,
            location=location,
            is_home=is_home,
            metadata=metadata,
            status=status,
        )

    async def delete(self, schedule_id: int) -> bool:
        return await self._repo.delete(schedule_id)
