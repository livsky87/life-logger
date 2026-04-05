from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.api_observation import ApiObservation
from app.domain.repositories.api_observation_repository import ApiObservationRepository
from app.infrastructure.db.models import ApiObservationORM


def _to_domain(orm: ApiObservationORM) -> ApiObservation:
    return ApiObservation(
        id=orm.id,
        observed_at=orm.observed_at,
        method=orm.method,
        detail=orm.detail,
        http_status=orm.http_status,
        outcome=orm.outcome,
        description=orm.description,
        location_id=orm.location_id,
        user_id=orm.user_id,
        created_at=orm.created_at,
    )


class SQLAlchemyApiObservationRepository(ApiObservationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_many(self, rows: list[dict]) -> list[ApiObservation]:
        out: list[ApiObservation] = []
        for r in rows:
            orm = ApiObservationORM(
                observed_at=r["observed_at"],
                method=r["method"],
                detail=r["detail"],
                http_status=r.get("http_status"),
                outcome=r["outcome"],
                description=r.get("description") or "",
                location_id=r.get("location_id"),
                user_id=r.get("user_id"),
            )
            self._session.add(orm)
            await self._session.flush()
            await self._session.refresh(orm)
            out.append(_to_domain(orm))
        return out

    async def list_in_range(
        self,
        start: datetime,
        end: datetime,
        location_id: UUID | None,
        user_id: UUID | None,
        user_id_is_null: bool,
    ) -> list[ApiObservation]:
        q = select(ApiObservationORM).where(
            and_(
                ApiObservationORM.observed_at >= start,
                ApiObservationORM.observed_at < end,
            )
        )
        if location_id is not None:
            q = q.where(ApiObservationORM.location_id == location_id)
        if user_id is not None:
            q = q.where(ApiObservationORM.user_id == user_id)
        elif user_id_is_null:
            q = q.where(ApiObservationORM.user_id.is_(None))
        q = q.order_by(ApiObservationORM.observed_at.asc())
        result = await self._session.execute(q)
        return [_to_domain(x) for x in result.scalars().all()]
