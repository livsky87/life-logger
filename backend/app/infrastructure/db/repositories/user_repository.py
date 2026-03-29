from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.user import User
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.db.models import UserORM


def _to_domain(orm: UserORM) -> User:
    return User(
        id=orm.id,
        location_id=orm.location_id,
        name=orm.name,
        email=orm.email,
        job=orm.job,
        created_at=orm.created_at,
    )


class SQLAlchemyUserRepository(UserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_all(self, location_id: UUID | None = None) -> list[User]:
        q = select(UserORM).order_by(UserORM.name)
        if location_id:
            q = q.where(UserORM.location_id == location_id)
        result = await self._session.execute(q)
        return [_to_domain(row) for row in result.scalars()]

    async def get_by_id(self, user_id: UUID) -> User | None:
        orm = await self._session.get(UserORM, user_id)
        return _to_domain(orm) if orm else None

    async def create(self, location_id: UUID, name: str, email: str | None, job: str | None = None) -> User:
        orm = UserORM(location_id=location_id, name=name, email=email, job=job)
        self._session.add(orm)
        await self._session.flush()
        await self._session.refresh(orm)
        return _to_domain(orm)
