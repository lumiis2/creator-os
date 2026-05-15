import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func, text

from app.models.types import JSONB

from .base import Base
from .enums import PlatformAccountType, PlatformType, SocialAccountStatus


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    platform: Mapped[PlatformType] = mapped_column(
        ENUM(PlatformType, name="platform_type", create_type=False),
        nullable=False,
    )
    platform_handle: Mapped[str] = mapped_column(Text, nullable=False)
    platform_user_id: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[SocialAccountStatus] = mapped_column(
        ENUM(SocialAccountStatus, name="social_account_status", create_type=False),
        nullable=False,
        default=SocialAccountStatus.CONNECTED,
        server_default=text("'connected'"),
    )
    access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scopes: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'"),
    )
    credentials: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'"),
    )
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    needs_reconnect: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    platform_account_type: Mapped[PlatformAccountType | None] = mapped_column(
        ENUM(PlatformAccountType, name="platform_account_type", create_type=False),
        nullable=True,
    )
    platform_account_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    platform_account_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    platform_metadata: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'"),
    )
    niche_data: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'"),
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

    profile = relationship("Profile", back_populates="social_accounts")
    daily_metrics = relationship(
        "DailyMetric",
        back_populates="social_account",
        cascade="all, delete-orphan",
    )
    projects = relationship("Project", back_populates="linked_account")

    __table_args__ = (
        UniqueConstraint(
            "profile_id",
            "platform",
            "platform_user_id",
            name="uq_social_accounts_profile_platform_user_id",
        ),
        Index("idx_social_accounts_platform", "platform"),
        Index("idx_social_accounts_status", "status"),
        Index("idx_social_accounts_needs_reconnect", "needs_reconnect"),
    )
