from typing import List, Optional, Dict, Literal
from pydantic import BaseModel, Field


class StudentProfile(BaseModel):
    program_studi: Optional[str] = Field(
        None, description="Nama program studi resmi FTMM (e.g. Rekayasa Perangkat Lunak, Teknologi Sains Data)"
    )
    semester_saat_ini: Optional[int] = Field(
        None, ge=1, le=8, description="Semester yang sedang ditempuh mahasiswa (1-8)"
    )
    riwayat_matkul_lulus: List[str] = Field(
        default_factory=list, description="Daftar nama atau kode mata kuliah yang sudah lulus"
    )
    minat_fokus: List[str] = Field(
        default_factory=list, description="Bidang minat/spesialisasi karir (e.g. Data Science, Machine Learning, Web Backend)"
    )
    target_kelulusan_semester: int = Field(
        8, ge=7, le=8, description="Target semester untuk lulus (7 atau 8)"
    )
    maks_sks_per_semester: int = Field(
        24, ge=12, le=24, description="Batas maksimum SKS per semester"
    )
    is_confirmed_by_user: bool = Field(
        False, description="Apakah mahasiswa sudah mengonfirmasi ringkasan data profil"
    )


class CourseModel(BaseModel):
    id: str
    code: Optional[str] = None
    name: str
    credits: int
    semester: int
    type: Literal["Wajib", "Pilihan"]
    parity: Literal["odd", "even"]
    desc: str = ""
    program: Optional[str] = None
    prerequisites: List[str] = Field(default_factory=list)


class PlacedCourseModel(CourseModel):
    status: Literal["completed", "planned", "wishlist"] = "planned"


class PlanValidationRequest(BaseModel):
    program_studi: str
    semester_saat_ini: int
    riwayat_matkul_lulus: List[str] = Field(default_factory=list)
    maks_sks_per_semester: int = 24
    plan: Dict[int, List[PlacedCourseModel]]


class PlanValidationResponse(BaseModel):
    is_valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    total_credits: int
    semester_credits: Dict[int, int] = Field(default_factory=dict)


class PlanPayloadSummary(BaseModel):
    program_studi: str
    current_semester: int
    target_semester: int
    total_credits: int
    focus_tracks: List[str]
    note: str = ""


class DegreePlanPayload(BaseModel):
    action: Literal["APPLY_DEGREE_PLAN"] = "APPLY_DEGREE_PLAN"
    summary: PlanPayloadSummary
    plan: Dict[int, List[PlacedCourseModel]]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    plan_payload: Optional[DegreePlanPayload] = None


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = Field(default_factory=list)
    student_profile: Optional[StudentProfile] = None


class ChatResponse(BaseModel):
    reply: str
    updated_profile: StudentProfile
    plan_payload: Optional[DegreePlanPayload] = None
    action_type: Optional[Literal["NEED_INFO", "CONFIRM_PROFILE", "PLAN_GENERATED", "GENERAL_CHAT"]] = None
    missing_slots: List[str] = Field(default_factory=list)
