from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Schedule:
    id: int
    date: int           # YYYYMMDD
    hour: int
    minute: int
    description: str
    calls: list         # List of call objects: {method, url, deviceId, commands, dsec, result?}
    location: str
    is_home: bool
    metadata: dict
    status: str         # normal | warning | error
    created_at: datetime
    user_id: str | None = None  # UUID of the associated user (nullable)
