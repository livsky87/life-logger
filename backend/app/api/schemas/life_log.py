from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

Category = Literal["location", "activity", "api_request"]


class LifeLogCreate(BaseModel):
    user_id: UUID
    location_id: UUID
    # category: 'location' | 'activity' | 'api_request'
    category: Category
    # location:     'home' | 'office' | 'gym' | 'outside' | ...
    # activity:     'washing_machine' | 'fridge' | 'tv' | 'shower' | ...
    # api_request:  'GET' | 'POST' | 'PUT' | 'DELETE' | ...
    event_type: str
    started_at: datetime
    ended_at: datetime | None = None
    data: dict = Field(default_factory=dict)


class LifeLogEndEvent(BaseModel):
    ended_at: datetime


class LifeLogResponse(BaseModel):
    id: int
    user_id: UUID
    location_id: UUID
    category: Category
    event_type: str
    started_at: datetime
    ended_at: datetime | None
    data: dict
    created_at: datetime

    model_config = {"from_attributes": True}
