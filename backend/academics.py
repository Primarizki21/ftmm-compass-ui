"""Konstanta dan aturan akademik FTMM yang dipakai lintas modul backend."""

MAX_SKS_PER_SEMESTER = 24
HIGH_LOAD_SKS_THRESHOLD = 22
TOTAL_SKS_FOR_GRADUATION = 144
SEMESTER_COUNT = 8

GRADE_POINTS = {
    "A": 4.0,
    "AB": 3.5,
    "B": 3.0,
    "BC": 2.5,
    "C": 2.0,
    "D": 1.0,
    "E": 0.0,
}


def parity_of(semester: int) -> str:
    """Semester ganjil -> 'odd', genap -> 'even'."""
    return "odd" if semester % 2 == 1 else "even"


def term_of(semester: int) -> str:
    return "ganjil" if semester % 2 == 1 else "genap"


def grade_points(grade: str | None) -> float:
    """Poin mutu untuk nilai huruf; nilai tak dikenal dianggap 0 (bukan A)."""
    return GRADE_POINTS.get((grade or "").strip().upper(), 0.0)
