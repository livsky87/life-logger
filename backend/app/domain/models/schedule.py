from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Schedule:
    id: int
    timestamp: datetime     # timezone-aware datetime (stored as UTC, display in local tz)
    description: str
    calls: list             # List of call objects: {method, url, deviceId, commands, dsec, result?}
    location: str
    is_home: bool
    metadata: dict
    status: list            # activity tags, e.g. ["요리"], ["수면"], []
    created_at: datetime
    user_id: str | None = None  # UUID of the associated user (nullable)
