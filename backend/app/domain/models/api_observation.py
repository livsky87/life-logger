from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class ApiObservation:
    id: int
    observed_at: datetime
    method: str
    detail: str
    http_status: int | None
    outcome: str
    description: str
    location_id: UUID | None
    user_id: UUID | None
    created_at: datetime
