"""create_chat_logs_table

Revision ID: 69cafa84ce5d
Revises: 9a8b7c6d5e4f
Create Date: 2026-10-18 09:30:20.524697

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '69cafa84ce5d'
down_revision: Union[str, Sequence[str], None] = '9a8b7c6d5e4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS chat_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(100) NOT NULL,
        user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
        user_message TEXT NOT NULL,
        assistant_reply TEXT NULL,
        action_type VARCHAR(50) NULL,
        routing_mode VARCHAR(50) NULL,
        latency_ms DOUBLE PRECISION NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)
    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_chat_logs_session_id ON chat_logs(session_id)
    """)
    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id ON chat_logs(user_id)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS chat_logs CASCADE")
