from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UserCreate(BaseModel):
    location_id: UUID
    name: str
    email: str | None = None
    job: str | None = None


class UserResponse(BaseModel):
    id: UUID
    location_id: UUID
    name: str
    email: str | None
    job: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
