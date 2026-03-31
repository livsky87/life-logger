from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.schedule import Schedule
from app.domain.repositories.schedule_repository import ScheduleRepository
from app.infrastructure.db.models import ScheduleORM


def _compute_status(calls: list) -> str:
    """Auto-compute status from calls result fields."""
    if not calls:
        return "normal"
    results = [c.get("result") for c in calls if isinstance(c, dict)]
    non_null = [r for r in results if r is not None]
    if not non_null:
        return "normal"
    failures = [r for r in non_null if r != "success"]
    if not failures:
        return "normal"
    if len(failures) == len(non_null):
        return "error"
    return "warning"


def _to_domain(orm: ScheduleORM) -> Schedule:
    return Schedule(
        id=orm.id,
        user_id=str(orm.user_id) if orm.user_id else None,
        date=orm.date,
        hour=orm.hour,
        minute=orm.minute,
        description=orm.description,
        calls=orm.calls or [],
        location=orm.location,
        is_home=orm.is_home,
        metadata=orm.metadata_ or {},
        status=orm.status,
        created_at=orm.created_at,
    )


class SQLAlchemyScheduleRepository(ScheduleRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        user_id: UUID | None,
        date: int,
        hour: int,
        minute: int,
        description: str,
        calls: list,
        location: str,
        is_home: bool,
        metadata: dict,
        status: str,
    ) -> Schedule:
        computed = _compute_status(calls)
        if computed != "normal":
            status = computed
        orm = ScheduleORM(
            user_id=user_id,
            date=date,
            hour=hour,
            minute=minute,
            description=description,
            calls=calls,
            location=location,
            is_home=is_home,
            metadata_=metadata,
            status=status,
        )
        self._session.add(orm)
        await self._session.flush()
        await self._session.refresh(orm)
        return _to_domain(orm)

    async def get_by_id(self, schedule_id: int) -> Schedule | None:
        orm = await self._session.get(ScheduleORM, schedule_id)
        return _to_domain(orm) if orm else None

    async def get_by_date(self, date: int, user_id: UUID | None = None) -> list[Schedule]:
        q = select(ScheduleORM).where(ScheduleORM.date == date)
        if user_id is not None:
            q = q.where(ScheduleORM.user_id == user_id)
        q = q.order_by(ScheduleORM.hour, ScheduleORM.minute)
        result = await self._session.execute(q)
        return [_to_domain(row) for row in result.scalars()]

    async def update(
        self,
        schedule_id: int,
        user_id: UUID | None,
        date: int | None,
        hour: int | None,
        minute: int | None,
        description: str | None,
        calls: list | None,
        location: str | None,
        is_home: bool | None,
        metadata: dict | None,
        status: str | None,
    ) -> Schedule | None:
        orm = await self._session.get(ScheduleORM, schedule_id)
        if not orm:
            return None
        if user_id is not None:
            orm.user_id = user_id
        if date is not None:
            orm.date = date
        if hour is not None:
            orm.hour = hour
        if minute is not None:
            orm.minute = minute
        if description is not None:
            orm.description = description
        if calls is not None:
            orm.calls = calls
            computed = _compute_status(calls)
            if computed != "normal" or status is None:
                orm.status = computed
        if location is not None:
            orm.location = location
        if is_home is not None:
            orm.is_home = is_home
        if metadata is not None:
            orm.metadata_ = metadata
        if status is not None:
            orm.status = status
        await self._session.flush()
        return _to_domain(orm)

    async def delete(self, schedule_id: int) -> bool:
        orm = await self._session.get(ScheduleORM, schedule_id)
        if not orm:
            return False
        await self._session.delete(orm)
        await self._session.flush()
        return True
