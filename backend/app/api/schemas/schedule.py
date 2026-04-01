from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

ScheduleStatus = Literal["normal", "warning", "error"]


class ScheduleCallItem(BaseModel):
    method: str
    url: str
    deviceId: str = ""
    commands: list[Any] = Field(default_factory=list)
    dsec: int = 0
    result: str | None = None


class ScheduleCreate(BaseModel):
    user_id: UUID | None = None
    date: int = Field(..., description="YYYYMMDD format, e.g. 20260331")
    hour: int = Field(..., ge=0, le=23)
    minute: int = Field(..., ge=0, le=59)
    description: str
    calls: list[ScheduleCallItem] = Field(default_factory=list)
    location: str = ""
    is_home: bool = True
    metadata: dict = Field(default_factory=dict)
    status: ScheduleStatus = "normal"


class ScheduleUpdate(BaseModel):
    user_id: UUID | None = None
    date: int | None = None
    hour: int | None = Field(default=None, ge=0, le=23)
    minute: int | None = Field(default=None, ge=0, le=59)
    description: str | None = None
    calls: list[ScheduleCallItem] | None = None
    location: str | None = None
    is_home: bool | None = None
    metadata: dict | None = None
    status: ScheduleStatus | None = None


class ScheduleResponse(BaseModel):
    id: int
    user_id: UUID | None
    date: int
    hour: int
    minute: int
    description: str
    calls: list[Any]
    location: str
    is_home: bool
    metadata: dict
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
