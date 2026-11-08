"""baseline_schema

Revision ID: d76b9c9047cc
Revises:
Create Date: 2026-10-14 20:24:45.191731

Baseline ini menerapkan `database/schema_v2_1_rc1.sql` (SSOT skema) sehingga
`alembic upgrade head` pada database kosong menghasilkan skema yang sama dengan
database hasil docker-compose. Jika tabel inti sudah ada (database dibuat oleh
entrypoint PostgreSQL), baseline dilewati dan migrasi berikutnya tetap berjalan.
"""

from pathlib import Path
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "d76b9c9047cc"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA_FILE = Path(__file__).resolve().parents[3] / "database" / "schema_v2_1_rc1.sql"


def _split_statements(sql: str) -> list[str]:
    """Pecah skrip SQL per pernyataan, menghormati blok dollar-quoted."""
    statements: list[str] = []
    buffer: list[str] = []
    dollar_tag: str | None = None
    index = 0

    while index < len(sql):
        if dollar_tag is None and sql.startswith("$", index):
            match_end = index + 1
            while match_end < len(sql) and (
                sql[match_end].isalnum() or sql[match_end] == "_"
            ):
                match_end += 1
            if match_end < len(sql) and sql[match_end] == "$":
                tag = sql[index : match_end + 1]
                if tag == "$$" or tag[1:-1].isidentifier():
                    dollar_tag = tag
                    buffer.append(tag)
                    index = match_end + 1
                    continue

        if dollar_tag is not None and sql.startswith(dollar_tag, index):
            buffer.append(dollar_tag)
            index += len(dollar_tag)
            dollar_tag = None
            continue

        char = sql[index]
        if char == ";" and dollar_tag is None:
            statement = "".join(buffer).strip()
            statements.append(statement)
            buffer = []
            index += 1
            continue

        buffer.append(char)
        index += 1

    trailing = "".join(buffer).strip()
    if trailing:
        statements.append(trailing)

    cleaned: list[str] = []
    for statement in statements:
        body = "\n".join(
            line
            for line in statement.splitlines()
            if not line.lstrip().startswith("--")
        ).strip()
        if body and body.upper() not in ("BEGIN", "COMMIT"):
            cleaned.append(body)
    return cleaned


def upgrade() -> None:
    bind = op.get_bind()
    exists = bind.execute(
        text("SELECT to_regclass('public.users') IS NOT NULL")
    ).scalar()
    if exists:
        return

    raw_sql = SCHEMA_FILE.read_text(encoding="utf-8")
    sql = "\n".join(
        line for line in raw_sql.splitlines() if not line.lstrip().startswith("--")
    )
    for statement in _split_statements(sql):
        bind.exec_driver_sql(statement)


def downgrade() -> None:
    """Baseline tidak dibalik; gunakan database baru untuk reset skema."""
