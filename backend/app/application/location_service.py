from uuid import UUID

from app.domain.models.location import Location
from app.domain.repositories.location_repository import LocationRepository


class LocationService:
    def __init__(self, repo: LocationRepository) -> None:
        self._repo = repo

    async def get_all(self) -> list[Location]:
        return await self._repo.get_all()

    async def get_by_id(self, location_id: UUID) -> Location | None:
        return await self._repo.get_by_id(location_id)

    async def create(self, name: str, timezone: str, description: str | None, location_code: str | None = None) -> Location:
        return await self._repo.create(name=name, timezone=timezone, description=description, location_code=location_code)
