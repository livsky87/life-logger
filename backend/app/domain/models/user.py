from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class User:
    id: UUID
    location_id: UUID
    name: str
    email: str | None
    job: str | None
    created_at: datetime
