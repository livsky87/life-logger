from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, case, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.life_log import LifeLog
from app.domain.repositories.life_log_repository import LifeLogRepository
from app.infrastructure.db.models import LifeLogORM, LocationORM, UserORM


def _to_domain(orm: LifeLogORM) -> LifeLog:
    return LifeLog(
        id=orm.id,
        user_id=orm.user_id,
        location_id=orm.location_id,
        category=orm.category,
        event_type=orm.event_type,
        started_at=orm.started_at,
        ended_at=orm.ended_at,
        data=orm.data,
        created_at=orm.created_at,
    )


class SQLAlchemyLifeLogRepository(LifeLogRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        user_id: UUID,
        location_id: UUID,
        category: str,
        event_type: str,
        started_at: datetime,
        ended_at: datetime | None,
        data: dict,
    ) -> LifeLog:
        orm = LifeLogORM(
            user_id=user_id,
            location_id=location_id,
            category=category,
            event_type=event_type,
            started_at=started_at,
            ended_at=ended_at,
            data=data,
        )
        self._session.add(orm)
        await self._session.flush()
        await self._session.refresh(orm)
        return _to_domain(orm)

    async def update_ended_at(self, log_id: int, ended_at: datetime) -> LifeLog | None:
        orm = await self._session.get(LifeLogORM, log_id)
        if not orm:
            return None
        orm.ended_at = ended_at
        await self._session.flush()
        return _to_domain(orm)

    async def get_by_id(self, log_id: int) -> LifeLog | None:
        orm = await self._session.get(LifeLogORM, log_id)
        return _to_domain(orm) if orm else None

    async def get_timeline(
        self,
        location_ids: list[UUID],
        start: datetime,
        end: datetime,
    ) -> list[dict]:
        """
        Returns events that overlap [start, end] window, enriched with user/location names.
        An event overlaps if started_at < end AND (ended_at IS NULL OR ended_at > start).
        """
        q = (
            select(
                LifeLogORM.id,
                LifeLogORM.user_id,
                UserORM.name.label("user_name"),
                UserORM.job.label("user_job"),
                LifeLogORM.location_id,
                LocationORM.name.label("location_name"),
                LocationORM.timezone.label("location_timezone"),
                LifeLogORM.category,
                LifeLogORM.event_type,
                LifeLogORM.started_at,
                LifeLogORM.ended_at,
                LifeLogORM.data,
            )
            .join(UserORM, UserORM.id == LifeLogORM.user_id)
            .join(LocationORM, LocationORM.id == LifeLogORM.location_id)
            .where(
                and_(
                    LifeLogORM.location_id.in_(location_ids),
                    LifeLogORM.started_at < end,
                    or_(
                        # 기간 있는 이벤트: 윈도우와 겹치는지 확인
                        and_(LifeLogORM.ended_at != None, LifeLogORM.ended_at > start),  # noqa: E711
                        # 진행 중인 location/context: started_at < end 이면 표시 (위에서 이미 필터)
                        and_(
                            LifeLogORM.ended_at == None,  # noqa: E711
                            LifeLogORM.category.not_in(["api_request", "event"]),
                        ),
                        # point 이벤트(api_request, event): 해당 윈도우 내에서만 표시
                        and_(
                            LifeLogORM.ended_at == None,  # noqa: E711
                            LifeLogORM.category.in_(["api_request", "event"]),
                            LifeLogORM.started_at >= start,
                        ),
                    ),
                )
            )
            .order_by(LifeLogORM.location_id, LifeLogORM.started_at)
        )
        result = await self._session.execute(q)
        rows = result.mappings().all()
        return [dict(row) for row in rows]

    async def get_paginated(
        self,
        user_id: UUID | None,
        location_id: UUID | None,
        category: str | None,
        limit: int,
        cursor: int | None,
    ) -> list[LifeLog]:
        q = select(LifeLogORM).order_by(LifeLogORM.id.desc()).limit(limit)
        if user_id:
            q = q.where(LifeLogORM.user_id == user_id)
        if location_id:
            q = q.where(LifeLogORM.location_id == location_id)
        if category:
            q = q.where(LifeLogORM.category == category)
        if cursor:
            q = q.where(LifeLogORM.id < cursor)
        result = await self._session.execute(q)
        return [_to_domain(row) for row in result.scalars()]

    async def delete(self, log_id: int) -> bool:
        orm = await self._session.get(LifeLogORM, log_id)
        if not orm:
            return False
        await self._session.delete(orm)
        await self._session.flush()
        return True
