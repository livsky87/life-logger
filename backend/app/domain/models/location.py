from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class Location:
    id: UUID
    location_code: str | None
    name: str
    timezone: str
    description: str | None
    created_at: datetime
