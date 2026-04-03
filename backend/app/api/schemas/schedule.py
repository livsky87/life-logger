from datetime import datetime as DateTime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ScheduleCallItem(BaseModel):
    method: str
    url: str
    deviceId: str = ""
    commands: list[Any] = Field(default_factory=list)
    dsec: int = 0          # optional in new format — defaults to 0
    result: str | None = None


class ScheduleCreate(BaseModel):
    user_id: UUID | None = None
    datetime: DateTime = Field(..., description="ISO 8601 datetime with timezone, e.g. 2026-04-02T06:30:00+09:00")
    description: str
    calls: list[ScheduleCallItem] = Field(default_factory=list)
    location: str = ""
    is_home: bool = True
    metadata: dict = Field(default_factory=dict)
    status: list[str] = Field(default_factory=list)


class ScheduleUpdate(BaseModel):
    user_id: UUID | None = None
    datetime: DateTime | None = None
    description: str | None = None
    calls: list[ScheduleCallItem] | None = None
    location: str | None = None
    is_home: bool | None = None
    metadata: dict | None = None
    status: list[str] | None = None


class ScheduleResponse(BaseModel):
    id: int
    user_id: UUID | None
    datetime: DateTime
    description: str
    calls: list[Any]
    location: str
    is_home: bool
    metadata: dict
    status: list[str]
    created_at: DateTime

    model_config = {"from_attributes": True}


class ScheduleBatchCreate(BaseModel):
    """Batch upload: a full day's schedule for one user."""
    entries: list[ScheduleCreate]
    replace: bool = True
    user_name: str | None = None
    user_job: str | None = None
    location_id: str | None = None    # explicit location UUID — takes priority over metadata
    location_name: str | None = None
    timezone: str = "Asia/Seoul"


class ScheduleBatchResult(BaseModel):
    deleted: int
    created: int
    user_id: str
    location_id: str
    date: int   # YYYYMMDD derived from first entry datetime


# ── Timeline response (schedule-based) ──

class ScheduleTimelineUser(BaseModel):
    user_id: str
    user_name: str
    user_job: str | None = None
    entries: list[ScheduleResponse]


class ScheduleTimelineLocation(BaseModel):
    location_id: str
    name: str
    timezone: str
    users: list[ScheduleTimelineUser]


class ScheduleTimelineResponse(BaseModel):
    date: int   # YYYYMMDD
    range_days: int = 1
    locations: list[ScheduleTimelineLocation]
