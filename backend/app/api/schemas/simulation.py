from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SimulationCreate(BaseModel):
    location_id: str
    name: str
    devices: list[Any] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class SimulationUpdate(BaseModel):
    location_id: str | None = None
    name: str | None = None
    devices: list[Any] | None = None
    metadata: dict | None = None


class SimulationResponse(BaseModel):
    id: int
    location_id: str
    name: str
    devices: list[Any]
    metadata: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
