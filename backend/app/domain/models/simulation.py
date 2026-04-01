from dataclasses import dataclass
from datetime import datetime


@dataclass
class Simulation:
    id: int
    location_id: str
    name: str
    devices: list       # SmartThings devices array (roomId can be e.g. "부엌")
    metadata: dict
    created_at: datetime
    updated_at: datetime
