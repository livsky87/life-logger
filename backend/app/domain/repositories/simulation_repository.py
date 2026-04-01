from abc import ABC, abstractmethod

from app.domain.models.simulation import Simulation


class SimulationRepository(ABC):
    @abstractmethod
    async def create(
        self,
        location_id: str,
        name: str,
        devices: list,
        metadata: dict,
    ) -> Simulation: ...

    @abstractmethod
    async def get_by_id(self, simulation_id: int) -> Simulation | None: ...

    @abstractmethod
    async def get_all(self) -> list[Simulation]: ...

    @abstractmethod
    async def update(
        self,
        simulation_id: int,
        location_id: str | None,
        name: str | None,
        devices: list | None,
        metadata: dict | None,
    ) -> Simulation | None: ...

    @abstractmethod
    async def delete(self, simulation_id: int) -> bool: ...
