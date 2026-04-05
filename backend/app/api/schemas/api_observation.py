from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


OutcomeLiteral = Literal["success", "warning", "failure"]


class ApiObservationCreate(BaseModel):
    observed_at: datetime
    method: str = Field(default="GET", max_length=16)
    detail: str = Field(..., min_length=1, max_length=4000)
    http_status: int | None = Field(default=None, ge=100, le=599)
    outcome: OutcomeLiteral
    description: str = Field(default="", max_length=8000)
    location_id: UUID | None = None
    user_id: UUID | None = None


class ApiObservationBatchCreate(BaseModel):
    items: list[ApiObservationCreate] = Field(..., min_length=1, max_length=500)


class ApiObservationResponse(BaseModel):
    id: int
    observed_at: datetime
    method: str
    detail: str
    http_status: int | None
    outcome: str
    description: str
    location_id: str | None
    user_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
