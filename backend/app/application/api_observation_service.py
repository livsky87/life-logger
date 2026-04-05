from datetime import datetime
from uuid import UUID

from app.domain.models.api_observation import ApiObservation
from app.domain.repositories.api_observation_repository import ApiObservationRepository

_OUTCOMES = frozenset({"success", "warning", "failure"})


class ApiObservationService:
    def __init__(self, repo: ApiObservationRepository) -> None:
        self._repo = repo

    async def ingest_batch(
        self,
        items: list[dict],
    ) -> list[ApiObservation]:
        rows: list[dict] = []
        for it in items:
            oc = it["outcome"]
            if oc not in _OUTCOMES:
                raise ValueError(f"invalid outcome: {oc}")
            rows.append(
                {
                    "observed_at": it["observed_at"],
                    "method": (it.get("method") or "GET").upper()[:16],
                    "detail": it["detail"],
                    "http_status": it.get("http_status"),
                    "outcome": oc,
                    "description": it.get("description") or "",
                    "location_id": it.get("location_id"),
                    "user_id": it.get("user_id"),
                }
            )
        return await self._repo.create_many(rows)

    async def list_for_timeline(
        self,
        start: datetime,
        end: datetime,
        location_id: UUID | None = None,
        user_id: UUID | None = None,
        user_id_is_null: bool = False,
    ) -> list[ApiObservation]:
        return await self._repo.list_in_range(
            start, end, location_id, user_id, user_id_is_null=user_id_is_null
        )
