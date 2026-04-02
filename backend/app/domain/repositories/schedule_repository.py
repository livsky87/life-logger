from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from app.domain.models.schedule import Schedule


class ScheduleRepository(ABC):
    @abstractmethod
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
    ) -> Schedule: ...

    @abstractmethod
    async def get_by_id(self, schedule_id: int) -> Schedule | None: ...

    @abstractmethod
    async def get_by_date(
        self,
        date_start: datetime,
        date_end: datetime,
        user_id: UUID | None = None,
    ) -> list[Schedule]: ...

    @abstractmethod
    async def bulk_create(self, entries: list[dict]) -> list[Schedule]: ...

    @abstractmethod
    async def delete_by_user_date(
        self, user_id: UUID, date_start: datetime, date_end: datetime
    ) -> int: ...

    @abstractmethod
    async def update(
        self,
        schedule_id: int,
        user_id: UUID | None,
        timestamp: datetime | None,
        description: str | None,
        calls: list | None,
        location: str | None,
        is_home: bool | None,
        metadata: dict | None,
        status: list | None,
    ) -> Schedule | None: ...

    @abstractmethod
    async def delete(self, schedule_id: int) -> bool: ...
