from uuid import UUID

from fastapi import APIRouter

from app.api.deps import UserServiceDep
from app.api.schemas.user import UserCreate, UserResponse

router = APIRouter()


@router.get("", response_model=list[UserResponse])
async def list_users(service: UserServiceDep, location_id: UUID | None = None):
    users = await service.get_all(location_id=location_id)
    return [UserResponse.model_validate(u) for u in users]


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(body: UserCreate, service: UserServiceDep):
    user = await service.create(location_id=body.location_id, name=body.name, email=body.email, job=body.job)
    return UserResponse.model_validate(user)
