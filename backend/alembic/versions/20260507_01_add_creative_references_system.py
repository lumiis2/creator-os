"""Baseline migration for local Docker and Supabase-compatible schema.

Revision ID: 20260507_01_baseline
Revises: None
Create Date: 2026-05-07 00:00:00.000000

"""
from typing import Sequence, Union
from urllib.parse import urlparse

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import ENUM, JSONB

from app.core.config import settings


# revision identifiers, used by Alembic.
revision: str = "20260507_01_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _is_local_database() -> bool:
    """Return True when migrations target the local Docker database."""
    parsed = urlparse(settings.DATABASE_URL)
    return parsed.hostname in {"localhost", "127.0.0.1", "host.docker.internal"}


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE platform_type AS ENUM ('youtube', 'instagram', 'tiktok', 'facebook');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE project_status AS ENUM ('idea', 'drafting', 'production', 'editing', 'scheduled', 'posted');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE media_type AS ENUM ('video', 'image', 'text');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    platform_type_enum = ENUM("youtube", "instagram", "tiktok", "facebook", name="platform_type", create_type=False)
    project_status_enum = ENUM("idea", "drafting", "production", "editing", "scheduled", "posted", name="project_status", create_type=False)
    media_type_enum = ENUM("video", "image", "text", name="media_type", create_type=False)

    if _is_local_database():
        op.execute("CREATE SCHEMA IF NOT EXISTS auth;")
        op.execute(
            """
            CREATE TABLE IF NOT EXISTS auth.users (
                id UUID PRIMARY KEY,
                email TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            """
        )

    op.create_table(
        "profiles",
        sa.Column("id", sa.UUID(as_uuid=True), sa.ForeignKey("auth.users.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("full_name", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("ai_settings", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("global_strategy", sa.Text(), nullable=True),
        sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "social_accounts",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", sa.UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", platform_type_enum, nullable=False),
        sa.Column("platform_handle", sa.Text(), nullable=False),
        sa.Column("platform_user_id", sa.Text(), nullable=False),
        sa.Column("credentials", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("niche_data", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "projects",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", sa.UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("linked_account_id", sa.UUID(as_uuid=True), sa.ForeignKey("social_accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("status", project_status_enum, nullable=False, server_default=sa.text("'idea'")),
        sa.Column("content_data", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "creative_references",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", sa.UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("origin_url", sa.Text(), nullable=False),
        sa.Column("media_type", media_type_enum, nullable=False),
        sa.Column("ai_analysis", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_index("idx_creative_references_user_id", "creative_references", ["user_id"])
    op.create_index("idx_creative_references_media_type", "creative_references", ["media_type"])

    op.create_table(
        "project_references",
        sa.Column("project_id", sa.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("reference_id", sa.UUID(as_uuid=True), sa.ForeignKey("creative_references.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("linked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_index("idx_project_references_project_id", "project_references", ["project_id"])
    op.create_index("idx_project_references_reference_id", "project_references", ["reference_id"])

    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    for table_name in ["profiles", "social_accounts", "projects", "creative_references"]:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table_name}_updated_at ON {table_name};")
        op.execute(
            f"""
            CREATE TRIGGER trg_{table_name}_updated_at
            BEFORE UPDATE ON {table_name}
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
            """
        )


def downgrade() -> None:
    for table_name in ["creative_references", "projects", "social_accounts", "profiles"]:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table_name}_updated_at ON {table_name};")

    op.drop_index("idx_project_references_reference_id", table_name="project_references")
    op.drop_index("idx_project_references_project_id", table_name="project_references")
    op.drop_table("project_references")
    op.drop_index("idx_creative_references_media_type", table_name="creative_references")
    op.drop_index("idx_creative_references_user_id", table_name="creative_references")
    op.drop_table("creative_references")
    op.drop_table("projects")
    op.drop_table("social_accounts")
    op.drop_table("profiles")
    if _is_local_database():
        op.execute("DROP TABLE IF EXISTS auth.users;")
        op.execute("DROP SCHEMA IF EXISTS auth;")
    op.execute("DROP TYPE IF EXISTS media_type;")
    op.execute("DROP TYPE IF EXISTS project_status;")
    op.execute("DROP TYPE IF EXISTS platform_type;")
