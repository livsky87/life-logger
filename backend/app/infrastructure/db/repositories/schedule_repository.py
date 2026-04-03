from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.schedule import Schedule
from app.domain.repositories.schedule_repository import ScheduleRepository
from app.infrastructure.db.models import ScheduleORM


def _to_domain(orm: ScheduleORM) -> Schedule:
    return Schedule(
        id=orm.id,
        user_id=str(orm.user_id) if orm.user_id else None,
        timestamp=orm.timestamp,
        description=orm.description,
        calls=orm.calls or [],
        location=orm.location,
        is_home=orm.is_home,
        metadata=orm.metadata_ or {},
        status=orm.status if isinstance(orm.status, list) else [],
        created_at=orm.created_at,
    )


class SQLAlchemyScheduleRepository(ScheduleRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        user_id: UUID | None,
        timestamp: datetime,
        description: str,
        calls: list,
        location: str,
        is_home: bool,
        metadata: dict,
        status: list,
    ) -> Schedule:
        orm = ScheduleORM(
            user_id=user_id,
            timestamp=timestamp,
            description=description,
            calls=calls,
            location=location,
            is_home=is_home,
            metadata_=metadata,
            status=status if isinstance(status, list) else [],
        )
        self._session.add(orm)
        await self._session.flush()
        await self._session.refresh(orm)
        return _to_domain(orm)

    async def get_by_id(self, schedule_id: int) -> Schedule | None:
        orm = await self._session.get(ScheduleORM, schedule_id)
        return _to_domain(orm) if orm else None

    async def get_by_date(
        self,
        date_start: datetime,
        date_end: datetime,
        user_id: UUID | None = None,
    ) -> list[Schedule]:
        q = select(ScheduleORM).where(
            ScheduleORM.timestamp >= date_start,
            ScheduleORM.timestamp < date_end,
        )
        if user_id is not None:
            q = q.where(ScheduleORM.user_id == user_id)
        q = q.order_by(ScheduleORM.timestamp)
        result = await self._session.execute(q)
        return [_to_domain(row) for row in result.scalars()]

    async def bulk_create(self, entries: list[dict]) -> list[Schedule]:
        """Insert multiple schedule entries at once."""
        orms = [
            ScheduleORM(
                user_id=e.get("user_id"),
                timestamp=e["timestamp"],
                description=e["description"],
                calls=e.get("calls", []),
                location=e.get("location", ""),
                is_home=e.get("is_home", True),
                metadata_=e.get("metadata", {}),
                status=e.get("status", []) if isinstance(e.get("status"), list) else [],
            )
            for e in entries
        ]
        self._session.add_all(orms)
        await self._session.flush()
        for orm in orms:
            await self._session.refresh(orm)
        return [_to_domain(orm) for orm in orms]

    async def delete_by_user_date(
        self, user_id: UUID, date_start: datetime, date_end: datetime
    ) -> int:
        """Delete all schedule entries for a user within a date range. Returns count deleted."""
        stmt = delete(ScheduleORM).where(
            ScheduleORM.user_id == user_id,
            ScheduleORM.timestamp >= date_start,
            ScheduleORM.timestamp < date_end,
        )
        result = await self._session.execute(stmt)
        return result.rowcount

    async def update(
        self,
        schedule_id: int,
        user_id: UUID | None,
        timestamp: datetime | None,
        description: str | None,
        calls: list | None,
        location: str | None,
        is_home: bool | None,
        metadata: dict | None,
        status: list | None,
    ) -> Schedule | None:
        orm = await self._session.get(ScheduleORM, schedule_id)
        if not orm:
            return None
        if user_id is not None:
            orm.user_id = user_id
        if timestamp is not None:
            orm.timestamp = timestamp
        if description is not None:
            orm.description = description
        if calls is not None:
            orm.calls = calls
        if location is not None:
            orm.location = location
        if is_home is not None:
            orm.is_home = is_home
        if metadata is not None:
            orm.metadata_ = metadata
        if status is not None:
            orm.status = status if isinstance(status, list) else []
        await self._session.flush()
        return _to_domain(orm)

    async def delete(self, schedule_id: int) -> bool:
        orm = await self._session.get(ScheduleORM, schedule_id)
        if not orm:
            return False
        await self._session.delete(orm)
        await self._session.flush()
        return True
