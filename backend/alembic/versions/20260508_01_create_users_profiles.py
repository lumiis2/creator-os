"""Create users and profiles tables for authentication.

Revision ID: 20260508_01_create_users_profiles
Revises: 20260507_01_baseline
Create Date: 2026-05-08 00:00:00.000000

"""
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260508_01_create_users_profiles"
down_revision: str = "20260507_01_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), nullable=False, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("supabase_user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("auth_provider", sa.String(50), nullable=False, server_default="supabase"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("supabase_user_id", name="uq_users_supabase_user_id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("idx_users_supabase_user_id", "users", ["supabase_user_id"])
    op.create_index("idx_users_email", "users", ["email"])

    # Drop old profiles table if it references auth.users
    op.execute("DROP TABLE IF EXISTS profiles CASCADE;")

    # Create new profiles table
    op.create_table(
        "profiles",
        sa.Column("id", UUID(as_uuid=True), nullable=False, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("niche", sa.String(255), nullable=True),
        sa.Column("creator_goal", sa.Text(), nullable=True),
        sa.Column("posting_frequency_goal", sa.Integer(), nullable=True),
        sa.Column("ai_behavior", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_profiles_user_id", "profiles", ["user_id"])


def downgrade() -> None:
    op.drop_index("idx_profiles_user_id", table_name="profiles")
    op.drop_table("profiles")

    op.drop_index("idx_users_email", table_name="users")
    op.drop_index("idx_users_supabase_user_id", table_name="users")
    op.drop_table("users")
