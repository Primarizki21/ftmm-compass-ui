"""allow_free_semester_electives

Matkul pilihan konsentrasi TI tidak punya semester rekomendasi di dokumen resmi
(deskripsi kurikulum TI 2021 hal 138-159: "Semester: Mata Kuliah Pilihan").
recommended_semester dan term boleh NULL, tetapi hanya untuk course_type pilihan.

Revision ID: b3f1c2d4e5a6
Revises: 69cafa84ce5d
Create Date: 2026-11-03 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b3f1c2d4e5a6'
down_revision: Union[str, Sequence[str], None] = '69cafa84ce5d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
    ALTER TABLE curriculum_courses
        ALTER COLUMN recommended_semester DROP NOT NULL,
        ALTER COLUMN term DROP NOT NULL,
        DROP CONSTRAINT IF EXISTS curriculum_courses_semester_check,
        DROP CONSTRAINT IF EXISTS curriculum_courses_term_check,
        DROP CONSTRAINT IF EXISTS curriculum_courses_semester_term_check,
        ADD CONSTRAINT curriculum_courses_semester_check
            CHECK (recommended_semester IS NULL OR recommended_semester BETWEEN 1 AND 8),
        ADD CONSTRAINT curriculum_courses_term_check
            CHECK (term IS NULL OR term IN ('ganjil', 'genap')),
        ADD CONSTRAINT curriculum_courses_semester_term_check CHECK (
            (recommended_semester IS NULL AND term IS NULL
                AND course_type IN ('pilihan', 'pilihan_terbatas'))
            OR (term = 'ganjil' AND recommended_semester IN (1,3,5,7))
            OR (term = 'genap' AND recommended_semester IN (2,4,6,8))
        )
    """)


def downgrade() -> None:
    # Gagal kalau masih ada pilihan tanpa semester; isi semesternya dulu.
    op.execute("""
    ALTER TABLE curriculum_courses
        DROP CONSTRAINT IF EXISTS curriculum_courses_semester_term_check,
        DROP CONSTRAINT IF EXISTS curriculum_courses_term_check,
        DROP CONSTRAINT IF EXISTS curriculum_courses_semester_check,
        ALTER COLUMN recommended_semester SET NOT NULL,
        ALTER COLUMN term SET NOT NULL,
        ADD CONSTRAINT curriculum_courses_semester_check CHECK (recommended_semester BETWEEN 1 AND 8),
        ADD CONSTRAINT curriculum_courses_term_check CHECK (term IN ('ganjil', 'genap')),
        ADD CONSTRAINT curriculum_courses_semester_term_check CHECK (
            (term = 'ganjil' AND recommended_semester IN (1,3,5,7))
            OR
            (term = 'genap' AND recommended_semester IN (2,4,6,8))
        )
    """)
