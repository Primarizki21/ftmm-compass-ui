-- FTMM Compass schema v2 baseline
-- Target: PostgreSQL 16+
-- This file is a baseline DDL. It is not a live migration.

CREATE TABLE "users" (
  "user_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "email" varchar(255) NOT NULL,
  "full_name" varchar(150) NOT NULL,
  "role" varchar(30) NOT NULL DEFAULT 'student',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT users_email_key UNIQUE ("email"),
  CONSTRAINT users_role_check CHECK ("role" IN ('student', 'lecturer', 'faculty_staff', 'admin'))
);

CREATE TABLE "student_profiles" (
  "user_id" uuid PRIMARY KEY,
  "study_program_id" uuid NOT NULL,
  "curriculum_id" uuid NOT NULL,
  "student_number" varchar(30),
  "admission_year" smallint NOT NULL,
  "current_semester" smallint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT student_profiles_student_number_key UNIQUE ("student_number"),
  CONSTRAINT student_profiles_admission_year_check CHECK ("admission_year" > 0),
  CONSTRAINT student_profiles_semester_check CHECK ("current_semester" BETWEEN 1 AND 8)
);

CREATE TABLE "study_programs" (
  "study_program_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "program_code" varchar(20) NOT NULL,
  "program_name" varchar(150) NOT NULL,
  "degree_level" varchar(30) NOT NULL DEFAULT 'sarjana',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT study_programs_program_code_key UNIQUE ("program_code"),
  CONSTRAINT study_programs_program_name_key UNIQUE ("program_name")
);

CREATE TABLE "source_documents" (
  "source_document_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "document_title" varchar(255) NOT NULL,
  "document_type" varchar(50) NOT NULL,
  "academic_year_label" varchar(30),
  "source_url" text,
  "last_verified_at" timestamptz,
  "verified_by_user_id" uuid,
  "verification_notes" text,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT source_documents_verification_pair_check
    CHECK (("last_verified_at" IS NULL) = ("verified_by_user_id" IS NULL))
);

CREATE TABLE "curricula" (
  "curriculum_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "study_program_id" uuid NOT NULL,
  "source_document_id" uuid,
  "curriculum_name" varchar(150) NOT NULL,
  "curriculum_year" smallint NOT NULL,
  "valid_from" date,
  "valid_until" date,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT curricula_program_year_key UNIQUE ("study_program_id", "curriculum_year")
);

CREATE TABLE "courses" (
  "course_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "course_code" varchar(30) NOT NULL,
  "course_name" varchar(200) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT courses_course_code_key UNIQUE ("course_code")
);

CREATE TABLE "grade_scales" (
  "grade" varchar(5) PRIMARY KEY,
  "grade_point" numeric(2,1) NOT NULL,
  "is_passing" boolean NOT NULL,
  CONSTRAINT grade_scales_grade_check CHECK ("grade" IN ('A', 'AB', 'B', 'BC', 'C', 'D', 'E')),
  CONSTRAINT grade_scales_point_check CHECK ("grade_point" BETWEEN 0 AND 4)
);

INSERT INTO "grade_scales" ("grade", "grade_point", "is_passing") VALUES
  ('A', 4.0, true),
  ('AB', 3.5, true),
  ('B', 3.0, true),
  ('BC', 2.5, true),
  ('C', 2.0, true),
  ('D', 1.0, true),
  ('E', 0.0, false);

CREATE TABLE "academic_load_rules" (
  "academic_load_rule_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "minimum_ips" numeric(4,3),
  "maximum_ips" numeric(4,3),
  "minimum_inclusive" boolean NOT NULL DEFAULT true,
  "maximum_inclusive" boolean NOT NULL DEFAULT false,
  "maximum_sks" smallint NOT NULL,
  "applies_to_first_semester" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT academic_load_rules_ips_check CHECK (
    ("minimum_ips" IS NULL OR "minimum_ips" BETWEEN 0 AND 4)
    AND ("maximum_ips" IS NULL OR "maximum_ips" BETWEEN 0 AND 4)
    AND ("minimum_ips" IS NULL OR "maximum_ips" IS NULL OR "minimum_ips" < "maximum_ips")
  ),
  CONSTRAINT academic_load_rules_sks_check CHECK ("maximum_sks" BETWEEN 1 AND 24),
  CONSTRAINT academic_load_rules_first_semester_check CHECK (
    NOT "applies_to_first_semester"
    OR ("minimum_ips" IS NULL AND "maximum_ips" IS NULL)
  )
);

-- Populate regular IPS bands after the academic policy fixes rounding and boundaries.
INSERT INTO "academic_load_rules" (
  "minimum_ips", "maximum_ips", "maximum_sks", "applies_to_first_semester"
) VALUES (NULL, NULL, 24, true);

CREATE TABLE "curriculum_courses" (
  "curriculum_course_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "curriculum_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "credits_total" smallint NOT NULL,
  "recommended_semester" smallint NOT NULL,
  "term" varchar(20) NOT NULL,
  "course_type" varchar(30) NOT NULL,
  "course_scope" varchar(30) NOT NULL DEFAULT 'program_studi',
  "description" text,
  "verification_status" varchar(30) NOT NULL DEFAULT 'unverified',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT curriculum_courses_credits_check CHECK ("credits_total" BETWEEN 1 AND 24),
  CONSTRAINT curriculum_courses_semester_check CHECK ("recommended_semester" BETWEEN 1 AND 8),
  CONSTRAINT curriculum_courses_term_check CHECK ("term" IN ('ganjil', 'genap')),
  CONSTRAINT curriculum_courses_type_check
    CHECK ("course_type" IN ('wajib', 'pilihan', 'pilihan_terbatas')),
  CONSTRAINT curriculum_courses_scope_check
    CHECK ("course_scope" IN ('program_studi', 'fakultas', 'universitas')),
  CONSTRAINT curriculum_courses_verification_check
    CHECK ("verification_status" IN ('unverified', 'verified', 'needs_revision')),
  CONSTRAINT curriculum_courses_curriculum_course_key UNIQUE
    ("curriculum_course_id", "curriculum_id"),
  CONSTRAINT curriculum_courses_course_term_key UNIQUE
    ("curriculum_course_id", "term"),
  CONSTRAINT curriculum_courses_curriculum_term_key UNIQUE
    ("curriculum_course_id", "curriculum_id", "term")
);

CREATE TABLE "course_learning_outcomes" (
  "learning_outcome_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "curriculum_course_id" uuid NOT NULL,
  "outcome_order" smallint NOT NULL,
  "outcome_text" text NOT NULL,
  CONSTRAINT course_learning_outcomes_course_order_key
    UNIQUE ("curriculum_course_id", "outcome_order")
);

CREATE TABLE "course_instructor_references" (
  "instructor_reference_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "curriculum_course_id" uuid NOT NULL,
  "source_document_id" uuid,
  "instructor_name" varchar(200) NOT NULL,
  "is_teaching_team" boolean NOT NULL DEFAULT false
);

CREATE TABLE "course_prerequisites" (
  "course_prerequisite_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "curriculum_course_id" uuid NOT NULL,
  "prerequisite_curriculum_course_id" uuid NOT NULL,
  "minimum_grade" varchar(5),
  "prerequisite_type" varchar(30) NOT NULL DEFAULT 'course',
  "notes" text,
  CONSTRAINT course_prerequisites_pair_key
    UNIQUE ("curriculum_course_id", "prerequisite_curriculum_course_id"),
  CONSTRAINT course_prerequisites_no_self
    CHECK ("curriculum_course_id" <> "prerequisite_curriculum_course_id"),
  CONSTRAINT course_prerequisites_grade_check
    CHECK ("minimum_grade" IS NULL OR "minimum_grade" IN ('A', 'AB', 'B', 'BC', 'C', 'D', 'E')),
  CONSTRAINT course_prerequisites_type_check
    CHECK ("prerequisite_type" = 'course')
);

CREATE TABLE "degree_plans" (
  "degree_plan_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "curriculum_id" uuid NOT NULL,
  "plan_name" varchar(100) NOT NULL DEFAULT 'Rencana Utama',
  "status" varchar(30) NOT NULL DEFAULT 'draft',
  "start_academic_year" smallint,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT degree_plans_user_name_key UNIQUE ("user_id", "plan_name"),
  CONSTRAINT degree_plans_curriculum_key UNIQUE ("degree_plan_id", "curriculum_id"),
  CONSTRAINT degree_plans_status_check CHECK ("status" IN ('draft', 'active', 'archived'))
);

CREATE TABLE "degree_plan_items" (
  "degree_plan_item_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "degree_plan_id" uuid NOT NULL,
  "curriculum_id" uuid NOT NULL,
  "curriculum_course_id" uuid NOT NULL,
  "planned_semester" smallint NOT NULL,
  "planned_term" varchar(20) GENERATED ALWAYS AS (
    CASE WHEN "planned_semester" % 2 = 1 THEN 'ganjil' ELSE 'genap' END
  ) STORED,
  "item_status" varchar(30) NOT NULL DEFAULT 'planned',
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT degree_plan_items_plan_course_key
    UNIQUE ("degree_plan_id", "curriculum_course_id"),
  CONSTRAINT degree_plan_items_semester_check CHECK ("planned_semester" BETWEEN 1 AND 8),
  CONSTRAINT degree_plan_items_status_check
    CHECK ("item_status" IN ('planned', 'taking', 'completed', 'failed'))
);

CREATE TABLE "student_course_records" (
  "student_course_record_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "curriculum_course_id" uuid NOT NULL,
  "academic_period_id" uuid NOT NULL,
  "record_status" varchar(30) NOT NULL,
  "final_grade" varchar(5),
  "completed_at" date,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT student_course_records_attempt_key
    UNIQUE ("user_id", "curriculum_course_id", "academic_period_id"),
  CONSTRAINT student_course_records_status_check
    CHECK ("record_status" IN ('taking', 'passed', 'failed', 'transferred')),
  CONSTRAINT student_course_records_grade_check
    CHECK ("final_grade" IS NULL OR "final_grade" IN ('A', 'AB', 'B', 'BC', 'C', 'D', 'E'))
);

CREATE TABLE "academic_periods" (
  "academic_period_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "academic_year_start" smallint NOT NULL,
  "term" varchar(20) NOT NULL,
  "start_date" date,
  "end_date" date,
  "is_active" boolean NOT NULL DEFAULT false,
  CONSTRAINT academic_periods_year_check CHECK ("academic_year_start" > 0),
  CONSTRAINT academic_periods_term_check CHECK ("term" IN ('ganjil', 'genap', 'pendek')),
  CONSTRAINT academic_periods_dates_check
    CHECK ("start_date" IS NULL OR "end_date" IS NULL OR "end_date" >= "start_date"),
  CONSTRAINT academic_periods_year_term_key UNIQUE ("academic_year_start", "term"),
  CONSTRAINT academic_periods_id_term_key UNIQUE ("academic_period_id", "term")
);

CREATE TABLE "class_sections" (
  "class_section_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "academic_period_id" uuid NOT NULL,
  "curriculum_course_id" uuid NOT NULL,
  "term" varchar(20) NOT NULL,
  "section_code" varchar(20) NOT NULL,
  "capacity" smallint,
  "enrollment_status" varchar(30) NOT NULL DEFAULT 'open',
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT class_sections_term_check CHECK ("term" IN ('ganjil', 'genap')),
  CONSTRAINT class_sections_capacity_check CHECK ("capacity" IS NULL OR "capacity" > 0),
  CONSTRAINT class_sections_period_course_code_key
    UNIQUE ("academic_period_id", "curriculum_course_id", "section_code"),
  CONSTRAINT class_sections_id_period_key UNIQUE ("class_section_id", "academic_period_id")
);

CREATE TABLE "class_schedules" (
  "class_schedule_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "class_section_id" uuid NOT NULL,
  "day_of_week" smallint NOT NULL,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  "room_name" varchar(100),
  "meeting_type" varchar(30) NOT NULL DEFAULT 'lecture',
  CONSTRAINT class_schedules_day_check CHECK ("day_of_week" BETWEEN 1 AND 5),
  CONSTRAINT class_schedules_time_check CHECK (
    "start_time" >= TIME '07:00'
    AND "end_time" <= TIME '17:00'
    AND "end_time" > "start_time"
  ),
  CONSTRAINT class_schedules_meeting_type_check
    CHECK ("meeting_type" IN ('lecture', 'practicum', 'tutorial', 'exam'))
);

CREATE TABLE "timetables" (
  "timetable_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "academic_period_id" uuid NOT NULL,
  "timetable_name" varchar(100) NOT NULL DEFAULT 'Jadwal Utama',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT timetables_user_period_name_key
    UNIQUE ("user_id", "academic_period_id", "timetable_name"),
  CONSTRAINT timetables_id_period_key UNIQUE ("timetable_id", "academic_period_id")
);

CREATE TABLE "timetable_items" (
  "timetable_item_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "timetable_id" uuid NOT NULL,
  "academic_period_id" uuid NOT NULL,
  "class_section_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT timetable_items_timetable_section_key
    UNIQUE ("timetable_id", "class_section_id")
);

CREATE TABLE "course_reports" (
  "course_report_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "curriculum_course_id" uuid NOT NULL,
  "report_type" varchar(50) NOT NULL,
  "description" text NOT NULL,
  "status" varchar(30) NOT NULL DEFAULT 'submitted',
  "resolved_by_user_id" uuid,
  "resolution_notes" text,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "resolved_at" timestamptz,
  CONSTRAINT course_reports_status_check
    CHECK ("status" IN ('submitted', 'reviewing', 'resolved', 'rejected')),
  CONSTRAINT course_reports_resolution_pair_check
    CHECK (("resolved_by_user_id" IS NULL) = ("resolved_at" IS NULL))
);

CREATE TABLE "student_curriculum_overrides" (
  "student_curriculum_override_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "previous_curriculum_id" uuid NOT NULL,
  "new_curriculum_id" uuid NOT NULL,
  "changed_by_user_id" uuid NOT NULL,
  "reason" text NOT NULL,
  "changed_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT student_curriculum_overrides_different_check
    CHECK ("previous_curriculum_id" <> "new_curriculum_id")
);

-- Named indexes for lookups and FK checks. Table-level UNIQUE constraints above already have named keys.
CREATE UNIQUE INDEX curriculum_courses_curriculum_course_uq
  ON "curriculum_courses" ("curriculum_id", "course_id");
CREATE INDEX curriculum_courses_curriculum_semester_idx
  ON "curriculum_courses" ("curriculum_id", "recommended_semester");
CREATE INDEX degree_plan_items_plan_semester_idx
  ON "degree_plan_items" ("degree_plan_id", "planned_semester");

CREATE UNIQUE INDEX timetables_one_active_per_period
  ON "timetables" ("user_id", "academic_period_id") WHERE "is_active";
CREATE UNIQUE INDEX degree_plans_one_active_per_user
  ON "degree_plans" ("user_id") WHERE "status" = 'active';

CREATE INDEX class_schedules_section_idx
  ON "class_schedules" ("class_section_id");
CREATE INDEX timetable_items_section_idx
  ON "timetable_items" ("class_section_id");
CREATE INDEX timetable_items_period_idx
  ON "timetable_items" ("academic_period_id");
CREATE INDEX curriculum_courses_course_idx
  ON "curriculum_courses" ("course_id");
CREATE INDEX course_prerequisites_prerequisite_idx
  ON "course_prerequisites" ("prerequisite_curriculum_course_id");
CREATE INDEX class_sections_course_idx
  ON "class_sections" ("curriculum_course_id");
CREATE INDEX course_reports_user_idx
  ON "course_reports" ("user_id");
CREATE INDEX course_reports_curriculum_course_idx
  ON "course_reports" ("curriculum_course_id");
CREATE INDEX student_profiles_program_idx
  ON "student_profiles" ("study_program_id");
CREATE INDEX student_profiles_curriculum_idx
  ON "student_profiles" ("curriculum_id");
CREATE INDEX course_instructor_references_course_idx
  ON "course_instructor_references" ("curriculum_course_id");
CREATE INDEX student_course_records_period_idx
  ON "student_course_records" ("academic_period_id");

COMMENT ON COLUMN "users"."role" IS 'student, lecturer, faculty_staff, admin';
COMMENT ON COLUMN "student_profiles"."curriculum_id" IS 'Assigned from admission_year; admin overrides are audited';
COMMENT ON COLUMN "student_profiles"."student_number" IS 'NIM, optional according to privacy policy';
COMMENT ON COLUMN "student_profiles"."current_semester" IS '1-8 for the current FTMM scope';
COMMENT ON COLUMN "source_documents"."document_type" IS 'Source document category; validate known categories in the import workflow';
COMMENT ON COLUMN "curriculum_courses"."recommended_semester" IS '1-8; planned-semester parity follows term';
COMMENT ON COLUMN "curriculum_courses"."term" IS 'ganjil or genap; a course cannot be opened in the other term';
COMMENT ON COLUMN "curriculum_courses"."course_type" IS 'wajib, pilihan, pilihan_terbatas';
COMMENT ON COLUMN "curriculum_courses"."course_scope" IS 'program_studi, fakultas, universitas';
COMMENT ON COLUMN "curriculum_courses"."verification_status" IS 'unverified, verified, needs_revision';
COMMENT ON COLUMN "course_instructor_references"."instructor_name" IS 'Reference from source documents, not an actual section assignment';
COMMENT ON COLUMN "course_prerequisites"."minimum_grade" IS 'A, AB, B, BC, C, D, or E; compare by grade point';
COMMENT ON COLUMN "course_prerequisites"."prerequisite_type" IS 'V2 supports course prerequisites as AND relationships';
COMMENT ON COLUMN "degree_plans"."status" IS 'draft, active, archived';
COMMENT ON COLUMN "degree_plan_items"."planned_semester" IS '1-8; must match the curriculum course term';
COMMENT ON COLUMN "degree_plan_items"."item_status" IS 'planned, taking, completed, failed';
COMMENT ON COLUMN "student_course_records"."record_status" IS 'taking, passed, failed, transferred';
COMMENT ON COLUMN "student_course_records"."final_grade" IS 'A, AB, B, BC, C, D, or E; NULL for taking/transfer without a grade';
COMMENT ON COLUMN "academic_periods"."term" IS 'ganjil, genap, or future pendek support';
COMMENT ON COLUMN "class_sections"."term" IS 'Must match both curriculum_courses.term and academic_periods.term';
COMMENT ON COLUMN "class_sections"."section_code" IS 'Example: A, B, C';
COMMENT ON COLUMN "class_schedules"."day_of_week" IS '1=Senin ... 5=Jumat; 07:00-17:00 only';
COMMENT ON COLUMN "class_schedules"."meeting_type" IS 'lecture, practicum, tutorial, exam';
COMMENT ON COLUMN "course_reports"."status" IS 'submitted, reviewing, resolved, rejected';
COMMENT ON COLUMN "academic_load_rules"."maximum_sks" IS 'Maximum semester SKS for the associated IPS band';

ALTER TABLE "student_profiles"
  ADD CONSTRAINT student_profiles_user_fk
    FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT student_profiles_program_fk
    FOREIGN KEY ("study_program_id") REFERENCES "study_programs" ("study_program_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT student_profiles_curriculum_fk
    FOREIGN KEY ("curriculum_id") REFERENCES "curricula" ("curriculum_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT student_profiles_user_curriculum_key
    UNIQUE ("user_id", "curriculum_id");

ALTER TABLE "source_documents"
  ADD CONSTRAINT source_documents_verifier_fk
    FOREIGN KEY ("verified_by_user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "curricula"
  ADD CONSTRAINT curricula_program_fk
    FOREIGN KEY ("study_program_id") REFERENCES "study_programs" ("study_program_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT curricula_source_document_fk
    FOREIGN KEY ("source_document_id") REFERENCES "source_documents" ("source_document_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "curriculum_courses"
  ADD CONSTRAINT curriculum_courses_curriculum_fk
    FOREIGN KEY ("curriculum_id") REFERENCES "curricula" ("curriculum_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT curriculum_courses_course_fk
    FOREIGN KEY ("course_id") REFERENCES "courses" ("course_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "course_learning_outcomes"
  ADD CONSTRAINT course_learning_outcomes_course_fk
    FOREIGN KEY ("curriculum_course_id") REFERENCES "curriculum_courses" ("curriculum_course_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "course_instructor_references"
  ADD CONSTRAINT course_instructor_references_course_fk
    FOREIGN KEY ("curriculum_course_id") REFERENCES "curriculum_courses" ("curriculum_course_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT course_instructor_references_source_document_fk
    FOREIGN KEY ("source_document_id") REFERENCES "source_documents" ("source_document_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "course_prerequisites"
  ADD CONSTRAINT course_prerequisites_course_fk
    FOREIGN KEY ("curriculum_course_id") REFERENCES "curriculum_courses" ("curriculum_course_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT course_prerequisites_prerequisite_fk
    FOREIGN KEY ("prerequisite_curriculum_course_id") REFERENCES "curriculum_courses" ("curriculum_course_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT course_prerequisites_grade_fk
    FOREIGN KEY ("minimum_grade") REFERENCES "grade_scales" ("grade") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "degree_plans"
  ADD CONSTRAINT degree_plans_user_fk
    FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT degree_plans_curriculum_fk
    FOREIGN KEY ("curriculum_id") REFERENCES "curricula" ("curriculum_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT degree_plans_profile_curriculum_fk
    FOREIGN KEY ("user_id", "curriculum_id")
    REFERENCES "student_profiles" ("user_id", "curriculum_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "degree_plan_items"
  ADD CONSTRAINT degree_plan_items_plan_fk
    FOREIGN KEY ("degree_plan_id") REFERENCES "degree_plans" ("degree_plan_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT degree_plan_items_plan_curriculum_fk
    FOREIGN KEY ("degree_plan_id", "curriculum_id")
    REFERENCES "degree_plans" ("degree_plan_id", "curriculum_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT degree_plan_items_course_curriculum_term_fk
    FOREIGN KEY ("curriculum_course_id", "curriculum_id", "planned_term")
    REFERENCES "curriculum_courses" ("curriculum_course_id", "curriculum_id", "term") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "student_course_records"
  ADD CONSTRAINT student_course_records_user_fk
    FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT student_course_records_course_fk
    FOREIGN KEY ("curriculum_course_id") REFERENCES "curriculum_courses" ("curriculum_course_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT student_course_records_period_fk
    FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods" ("academic_period_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT student_course_records_grade_fk
    FOREIGN KEY ("final_grade") REFERENCES "grade_scales" ("grade") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "class_sections"
  ADD CONSTRAINT class_sections_period_fk
    FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods" ("academic_period_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT class_sections_course_fk
    FOREIGN KEY ("curriculum_course_id") REFERENCES "curriculum_courses" ("curriculum_course_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT class_sections_period_term_fk
    FOREIGN KEY ("academic_period_id", "term")
    REFERENCES "academic_periods" ("academic_period_id", "term") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT class_sections_course_term_fk
    FOREIGN KEY ("curriculum_course_id", "term")
    REFERENCES "curriculum_courses" ("curriculum_course_id", "term") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "class_schedules"
  ADD CONSTRAINT class_schedules_section_fk
    FOREIGN KEY ("class_section_id") REFERENCES "class_sections" ("class_section_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "timetables"
  ADD CONSTRAINT timetables_user_fk
    FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT timetables_period_fk
    FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods" ("academic_period_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "timetable_items"
  ADD CONSTRAINT timetable_items_timetable_fk
    FOREIGN KEY ("timetable_id") REFERENCES "timetables" ("timetable_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT timetable_items_section_fk
    FOREIGN KEY ("class_section_id") REFERENCES "class_sections" ("class_section_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT timetable_items_timetable_period_fk
    FOREIGN KEY ("timetable_id", "academic_period_id")
    REFERENCES "timetables" ("timetable_id", "academic_period_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT timetable_items_section_period_fk
    FOREIGN KEY ("class_section_id", "academic_period_id")
    REFERENCES "class_sections" ("class_section_id", "academic_period_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "course_reports"
  ADD CONSTRAINT course_reports_user_fk
    FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT course_reports_course_fk
    FOREIGN KEY ("curriculum_course_id") REFERENCES "curriculum_courses" ("curriculum_course_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT course_reports_resolver_fk
    FOREIGN KEY ("resolved_by_user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "student_curriculum_overrides"
  ADD CONSTRAINT student_curriculum_overrides_user_fk
    FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT student_curriculum_overrides_previous_fk
    FOREIGN KEY ("previous_curriculum_id") REFERENCES "curricula" ("curriculum_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT student_curriculum_overrides_new_fk
    FOREIGN KEY ("new_curriculum_id") REFERENCES "curricula" ("curriculum_id") DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT student_curriculum_overrides_actor_fk
    FOREIGN KEY ("changed_by_user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER student_profiles_touch_updated_at
  BEFORE UPDATE ON "student_profiles"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER courses_touch_updated_at
  BEFORE UPDATE ON "courses"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER curriculum_courses_touch_updated_at
  BEFORE UPDATE ON "curriculum_courses"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER degree_plans_touch_updated_at
  BEFORE UPDATE ON "degree_plans"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER timetables_touch_updated_at
  BEFORE UPDATE ON "timetables"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
