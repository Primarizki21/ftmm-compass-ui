import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Boolean,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    DateTime,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    role: Mapped[str] = mapped_column(String(30), nullable=False, default="student")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    student_profile: Mapped[Optional["StudentProfile"]] = relationship(
        "StudentProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


class StudyProgram(Base):
    __tablename__ = "study_programs"

    study_program_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    program_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    program_name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    degree_level: Mapped[str] = mapped_column(String(30), nullable=False, default="sarjana")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    student_profiles: Mapped[list["StudentProfile"]] = relationship(
        "StudentProfile",
        back_populates="study_program",
    )


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        primary_key=True,
    )
    study_program_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("study_programs.study_program_id", ondelete="RESTRICT"),
        nullable=False,
    )
    student_number: Mapped[Optional[str]] = mapped_column(String(30), unique=True, nullable=True)
    admission_year: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    current_semester: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="student_profile")
    study_program: Mapped["StudyProgram"] = relationship("StudyProgram", back_populates="student_profiles")
