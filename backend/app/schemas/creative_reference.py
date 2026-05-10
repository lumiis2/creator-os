from datetime import datetime
from uuid import UUID

from pydantic import Field

from ..models.enums import MediaType
from .base import ORMBase


class ReferenceAIAnalysis(ORMBase):
    hooks: list[str] = Field(default_factory=list)
    pacing: str | None = None
    cta: str | None = None


class ReferenceMetadata(ORMBase):
    thumb: str | None = None
    title: str | None = None
    author: str | None = None
    platform: str | None = None


class ReferenceCreate(ORMBase):
    user_id: UUID
    origin_url: str
    media_type: MediaType
    ai_analysis: ReferenceAIAnalysis = Field(default_factory=ReferenceAIAnalysis)
    metadata: ReferenceMetadata = Field(default_factory=ReferenceMetadata)
    embedding: list[float]


class ReferenceRead(ORMBase):
    id: UUID
    user_id: UUID
    origin_url: str
    media_type: MediaType
    ai_analysis: ReferenceAIAnalysis
    metadata: ReferenceMetadata = Field(validation_alias="metadata_")
    embedding: list[float]
    created_at: datetime
    updated_at: datetime
