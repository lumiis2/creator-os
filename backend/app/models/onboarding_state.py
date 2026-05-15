import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func, text

from app.models.types import JSONB

from .base import Base
from .enums import OnboardingStatus

onboarding_status_enum = ENUM(
    OnboardingStatus,
    name="onboarding_status",
    create_type=False,
    values_callable=lambda enum: [member.value for member in enum],
)


class OnboardingState(Base):
    __tablename__ = "onboarding_state"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'v1'"))
    current_step: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_steps: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'"),
    )
    payload: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'"),
    )
    status: Mapped[OnboardingStatus] = mapped_column(
        onboarding_status_enum,
        nullable=False,
        default=OnboardingStatus.IN_PROGRESS,
        server_default=text("'in_progress'"),
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    state_metadata: Mapped[dict] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'"),
    )

    profile = relationship("Profile", back_populates="onboarding_states")

    __table_args__ = (
        Index("idx_onboarding_state_profile_status", "profile_id", "status"),
        Index("idx_onboarding_state_version", "version"),
    )