from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.models.user import User


class UserRepository(ABC):
    @abstractmethod
    async def get_all(self, location_id: UUID | None = None) -> list[User]: ...

    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> User | None: ...

    @abstractmethod
    async def create(self, location_id: UUID, name: str, email: str | None, job: str | None = None) -> User: ...
