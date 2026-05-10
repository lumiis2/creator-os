from datetime import datetime
from uuid import UUID

from pydantic import Field

from ..models.enums import ChatRole
from .base import ORMBase


class ChatSessionCreate(ORMBase):
    user_id: UUID
    title: str | None = None


class ChatSessionRead(ORMBase):
    id: UUID
    user_id: UUID
    title: str | None = None
    created_at: datetime
    updated_at: datetime


class ChatMessageCreate(ORMBase):
    session_id: UUID
    role: ChatRole
    content: str
    metadata: dict = Field(default_factory=dict)


class ChatMessageRead(ORMBase):
    id: UUID
    session_id: UUID
    role: ChatRole
    content: str
    metadata: dict = Field(validation_alias="metadata_")
    created_at: datetime
    updated_at: datetime
