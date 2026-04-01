from fastapi import APIRouter, HTTPException

from app.api.deps import SimulationServiceDep
from app.api.schemas.simulation import SimulationCreate, SimulationResponse, SimulationUpdate

router = APIRouter()


@router.post("", response_model=SimulationResponse, status_code=201)
async def create_simulation(body: SimulationCreate, service: SimulationServiceDep):
    """Create a new simulation configuration."""
    sim = await service.create(
        location_id=body.location_id,
        name=body.name,
        devices=body.devices,
        metadata=body.metadata,
    )
    return SimulationResponse.model_validate(sim.__dict__ | {"metadata": sim.metadata})


@router.get("", response_model=list[SimulationResponse])
async def list_simulations(service: SimulationServiceDep):
    """List all simulation configurations."""
    sims = await service.get_all()
    return [SimulationResponse.model_validate(s.__dict__ | {"metadata": s.metadata}) for s in sims]


@router.get("/{simulation_id}", response_model=SimulationResponse)
async def get_simulation(simulation_id: int, service: SimulationServiceDep):
    sim = await service.get_by_id(simulation_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return SimulationResponse.model_validate(sim.__dict__ | {"metadata": sim.metadata})


@router.put("/{simulation_id}", response_model=SimulationResponse)
async def update_simulation(simulation_id: int, body: SimulationUpdate, service: SimulationServiceDep):
    """Update a simulation configuration. Only provided fields are updated."""
    sim = await service.update(
        simulation_id=simulation_id,
        location_id=body.location_id,
        name=body.name,
        devices=body.devices,
        metadata=body.metadata,
    )
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return SimulationResponse.model_validate(sim.__dict__ | {"metadata": sim.metadata})


@router.delete("/{simulation_id}", status_code=204)
async def delete_simulation(simulation_id: int, service: SimulationServiceDep):
    deleted = await service.delete(simulation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Simulation not found")
