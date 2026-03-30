from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.domain.models.life_log import LifeLog
from app.domain.repositories.life_log_repository import LifeLogRepository
from app.domain.repositories.location_repository import LocationRepository


class LifeLogService:
    def __init__(self, repo: LifeLogRepository, location_repo: LocationRepository) -> None:
        self._repo = repo
        self._location_repo = location_repo

    async def ingest(
        self,
        user_id: UUID,
        location_id: UUID,
        category: str,
        event_type: str,
        started_at: datetime,
        ended_at: datetime | None,
        data: dict,
    ) -> LifeLog:
        return await self._repo.create(
            user_id=user_id,
            location_id=location_id,
            category=category,
            event_type=event_type,
            started_at=started_at,
            ended_at=ended_at,
            data=data,
        )

    async def close_event(self, log_id: int, ended_at: datetime) -> LifeLog | None:
        return await self._repo.update_ended_at(log_id, ended_at)

    async def get_timeline(self, start_str: str, end_str: str, location_ids: list[UUID] | None) -> dict:
        """
        Returns Gantt-style timeline data bucketed by location then user.
        start_str / end_str: YYYY-MM-DD (inclusive start, exclusive end).
        """
        day_start = datetime.strptime(start_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        day_end = datetime.strptime(end_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)

        # If no location filter, get all locations
        if not location_ids:
            all_locations = await self._location_repo.get_all()
            location_ids = [loc.id for loc in all_locations]

        if not location_ids:
            return {"date": date_str, "locations": []}

        rows = await self._repo.get_timeline(location_ids, day_start, day_end)

        # Group by location
        by_location: dict[str, dict] = {}
        for row in rows:
            loc_id = str(row["location_id"])
            if loc_id not in by_location:
                by_location[loc_id] = {
                    "location_id": loc_id,
                    "name": row["location_name"],
                    "timezone": row["location_timezone"],
                    "users": {},
                }
            loc_data = by_location[loc_id]
            user_id = str(row["user_id"])
            if user_id not in loc_data["users"]:
                loc_data["users"][user_id] = {
                    "user_id": user_id,
                    "user_name": row["user_name"],
                    "user_job": row["user_job"],
                    "events": [],
                }
            loc_data["users"][user_id]["events"].append({
                "id": row["id"],
                "category": row["category"],
                "event_type": row["event_type"],
                "started_at": row["started_at"].isoformat(),
                "ended_at": row["ended_at"].isoformat() if row["ended_at"] else None,
                "data": row["data"],
            })

        # Flatten users dict -> list, preserve location order
        locations_out = []
        for loc_id in location_ids:
            loc = by_location.get(str(loc_id))
            if loc:
                loc["users"] = list(loc["users"].values())
                locations_out.append(loc)

        return {"start": start_str, "end": end_str, "locations": locations_out}

    async def get_paginated(
        self,
        user_id: UUID | None,
        location_id: UUID | None,
        category: str | None,
        limit: int,
        cursor: int | None,
    ) -> list[LifeLog]:
        return await self._repo.get_paginated(user_id, location_id, category, limit, cursor)

    async def get_by_id(self, log_id: int) -> LifeLog | None:
        return await self._repo.get_by_id(log_id)

    async def delete(self, log_id: int) -> bool:
        return await self._repo.delete(log_id)
