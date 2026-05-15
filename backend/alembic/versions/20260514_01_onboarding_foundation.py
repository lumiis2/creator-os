"""Onboarding foundation, social account expansion, and missing tables.

Revision ID: 20260514_01_onboarding_foundation
Revises: 20260509_01_add_ai_settings_global_strategy_to_profile
Create Date: 2026-05-14 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID
from sqlalchemy.sql import text

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260514_01_onboarding_foundation"
down_revision: str | None = "20260509_01_add_ai_settings_global_strategy_to_profile"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _create_enum(name: str, values: list[str]) -> None:
    op.execute(
        f"""
        DO $$ BEGIN
            CREATE TYPE {name} AS ENUM ({', '.join([f"'{value}'" for value in values])});
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )


def upgrade() -> None:
    _create_enum("chat_role", ["user", "assistant", "system", "tool"])
    _create_enum("source_type", ["note", "document", "transcript", "url", "other"])
    _create_enum("social_account_status", ["pending", "connected", "expired", "revoked", "error"])
    _create_enum("platform_account_type", ["channel", "page", "business", "profile", "other"])
    _create_enum("onboarding_status", ["in_progress", "completed", "abandoned"])

    # Enforce 1:1 profile user_id
    op.create_unique_constraint("uq_profiles_user_id", "profiles", ["user_id"])

    # Rename social_accounts.user_id -> profile_id
    op.alter_column("social_accounts", "user_id", new_column_name="profile_id")

    # Expand social_accounts
    op.add_column(
        "social_accounts",
        sa.Column(
            "status",
            ENUM("pending", "connected", "expired", "revoked", "error", name="social_account_status", create_type=False),
            nullable=False,
            server_default=text("'connected'"),
        ),
    )
    op.add_column("social_accounts", sa.Column("access_token", sa.Text(), nullable=True))
    op.add_column("social_accounts", sa.Column("refresh_token", sa.Text(), nullable=True))
    op.add_column("social_accounts", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "social_accounts",
        sa.Column(
            "scopes",
            JSONB(),
            nullable=False,
            server_default=text("'[]'::jsonb"),
        ),
    )
    op.add_column("social_accounts", sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("social_accounts", sa.Column("last_error", sa.Text(), nullable=True))
    op.add_column(
        "social_accounts",
        sa.Column("needs_reconnect", sa.Boolean(), nullable=False, server_default=text("false")),
    )
    op.add_column(
        "social_accounts",
        sa.Column(
            "platform_account_type",
            ENUM("channel", "page", "business", "profile", "other", name="platform_account_type", create_type=False),
            nullable=True,
        ),
    )
    op.add_column("social_accounts", sa.Column("platform_account_name", sa.Text(), nullable=True))
    op.add_column("social_accounts", sa.Column("platform_account_url", sa.Text(), nullable=True))
    op.add_column(
        "social_accounts",
        sa.Column(
            "platform_metadata",
            JSONB(),
            nullable=False,
            server_default=text("'{}'::jsonb"),
        ),
    )

    op.create_index("idx_social_accounts_platform", "social_accounts", ["platform"])
    op.create_index("idx_social_accounts_status", "social_accounts", ["status"])
    op.create_index("idx_social_accounts_needs_reconnect", "social_accounts", ["needs_reconnect"])
    op.create_unique_constraint(
        "uq_social_accounts_profile_platform_user_id",
        "social_accounts",
        ["profile_id", "platform", "platform_user_id"],
    )

    # Missing tables: daily_metrics
    op.create_table(
        "daily_metrics",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("social_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("record_date", sa.Date(), nullable=False),
        sa.Column("bronze_raw", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("silver_normalized", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_daily_metrics_account_id", "daily_metrics", ["account_id"])
    op.create_index("idx_daily_metrics_record_date", "daily_metrics", ["record_date"])

    # Missing tables: chat_sessions & chat_messages
    op.create_table(
        "chat_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_chat_sessions_user_id", "chat_sessions", ["user_id"])

    chat_role_enum = ENUM("user", "assistant", "system", "tool", name="chat_role", create_type=False)
    op.create_table(
        "chat_messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("session_id", UUID(as_uuid=True), sa.ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", chat_role_enum, nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("metadata", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_chat_messages_session_id", "chat_messages", ["session_id"])

    # Missing table: ai_knowledge_base
    source_type_enum = ENUM("note", "document", "transcript", "url", "other", name="source_type", create_type=False)
    op.create_table(
        "ai_knowledge_base",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column("source_type", source_type_enum, nullable=False),
        sa.Column("metadata", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_ai_knowledge_base_user_id", "ai_knowledge_base", ["user_id"])

    # Onboarding state
    onboarding_status_enum = ENUM("in_progress", "completed", "abandoned", name="onboarding_status", create_type=False)
    op.create_table(
        "onboarding_state",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("profile_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Text(), nullable=False, server_default=text("'v1'")),
        sa.Column("current_step", sa.Text(), nullable=True),
        sa.Column("completed_steps", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("payload", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", onboarding_status_enum, nullable=False, server_default=text("'in_progress'")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_saved_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("metadata", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.create_index("idx_onboarding_state_profile_status", "onboarding_state", ["profile_id", "status"])
    op.create_index("idx_onboarding_state_version", "onboarding_state", ["version"])
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_onboarding_state_active
        ON onboarding_state (profile_id)
        WHERE status = 'in_progress';
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_onboarding_state_active;")
    op.drop_index("idx_onboarding_state_version", table_name="onboarding_state")
    op.drop_index("idx_onboarding_state_profile_status", table_name="onboarding_state")
    op.drop_table("onboarding_state")

    op.drop_index("idx_ai_knowledge_base_user_id", table_name="ai_knowledge_base")
    op.drop_table("ai_knowledge_base")

    op.drop_index("idx_chat_messages_session_id", table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index("idx_chat_sessions_user_id", table_name="chat_sessions")
    op.drop_table("chat_sessions")

    op.drop_index("idx_daily_metrics_record_date", table_name="daily_metrics")
    op.drop_index("idx_daily_metrics_account_id", table_name="daily_metrics")
    op.drop_table("daily_metrics")

    op.drop_constraint("uq_social_accounts_profile_platform_user_id", "social_accounts", type_="unique")
    op.drop_index("idx_social_accounts_needs_reconnect", table_name="social_accounts")
    op.drop_index("idx_social_accounts_status", table_name="social_accounts")
    op.drop_index("idx_social_accounts_platform", table_name="social_accounts")

    op.drop_column("social_accounts", "platform_metadata")
    op.drop_column("social_accounts", "platform_account_url")
    op.drop_column("social_accounts", "platform_account_name")
    op.drop_column("social_accounts", "platform_account_type")
    op.drop_column("social_accounts", "needs_reconnect")
    op.drop_column("social_accounts", "last_error")
    op.drop_column("social_accounts", "last_sync_at")
    op.drop_column("social_accounts", "scopes")
    op.drop_column("social_accounts", "expires_at")
    op.drop_column("social_accounts", "refresh_token")
    op.drop_column("social_accounts", "access_token")
    op.drop_column("social_accounts", "status")

    op.alter_column("social_accounts", "profile_id", new_column_name="user_id")

    op.drop_constraint("uq_profiles_user_id", "profiles", type_="unique")

    op.execute("DROP TYPE IF EXISTS onboarding_status;")
    op.execute("DROP TYPE IF EXISTS platform_account_type;")
    op.execute("DROP TYPE IF EXISTS social_account_status;")
    op.execute("DROP TYPE IF EXISTS source_type;")
    op.execute("DROP TYPE IF EXISTS chat_role;")