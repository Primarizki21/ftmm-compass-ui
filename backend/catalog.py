"""SSOT katalog kurikulum FTMM.

Satu-satunya jalur baca katalog untuk API: DB (hasil seed kanonik), dengan fallback
ke berkas `Ekstrak/*.json` bila database belum terisi. Admin CRUD menulis ke DB lalu
memanggil `refresh_from_db`, sehingga tidak ada salinan katalog di memori proses yang
bisa menyimpang dari database.
"""

import glob
import json
import os
import re
from collections import defaultdict
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from academics import parity_of, term_of
from models import Course, Curriculum, CurriculumCourse, StudyProgram
from schemas import CourseModel

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EKSTRAK_DIR = os.path.join(REPO_ROOT, "Ekstrak")

PRODI_ALIASES = {
    "teknologi sains data": "Teknologi Sains Data",
    "sains data": "Teknologi Sains Data",
    "data science": "Teknologi Sains Data",
    "tsd": "Teknologi Sains Data",
    "teknik robotika dan kecerdasan buatan": "Teknik Robotika dan Kecerdasan Buatan",
    "teknik robotika & kecerdasan buatan": "Teknik Robotika dan Kecerdasan Buatan",
    "robotika dan kecerdasan buatan": "Teknik Robotika dan Kecerdasan Buatan",
    "robotika": "Teknik Robotika dan Kecerdasan Buatan",
    "trkb": "Teknik Robotika dan Kecerdasan Buatan",
    "s1 rekayasa nanoteknologi": "Rekayasa Nanoteknologi",
    "rekayasa nanoteknologi": "Rekayasa Nanoteknologi",
    "nanoteknologi": "Rekayasa Nanoteknologi",
    "nano": "Rekayasa Nanoteknologi",
    "rn": "Rekayasa Nanoteknologi",
    "teknik industri": "Teknik Industri",
    "industri": "Teknik Industri",
    "ti": "Teknik Industri",
    "teknik elektro": "Teknik Elektro",
    "elektro": "Teknik Elektro",
    "te": "Teknik Elektro",
}

DEFAULT_PRODI = "Teknologi Sains Data"

PROGRAM_NAMES = {
    "TSD": "Teknologi Sains Data",
    "TRKB": "Teknik Robotika dan Kecerdasan Buatan",
    "RN": "Rekayasa Nanoteknologi",
    "TI": "Teknik Industri",
    "TE": "Teknik Elektro",
}

PROGRAM_ORDER = ["TSD", "RN", "TRKB", "TE", "TI"]

PROGRAM_HEADINGS = {
    code: f"S1 {name}" for code, name in PROGRAM_NAMES.items()
}

CURRICULUM_DOCS = {
    "TRKB": "754 KR KURIKULUM S1 TEKNIK ROBOTIKA KECERDASAN BUATAN FTMM stempel.pdf",
    "TSD": "Dokumen Kurikulum TSD.pdf",
}

PRODI_CODES = {name: code for code, name in PROGRAM_NAMES.items()}

COURSE_CODE_PATTERN = re.compile(r"^[A-Z]{2,4}\d{3}$")

_CURRICULUM: Dict[str, List[CourseModel]] = {}
_SOURCE = "empty"


def normalize_prodi(prodi_input: Optional[str]) -> Optional[str]:
    if not prodi_input:
        return None
    cleaned = prodi_input.strip().lower()
    if cleaned in PRODI_ALIASES:
        return PRODI_ALIASES[cleaned]
    for alias, formal_name in PRODI_ALIASES.items():
        if len(alias) > 3 and alias in cleaned:
            return formal_name
    return prodi_input.strip()


def prodi_code(prodi: Optional[str]) -> str:
    return PRODI_CODES.get(normalize_prodi(prodi) or "", "")


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "course"


def normalize_course_type(raw: Optional[str]) -> str:
    value = (raw or "").lower()
    if any(key in value for key in ("pilihan", "pengayaan", "peminatan")):
        return "Pilihan"
    return "Wajib"


def _build_course(
    program: str,
    code: Optional[str],
    name: str,
    credits: int,
    semester: int,
    course_type: Optional[str],
    term: Optional[str],
    desc: str,
    prerequisites: List[str],
    used_ids: set,
    lecturer: Optional[str] = None,
) -> CourseModel:
    course_id = f"{slugify(program)}:{code or slugify(name)}"
    if course_id in used_ids:
        course_id = f"{course_id}-{slugify(name)}"
    while course_id in used_ids:
        course_id += "-x"
    used_ids.add(course_id)

    parity = parity_of(semester)
    if term in ("ganjil", "genap"):
        parity = "odd" if term == "ganjil" else "even"

    return CourseModel(
        id=course_id,
        code=code or None,
        name=name,
        credits=credits,
        semester=semester,
        type=normalize_course_type(course_type),
        parity=parity,
        desc=desc or "",
        program=program,
        lecturer=lecturer,
        prerequisites=prerequisites,
    )


def load_ekstrak(directory: str = EKSTRAK_DIR) -> Dict[str, List[CourseModel]]:
    """Fallback offline: baca kurikulum dari berkas JSON hasil ekstraksi PDF."""
    curriculum: Dict[str, List[CourseModel]] = {}
    if not os.path.isdir(directory):
        return curriculum

    for filepath in sorted(glob.glob(os.path.join(directory, "*.json"))):
        try:
            with open(filepath, encoding="utf-8") as handle:
                data = json.load(handle)
        except (OSError, json.JSONDecodeError):
            continue

        meta = data.get("metadata", {})
        raw_program = (
            meta.get("program_studi")
            or os.path.basename(filepath).replace("FIX ", "").replace(".json", "")
        )
        program = normalize_prodi(re.sub(r"^S1\s+", "", raw_program).strip())
        if not program:
            continue

        used_ids: set = set()
        courses: List[CourseModel] = []
        for index, item in enumerate(data.get("mata_kuliah", [])):
            name = (item.get("nama_mk") or f"Matkul {index + 1}").strip()
            semester = int(item.get("semester") or 1)
            prerequisites = [
                str(entry).strip()
                for entry in (item.get("prasyarat") or [])
                if isinstance(entry, (str, dict)) and str(entry).strip()
            ]
            courses.append(
                _build_course(
                    program=program,
                    code=(item.get("kode_mk") or None),
                    name=name,
                    credits=int(item.get("sks") or 3),
                    semester=semester,
                    course_type=item.get("jenis"),
                    term=term_of(semester),
                    desc=item.get("deskripsi") or "",
                    prerequisites=prerequisites,
                    used_ids=used_ids,
                )
            )
        if courses:
            curriculum[program] = courses

    return curriculum


async def _load_requirement_leaves(db: AsyncSession) -> Dict[str, List[str]]:
    """Prasyarat per curriculum_course_id dari pohon requirement di DB."""
    from sqlalchemy import text

    rows = (
        await db.execute(
            text(
                """
                SELECT r.curriculum_course_id,
                       n.node_type,
                       n.threshold_value,
                       ref_course.course_name,
                       ref_course.course_code
                FROM course_requirement_rules r
                JOIN course_requirement_nodes n
                  ON n.course_requirement_rule_id = r.course_requirement_rule_id
                LEFT JOIN curriculum_courses ref_cc
                  ON ref_cc.curriculum_course_id = n.referenced_curriculum_course_id
                LEFT JOIN courses ref_course
                  ON ref_course.course_id = ref_cc.course_id
                ORDER BY r.curriculum_course_id, n.node_order
                """
            )
        )
    ).mappings()

    leaves: Dict[str, List[str]] = defaultdict(list)
    for row in rows:
        node_type = row["node_type"]
        label = row["course_name"] or row["course_code"]
        if node_type in ("course_passed", "course_taken_or_concurrent") and label:
            leaves[str(row["curriculum_course_id"])].append(label)
        elif node_type == "minimum_completed_sks":
            leaves[str(row["curriculum_course_id"])].append(
                f"Minimal {int(row['threshold_value'] or 0)} SKS"
            )
        elif node_type == "minimum_choice_sks":
            leaves[str(row["curriculum_course_id"])].append(
                f"Minimal {int(row['threshold_value'] or 0)} SKS MK Pilihan"
            )
        elif node_type == "minimum_semester":
            leaves[str(row["curriculum_course_id"])].append(
                f"Minimal semester {int(row['threshold_value'] or 0)}"
            )
    return leaves


def _pick_richest(coverage: Dict[tuple[str, int], int]) -> Dict[str, int]:
    """Kurikulum otoritatif per prodi: cakupan mata kuliah terbanyak, seri -> tahun terbaru."""
    chosen: Dict[str, tuple[int, int]] = {}
    for (program, year), count in coverage.items():
        best = chosen.get(program)
        if best is None or count > best[0] or (count == best[0] and year > best[1]):
            chosen[program] = (count, year)
    return {program: year for program, (_, year) in chosen.items()}


async def authoritative_curriculum_id(
    db: AsyncSession, program_name: str
) -> Optional[object]:
    """Id kurikulum yang dipakai katalog untuk prodi ini (sumber sama dengan refresh)."""
    program = normalize_prodi(program_name) or DEFAULT_PRODI
    rows = (
        await db.execute(
            select(
                Curriculum.curriculum_id,
                Curriculum.curriculum_year,
                StudyProgram.program_name,
            )
            .join(CurriculumCourse, CurriculumCourse.curriculum_id == Curriculum.curriculum_id)
            .join(StudyProgram, StudyProgram.study_program_id == Curriculum.study_program_id)
        )
    ).mappings().all()

    coverage: Dict[tuple[str, int], int] = defaultdict(int)
    by_key: Dict[tuple[str, int], object] = {}
    for row in rows:
        name = normalize_prodi(row["program_name"]) or DEFAULT_PRODI
        year = row["curriculum_year"] or 0
        coverage[(name, year)] += 1
        by_key[(name, year)] = row["curriculum_id"]

    year = _pick_richest(coverage).get(program)
    return by_key.get((program, year)) if year is not None else None


async def refresh_from_db(db: AsyncSession) -> int:
    """Bangun ulang cache katalog dari database; kembalikan jumlah mata kuliah."""
    global _CURRICULUM, _SOURCE

    rows = (
        await db.execute(
            select(
                StudyProgram.program_name,
                Curriculum.curriculum_year,
                CurriculumCourse.curriculum_course_id,
                CurriculumCourse.credits_total,
                CurriculumCourse.recommended_semester,
                CurriculumCourse.term,
                CurriculumCourse.course_type,
                CurriculumCourse.description,
                Course.course_code,
                Course.course_name,
            )
            .join(CurriculumCourse, CurriculumCourse.course_id == Course.course_id)
            .join(Curriculum, Curriculum.curriculum_id == CurriculumCourse.curriculum_id)
            .join(StudyProgram, StudyProgram.study_program_id == Curriculum.study_program_id)
            .where(Course.is_active.is_(True), CurriculumCourse.is_active.is_(True))
        )
    ).mappings().all()

    if not rows:
        if not _CURRICULUM:
            _CURRICULUM = load_ekstrak()
            _SOURCE = "ekstrak"
        return sum(len(courses) for courses in _CURRICULUM.values())

    leaves = await _load_requirement_leaves(db)

    coverage: Dict[tuple[str, int], int] = defaultdict(int)
    for row in rows:
        program = normalize_prodi(row["program_name"]) or DEFAULT_PRODI
        coverage[(program, row["curriculum_year"] or 0)] += 1
    chosen = _pick_richest(coverage)

    catalog: Dict[str, List[CourseModel]] = {}
    used_by_program: Dict[str, set] = defaultdict(set)
    for row in rows:
        program = normalize_prodi(row["program_name"]) or DEFAULT_PRODI
        if (row["curriculum_year"] or 0) != chosen[program]:
            continue
        catalog.setdefault(program, []).append(
            _build_course(
                program=program,
                code=row["course_code"],
                name=row["course_name"],
                credits=row["credits_total"] or 0,
                semester=row["recommended_semester"] or 1,
                course_type=row["course_type"],
                term=row["term"],
                desc=row["description"] or "",
                prerequisites=leaves.get(str(row["curriculum_course_id"]), []),
                used_ids=used_by_program[program],
            )
        )

    _CURRICULUM = catalog
    _SOURCE = "database"
    return sum(len(courses) for courses in catalog.values())


def catalog_source() -> str:
    return _SOURCE


def get_available_programs() -> List[str]:
    return sorted(_CURRICULUM.keys())


def get_courses_for_program(prodi: str) -> List[CourseModel]:
    program = normalize_prodi(prodi)
    if program and program in _CURRICULUM:
        return list(_CURRICULUM[program])
    return list(_CURRICULUM.get(DEFAULT_PRODI, []))


async def get_courses_for_curriculum(
    db: AsyncSession, curriculum_id
) -> List[CourseModel]:
    """Katalog untuk satu kurikulum konkret (mis. kurikulum milik mahasiswa)."""
    rows = (
        await db.execute(
            select(
                StudyProgram.program_name,
                CurriculumCourse.curriculum_course_id,
                CurriculumCourse.credits_total,
                CurriculumCourse.recommended_semester,
                CurriculumCourse.term,
                CurriculumCourse.course_type,
                CurriculumCourse.description,
                Course.course_code,
                Course.course_name,
            )
            .join(CurriculumCourse, CurriculumCourse.course_id == Course.course_id)
            .join(Curriculum, Curriculum.curriculum_id == CurriculumCourse.curriculum_id)
            .join(StudyProgram, StudyProgram.study_program_id == Curriculum.study_program_id)
            .where(
                CurriculumCourse.curriculum_id == curriculum_id,
                Course.is_active.is_(True),
                CurriculumCourse.is_active.is_(True),
            )
        )
    ).mappings().all()
    if not rows:
        return []

    program = normalize_prodi(rows[0]["program_name"]) or DEFAULT_PRODI
    leaves = await _load_requirement_leaves(db)
    used_ids: set = set()
    return [
        _build_course(
            program=program,
            code=row["course_code"],
            name=row["course_name"],
            credits=row["credits_total"] or 0,
            semester=row["recommended_semester"] or 1,
            course_type=row["course_type"],
            term=row["term"],
            desc=row["description"] or "",
            prerequisites=leaves.get(str(row["curriculum_course_id"]), []),
            used_ids=used_ids,
        )
        for row in rows
    ]


def get_all_courses() -> List[CourseModel]:
    return [course for courses in _CURRICULUM.values() for course in courses]


def get_course(course_id: str) -> Optional[CourseModel]:
    if not course_id:
        return None
    needle = course_id.strip().lower()
    for course in get_all_courses():
        if course.id.lower() == needle or (course.code or "").lower() == needle:
            return course
    return None


_CURRICULUM = load_ekstrak()
_SOURCE = "ekstrak" if _CURRICULUM else "empty"
