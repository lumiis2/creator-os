import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func, text

from app.models.types import JSONB

from .base import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Profile-specific fields per spec
    niche: Mapped[str | None] = mapped_column(String(255), nullable=True)
    creator_goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    posting_frequency_goal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_behavior: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'"),
    )
    ai_settings: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'"),
    )
    global_strategy: Mapped[str | None] = mapped_column(Text, nullable=True)
    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    user = relationship("User", back_populates="profile")
    social_accounts = relationship(
        "SocialAccount",
        back_populates="profile",
        cascade="all, delete-orphan",
    )
    projects = relationship("Project", back_populates="profile", cascade="all, delete-orphan")
    knowledge_entries = relationship(
        "AIKnowledgeBase",
        back_populates="profile",
        cascade="all, delete-orphan",
    )
    chat_sessions = relationship(
        "ChatSession",
        back_populates="profile",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_profiles_user_id", "user_id"),    )
