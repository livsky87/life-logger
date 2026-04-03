from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.simulation import Simulation
from app.domain.repositories.simulation_repository import SimulationRepository
from app.infrastructure.db.models import SimulationORM


def _to_domain(orm: SimulationORM) -> Simulation:
    return Simulation(
        id=orm.id,
        location_id=orm.location_id,
        name=orm.name,
        devices=orm.devices or [],
        metadata=orm.metadata_ or {},
        created_at=orm.created_at,
        updated_at=orm.updated_at,
    )


class SQLAlchemySimulationRepository(SimulationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        location_id: str,
        name: str,
        devices: list,
        metadata: dict,
    ) -> Simulation:
        orm = SimulationORM(
            location_id=location_id,
            name=name,
            devices=devices,
            metadata_=metadata,
        )
        self._session.add(orm)
        await self._session.flush()
        await self._session.refresh(orm)
        return _to_domain(orm)

    async def get_by_id(self, simulation_id: int) -> Simulation | None:
        orm = await self._session.get(SimulationORM, simulation_id)
        return _to_domain(orm) if orm else None

    async def get_all(self) -> list[Simulation]:
        q = select(SimulationORM).order_by(SimulationORM.created_at.desc())
        result = await self._session.execute(q)
        return [_to_domain(row) for row in result.scalars()]

    async def update(
        self,
        simulation_id: int,
        location_id: str | None,
        name: str | None,
        devices: list | None,
        metadata: dict | None,
    ) -> Simulation | None:
        orm = await self._session.get(SimulationORM, simulation_id)
        if not orm:
            return None
        if location_id is not None:
            orm.location_id = location_id
        if name is not None:
            orm.name = name
        if devices is not None:
            orm.devices = devices
        if metadata is not None:
            orm.metadata_ = metadata
        orm.updated_at = datetime.now(timezone.utc)
        await self._session.flush()
        return _to_domain(orm)

    async def delete(self, simulation_id: int) -> bool:
        orm = await self._session.get(SimulationORM, simulation_id)
        if not orm:
            return False
        await self._session.delete(orm)
        await self._session.flush()
        return True
