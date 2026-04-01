from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.models.schedule import Schedule


class ScheduleRepository(ABC):
    @abstractmethod
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
    ) -> Schedule: ...

    @abstractmethod
    async def get_by_id(self, schedule_id: int) -> Schedule | None: ...

    @abstractmethod
    async def get_by_date(self, date: int, user_id: UUID | None = None) -> list[Schedule]: ...

    @abstractmethod
    async def update(
        self,
        schedule_id: int,
        user_id: UUID | None,
        date: int | None,
        hour: int | None,
        minute: int | None,
        description: str | None,
        calls: list | None,
        location: str | None,
        is_home: bool | None,
        metadata: dict | None,
        status: str | None,
    ) -> Schedule | None: ...

    @abstractmethod
    async def delete(self, schedule_id: int) -> bool: ...
