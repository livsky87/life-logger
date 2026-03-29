from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class LocationCreate(BaseModel):
    location_code: str | None = None
    name: str
    timezone: str = "UTC"
    description: str | None = None


class LocationResponse(BaseModel):
    id: UUID
    location_code: str | None
    name: str
    timezone: str
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
