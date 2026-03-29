from uuid import UUID

from app.domain.models.user import User
from app.domain.repositories.user_repository import UserRepository


class UserService:
    def __init__(self, repo: UserRepository) -> None:
        self._repo = repo

    async def get_all(self, location_id: UUID | None = None) -> list[User]:
        return await self._repo.get_all(location_id)

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await self._repo.get_by_id(user_id)

    async def create(self, location_id: UUID, name: str, email: str | None, job: str | None = None) -> User:
        return await self._repo.create(location_id=location_id, name=name, email=email, job=job)
