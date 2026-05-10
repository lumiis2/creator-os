"""Base repository for CRUD operations."""

from typing import Generic, TypeVar
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")  # ORM Model type


class BaseRepository(Generic[T]):
    """Base repository with common CRUD operations."""

    def __init__(self, db: AsyncSession, model: type[T]):
        self.db = db
        self.model = model

    async def create(self, obj: T) -> T:
        """Create a new object."""
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def get_by_id(self, id: UUID) -> T | None:
        """Get object by ID."""
        return await self.db.get(self.model, id)

    async def get_all(self, skip: int = 0, limit: int = 10) -> list[T]:
        """Get all objects with pagination."""
        stmt = select(self.model).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, obj: T) -> T:
        """Update an object."""
        await self.db.merge(obj)
        await self.db.commit()
        return obj

    async def delete(self, id: UUID) -> None:
        """Delete an object by ID."""
        obj = await self.get_by_id(id)
        if obj:
            await self.db.delete(obj)
            await self.db.commit()
