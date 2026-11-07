"""Konstanta dan aturan akademik FTMM yang dipakai lintas modul backend."""

from datetime import date, timedelta

MAX_SKS_PER_SEMESTER = 24
HIGH_LOAD_SKS_THRESHOLD = 22
TOTAL_SKS_FOR_GRADUATION = 144
SEMESTER_COUNT = 8
SEMESTER_WEEKS = 16

TERM_TITLES = {"ganjil": "Ganjil", "genap": "Genap", "pendek": "Pendek"}

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


def semester_start(academic_year_start: int, term: str) -> date:
    if term == "ganjil":
        return date(academic_year_start, 8, 26)
    if term == "pendek":
        return date(academic_year_start + 1, 7, 1)
    return date(academic_year_start + 1, 2, 17)


def semester_end(academic_year_start: int, term: str) -> date:
    return semester_start(academic_year_start, term) + timedelta(weeks=SEMESTER_WEEKS)


def current_period(today: date) -> tuple[int, str]:
    if today.month >= 8:
        return today.year, "ganjil"
    if today.month == 1:
        return today.year - 1, "ganjil"
    return today.year - 1, "genap"


def first_monday(start: date) -> date:
    return start + timedelta(days=(7 - start.weekday()) % 7)


def week_label(start: date, today: date) -> str:
    week = (today - start).days // 7 + 1
    if week < 1:
        return "Masa KRS / Persiapan"
    if week > SEMESTER_WEEKS:
        return "Masa Evaluasi Semester"
    if week == 8:
        return "Week 8 (Pekan UTS)"
    if week == SEMESTER_WEEKS:
        return f"Week {SEMESTER_WEEKS} (Pekan UAS)"
    return f"Week {week}"


def period_payload(
    academic_year_start: int,
    term: str,
    start_date: date | None,
    end_date: date | None,
    today: date,
) -> dict:
    start = start_date or semester_start(academic_year_start, term)
    end = end_date or semester_end(academic_year_start, term)
    title = TERM_TITLES.get(term, term)
    academic_year = f"{academic_year_start}/{academic_year_start + 1}"
    return {
        "academic_year": academic_year,
        "term": term,
        "label": f"Semester {title} {academic_year}",
        "term_label": f"{title} {academic_year}",
        "week_label": week_label(start, today),
        "start_date": start,
        "end_date": end,
        "first_week_monday": first_monday(start),
        "semester_weeks": SEMESTER_WEEKS,
    }
