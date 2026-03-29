from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

# category values: 'location' | 'activity' | 'api_request'
# event_type examples:
#   location  -> 'home', 'office', 'gym', 'outside'
#   activity  -> 'washing_machine', 'fridge', 'tv', 'microwave', 'shower'
#   api_request -> 'GET', 'POST', 'PUT', 'DELETE'


@dataclass
class LifeLog:
    id: int
    user_id: UUID
    location_id: UUID
    category: str
    event_type: str
    started_at: datetime
    ended_at: datetime | None
    data: dict
    created_at: datetime
