"""add_performance_indexes

Indeks untuk pola query yang belum tertutup indeks schema V2.1 RC1.
Hasil benchmark (database/bench/RESULTS.md) dipakai sebagai dasar:

- Pencarian substring Course Finder (LIKE '%x%') tidak bisa memakai B-tree sama
  sekali -> GIN trigram pada nama matkul dan alias.
- Filter "kelas yang bentrok dengan slot X" di Timetable Builder -> B-tree
  (day_of_week, start_time, end_time).
- FK yang dipakai untuk query tapi belum berindeks: course_requirement_nodes.parent_node_id
  (traversal pohon prasyarat & trigger verifikasi) dan student_course_records.academic_period_id.

v_timetable_conflicts sudah tertutup oleh timetable_items_section_unique dan
class_schedules_slot_unique, jadi tidak ditambah indeks untuk view itu.

Revision ID: c4d2e6f8a1b3
Revises: b3f1c2d4e5a6
Create Date: 2026-11-03 22:00:00.000000

"""
from typing import Sequence, Union
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c4d2e6f8a1b3'
down_revision: Union[str, Sequence[str], None] = 'b3f1c2d4e5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_courses_course_name_trgm
        ON courses USING gin (lower(course_name) gin_trgm_ops)
    """)
    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_course_aliases_alias_text_trgm
        ON course_aliases USING gin (lower(alias_text) gin_trgm_ops)
    """)
    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_class_schedules_day_time
        ON class_schedules (day_of_week, start_time, end_time) INCLUDE (class_section_id)
    """)
    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_course_requirement_nodes_parent_id
        ON course_requirement_nodes (parent_node_id)
    """)
    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_student_course_records_period_id
        ON student_course_records (academic_period_id)
    """)


def downgrade() -> None:
    # Ekstensi pg_trgm dibiarkan: bisa saja dipakai objek lain.
    op.execute("DROP INDEX IF EXISTS idx_student_course_records_period_id")
    op.execute("DROP INDEX IF EXISTS idx_course_requirement_nodes_parent_id")
    op.execute("DROP INDEX IF EXISTS idx_class_schedules_day_time")
    op.execute("DROP INDEX IF EXISTS idx_course_aliases_alias_text_trgm")
    op.execute("DROP INDEX IF EXISTS idx_courses_course_name_trgm")
