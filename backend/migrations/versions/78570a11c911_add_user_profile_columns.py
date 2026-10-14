"""add_user_profile_columns

Revision ID: 78570a11c911
Revises: d76b9c9047cc
Create Date: 2026-10-14 20:24:52.149876

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '78570a11c911'
down_revision: Union[str, Sequence[str], None] = 'd76b9c9047cc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS career_interests JSONB DEFAULT '[]'::jsonb;")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS career_interests;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS bio;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS phone_number;")
