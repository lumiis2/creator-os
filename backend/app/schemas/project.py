from datetime import datetime
from uuid import UUID

from pydantic import Field

from ..models.enums import ProjectStatus
from .base import ORMBase


class ProjectCreate(ORMBase):
    user_id: UUID
    linked_account_id: UUID | None = None
    title: str
    status: ProjectStatus = ProjectStatus.IDEA
    content_data: dict = Field(default_factory=dict)


class ProjectRead(ORMBase):
    id: UUID
    user_id: UUID
    linked_account_id: UUID | None = None
    title: str
    status: ProjectStatus
    content_data: dict
    created_at: datetime
    updated_at: datetime
