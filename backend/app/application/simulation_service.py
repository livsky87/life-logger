from app.domain.models.simulation import Simulation
from app.domain.repositories.simulation_repository import SimulationRepository


class SimulationService:
    def __init__(self, repo: SimulationRepository) -> None:
        self._repo = repo

    async def create(
        self,
        location_id: str,
        name: str,
        devices: list,
        metadata: dict,
    ) -> Simulation:
        return await self._repo.create(
            location_id=location_id,
            name=name,
            devices=devices,
            metadata=metadata,
        )

    async def get_by_id(self, simulation_id: int) -> Simulation | None:
        return await self._repo.get_by_id(simulation_id)

    async def get_all(self) -> list[Simulation]:
        return await self._repo.get_all()

    async def update(
        self,
        simulation_id: int,
        location_id: str | None = None,
        name: str | None = None,
        devices: list | None = None,
        metadata: dict | None = None,
    ) -> Simulation | None:
        return await self._repo.update(
            simulation_id=simulation_id,
            location_id=location_id,
            name=name,
            devices=devices,
            metadata=metadata,
        )

    async def delete(self, simulation_id: int) -> bool:
        return await self._repo.delete(simulation_id)
