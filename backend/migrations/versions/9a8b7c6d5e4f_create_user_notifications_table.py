"""create_user_notifications_table

Revision ID: 9a8b7c6d5e4f
Revises: 78570a11c911
Create Date: 2026-10-14 22:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a8b7c6d5e4f'
down_revision: Union[str, Sequence[str], None] = '78570a11c911'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS user_notifications (
        notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        target_role VARCHAR(30) NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (type IN ('warning', 'deadline', 'info', 'success')),
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        action_url VARCHAR(255) NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)
    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_user_notifications_target ON user_notifications(user_id, target_role, is_read)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS user_notifications CASCADE")
