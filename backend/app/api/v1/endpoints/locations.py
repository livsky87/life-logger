from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.api.deps import LocationServiceDep
from app.api.schemas.location import LocationCreate, LocationResponse

router = APIRouter()


@router.get("", response_model=list[LocationResponse])
async def list_locations(service: LocationServiceDep):
    locations = await service.get_all()
    return [LocationResponse.model_validate(loc) for loc in locations]


@router.post("", response_model=LocationResponse, status_code=201)
async def create_location(body: LocationCreate, service: LocationServiceDep):
    loc = await service.create(name=body.name, timezone=body.timezone, description=body.description, location_code=body.location_code)
    return LocationResponse.model_validate(loc)


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(location_id: UUID, service: LocationServiceDep):
    loc = await service.get_by_id(location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return LocationResponse.model_validate(loc)
