from datetime import datetime
from uuid import UUID

from pydantic import Field

from ..models.enums import SourceType
from .base import ORMBase


class AIKnowledgeBaseCreate(ORMBase):
    user_id: UUID
    content: str
    embedding: list[float]
    source_type: SourceType
    metadata: dict = Field(default_factory=dict)


class AIKnowledgeBaseRead(ORMBase):
    id: UUID
    user_id: UUID
    content: str
    embedding: list[float]
    source_type: SourceType
    metadata: dict = Field(validation_alias="metadata_")
    created_at: datetime
    updated_at: datetime
