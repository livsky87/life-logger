from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.models.location import Location


class LocationRepository(ABC):
    @abstractmethod
    async def get_all(self) -> list[Location]: ...

    @abstractmethod
    async def get_by_id(self, location_id: UUID) -> Location | None: ...

    @abstractmethod
    async def create(self, name: str, timezone: str, description: str | None, location_code: str | None = None) -> Location: ...
