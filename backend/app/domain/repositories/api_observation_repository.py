from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from app.domain.models.api_observation import ApiObservation


class ApiObservationRepository(ABC):
    @abstractmethod
    async def create_many(
        self,
        rows: list[dict],
    ) -> list[ApiObservation]: ...

    @abstractmethod
    async def list_in_range(
        self,
        start: datetime,
        end: datetime,
        location_id: UUID | None,
        user_id: UUID | None,
        user_id_is_null: bool,
    ) -> list[ApiObservation]: ...
