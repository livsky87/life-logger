from uuid import UUID

from fastapi import APIRouter

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
