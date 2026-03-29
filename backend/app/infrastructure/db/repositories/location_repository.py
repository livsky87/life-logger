from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.location import Location
from app.domain.repositories.location_repository import LocationRepository
from app.infrastructure.db.models import LocationORM


def _to_domain(orm: LocationORM) -> Location:
    return Location(
        id=orm.id,
        location_code=orm.location_code,
        name=orm.name,
        description=orm.description,
        timezone=orm.timezone,
        created_at=orm.created_at,
    )


class SQLAlchemyLocationRepository(LocationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_all(self) -> list[Location]:
        result = await self._session.execute(select(LocationORM).order_by(LocationORM.name))
        return [_to_domain(row) for row in result.scalars()]

    async def get_by_id(self, location_id: UUID) -> Location | None:
        orm = await self._session.get(LocationORM, location_id)
        return _to_domain(orm) if orm else None

    async def create(self, name: str, timezone: str, description: str | None, location_code: str | None = None) -> Location:
        orm = LocationORM(name=name, timezone=timezone, description=description, location_code=location_code)
        self._session.add(orm)
        await self._session.flush()
        await self._session.refresh(orm)
        return _to_domain(orm)
