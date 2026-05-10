"""Add ai_settings and global_strategy fields to profiles table.

Revision ID: 20260509_01_add_ai_settings_global_strategy_to_profile
Revises: 20260508_01_create_users_profiles
Create Date: 2026-05-09 00:00:00.000000

"""
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import text

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260509_01_add_ai_settings_global_strategy_to_profile"
down_revision: str = "20260508_01_create_users_profiles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add ai_settings column (JSONB)
    op.add_column(
        'profiles',
        sa.Column(
            'ai_settings',
            JSONB(),
            nullable=False,
            server_default=text("'{}'::jsonb"),
        ),
    )

    # Add global_strategy column (Text)
    op.add_column(
        'profiles',
        sa.Column(
            'global_strategy',
            sa.Text(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    # Remove columns in reverse order
    op.drop_column('profiles', 'global_strategy')
    op.drop_column('profiles', 'ai_settings')
