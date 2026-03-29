from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from app.domain.models.life_log import LifeLog


class LifeLogRepository(ABC):
    @abstractmethod
    async def create(
        self,
        user_id: UUID,
        location_id: UUID,
        category: str,
        event_type: str,
        started_at: datetime,
        ended_at: datetime | None,
        data: dict,
    ) -> LifeLog: ...

    @abstractmethod
    async def update_ended_at(self, log_id: int, ended_at: datetime) -> LifeLog | None: ...

    @abstractmethod
    async def get_by_id(self, log_id: int) -> LifeLog | None: ...

    @abstractmethod
    async def get_timeline(
        self,
        location_ids: list[UUID],
        start: datetime,
        end: datetime,
    ) -> list[dict]: ...

    @abstractmethod
    async def get_paginated(
        self,
        user_id: UUID | None,
        location_id: UUID | None,
        category: str | None,
        limit: int,
        cursor: int | None,
    ) -> list[LifeLog]: ...

    @abstractmethod
    async def delete(self, log_id: int) -> bool: ...
