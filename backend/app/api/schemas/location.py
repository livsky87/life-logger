from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class LocationCreate(BaseModel):
    location_code: str | None = None
    name: str
    timezone: str = "UTC"
    description: str | None = None
    residence_city: str | None = None
    residence_type: str | None = None
    country: str | None = None


class LocationResponse(BaseModel):
    id: UUID
    location_code: str | None
    name: str
    timezone: str
    description: str | None
    residence_city: str | None = None
    residence_type: str | None = None
    country: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
