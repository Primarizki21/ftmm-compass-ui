# Schema Review — `RANCANGAN DIAGRAM AWAL.sql`

Scope: 22 tables, 42 foreign keys, 17 explicitly created indexes. Static review; the v2 baseline has been validated against PostgreSQL 16, but no production database migration was executed.
Version: v2 — owner decisions captured; retake IPS treatment and IPS rounding remain open.

## Verdict

Normalization is good: surrogate UUID keys, proper junction tables, no JSON blobs, no duplicated facts. The skeleton is sound. The problems are systemic, not structural:

1. **No data-validation layer.** ~16 free-text `varchar` columns carry enumerations that exist only as SQL comments. The database accepts any value.
2. **No lifecycle guarantees.** `is_active` flags, `updated_at`, validity windows, min/max rules — all depend on application discipline.
3. **Some parent-child consistency is impossible to express with the current FK shape.**
4. **Index gaps on reverse lookups.**

---

## HIGH

### H1 — Zero CHECK constraints
Every enumeration, range, and ordering rule is currently unenforced:
- `users.role` accepts arbitrary text.
- `class_schedules.day_of_week` currently allows values outside the FTMM weekday rule.
- `class_schedules.end_time <= start_time` is legal.
- Negative `credits_total`, `current_semester`, and `admission_year` are legal.

V2 decisions:
- `users.role` is one of `student`, `lecturer`, `faculty_staff`, or `admin`.
- Class schedules are Monday–Friday only, from 07:00 through 17:00; `end_time` must be later than `start_time`; overnight classes are forbidden.
- `current_semester`, `recommended_semester`, and `planned_semester` are 1–8; `credits_total` is 1–24.
- `admission_year` may not be later than the current year.
- Grades are `A`, `AB`, `B`, `BC`, `C`, `D`, or `E`; D is passing. Grade points are 4, 3.5, 3, 2.5, 2, 1, and 0 respectively.
- The IPS-to-maximum-SKS rule is separate from requirement groups and is stored in a database rule table. Semester one defaults to 24 SKS; IPS is calculated from course records.

The exact IPS rounding rule remains open. Do not encode the dynamic IPS load limit as a static `CHECK` until that policy is confirmed.

Fix: `CHECK` constraints on the fixed-value columns and numeric ranges; a separate rule table plus application validation for the student-specific IPS load limit.

### H2 — Nullable column defeats its own UNIQUE index
`student_course_records.academic_period_id` is nullable but part of `UNIQUE (user_id, curriculum_course_id, academic_period_id)`. In PostgreSQL, NULLs are distinct in unique indexes, so unlimited duplicate `(user, course, NULL)` rows are allowed — dedup silently fails exactly where the period is unknown.

Decision: make `academic_period_id` NOT NULL. Keep every attempt across periods; do not prune the losing attempt. A `taking` record is created when KRS is final and is a temporary academic snapshot, not proof of official enrollment. Retakes still consume the semester's SKS limit. Transfer records contribute credits toward study completion but not IPS/IPK. The exact IPS treatment of a retake remains open.

### H3 — Timetable can hold sections from a foreign period
`timetable_items → class_sections` and `timetables.academic_period_id` are independent chains. Nothing currently forces `class_sections.academic_period_id = timetables.academic_period_id`.

V2 decision: timetables are personal planners. A user may keep several alternative timetables for one period, with at most one active. Every item must use a section from the timetable's period.

Each `curriculum_course` also has one fixed term, `ganjil` or `genap`. A section opened in a mismatched term must be rejected. Planned semesters must match that term: ganjil → 1/3/5/7 and genap → 2/4/6/8.

Fix: add the term to `curriculum_courses`; use composite FKs or a trigger for timetable-period and course-term consistency, and validate planned-semester parity.

### H4 — Curriculum mixing is constrained by policy, not the current FK shape
The current foreign keys do not ensure that a degree plan, its items, and a student's profile use the same curriculum.

V2 decisions:
- Admission year 2024 and earlier uses curriculum 2021; admission year 2025 and later uses curriculum 2025.
- Both curricula remain available at the same time because older cohorts cannot be moved to the new curriculum.
- `student_profiles.curriculum_id` is required and is assigned from the admission year. An admin may override it; the override must record who changed it, when, the old and new curriculum, and the reason.
- An active degree plan must use the same curriculum as the student profile. Cross-curriculum course selection is forbidden.
- Historical `student_course_records` keep their original `curriculum_course` relationship when an admin changes the student's current curriculum.

For now, the existing unique key `(study_program_id, curriculum_year)` remains valid because the two active curricula have different years. Revisit it if same-year revisions become possible.

Fix: enforce the profile/plan/course relationship with composite FKs, a trigger, or mandatory backend validation; add an audit record for curriculum overrides without rewriting historical records.
### H5 — No RLS / grants / policies (conditional)
Decision: local Docker PostgreSQL first, hosted provider later. With backend-only DB access, RLS is not required today.

Trigger condition: the moment tables are exposed directly to clients (Supabase-style provider), enable RLS + owner-only policies on all user-data tables (`degree_plans`, `student_course_records`, `timetables`, `course_reports`) and make `users.role` writable only by the service role — otherwise cross-user data leaks and privilege escalation. Keep DDL vanilla PostgreSQL meanwhile so the dump migrates to any host unchanged.

---

## MEDIUM

### M1 — `updated_at` never updates
`DEFAULT now()` fires on INSERT only. Six entity tables (`users`, `student_profiles`, `courses`, `curriculum_courses`, `degree_plans`, `timetables`) have permanently stale `updated_at` values.

V2 decision: use live `updated_at` triggers on important entity tables. Do not add audit timestamps to every junction table unless a later audit requirement needs them.

Fix: one `BEFORE UPDATE` trigger function, attached to the important entity tables.

### M2 — Active flags have different meanings
V2 decisions:
- Multiple curricula may be available for one program at the same time because cohorts remain on older curricula.
- Multiple academic periods may be active at the same time.
- A user may have at most one active timetable per academic period.
- A user may have at most one degree plan with `status = 'active'`; having none is allowed.

Fix: create partial unique indexes only for timetables and degree plans. Do not create a one-active index for curricula or academic periods.

### M3 — Prerequisite graph unprotected
Self-loop is legal today (`curriculum_course_id = prerequisite_curriculum_course_id`). Longer cycles (A↔B) cannot be prevented declaratively.

V2 decision: reject self-loops with a `CHECK`; detect longer cycles at write time. Do not create guessed prerequisite links from unresolved source text; hold them for manual verification.

### M4 — Delete strategy is explicit
Catalog data is not deleted permanently. Courses, curricula, and source documents remain for history and are deactivated with `is_active` or another status. Student accounts are deactivated and anonymized; academic records remain available. Planner data may be archived, but it must not erase the academic history.

Fix: keep catalog references restrictive and document the archive/anonymization flow instead of cascading destructive deletes.

### M5 — Missing FK-side indexes
PostgreSQL does not auto-index the referencing side. Reverse lookups and FK checks scan full tables on the relationships used by section schedules, timetable items, curriculum membership, prerequisites, reports, student profiles, instructor references, and academic records.

V2 decision: the removed requirement-group tables are not part of the index plan. Name the remaining indexes and add the FK-side indexes that support the actual planner, history, report, and import queries.

### M6 — Grade domain undefined
`final_grade` and `course_prerequisites.minimum_grade` use `varchar(5)`, but the accepted scale is now fixed: `A`, `AB`, `B`, `BC`, `C`, `D`, `E`. The grade points are 4, 3.5, 3, 2.5, 2, 1, and 0; D is passing.

Fix: add the grade-label `CHECK` or lookup table and use numeric grade points for IPK, IPS, retake comparison, and prerequisite thresholds. Never compare grade strings.

### M7 — Requirement groups do not model the FTMM rule
FTMM's current rule limits a student's total semester SKS from the previous IPS; it does not require a number of courses from a requirement group. `minimum_courses` and `maximum_courses` therefore model a rule FTMM is not using.

V2 decision: remove `requirement_groups` and `requirement_group_courses` for the FTMM schema. If a broader university version later needs group credit requirements, design that separately.

### M8 — `capacity` is future metadata
No enrollment fact links students to `class_sections`; `timetable_items` is a personal planner, not enrollment. Capacity and `enrollment_status` cannot be checked against real registrations yet.

V2 decision: keep both fields as preparation for future KRS integration, but do not present them as validated enrollment data. Add `section_enrollments` when official KRS data is integrated.

---

## LOW

| # | Finding | Fix |
|---|---------|-----|
| L1 | All indexes unnamed → auto-generated names, painful future `DROP ... IF EXISTS`. | Name every remaining index. |
| L2 | Audit columns are inconsistent. | Add timestamps to important entity tables only; do not add them to every junction table unless a later audit need appears. |
| L3 | `source_documents.verified_by_user_id` and `last_verified_at` can be set independently. | Require both to be null or both to be filled; record curriculum overrides with actor, time, old/new curriculum, and reason. |
| L4 | Enum columns are documented in comments only. | Add `CHECK`s using the v2 role, grade, term, status, and type values. |
| L5 | `gen_random_uuid()` needs PG 13+ (or `pgcrypto`). | Moot with Docker `postgres:16+`; pin the image tag explicitly. |
| L6 | `room_name` is free text and room overlap is not prevented. | Accept this for the planner-only v2; revisit when room scheduling becomes a requirement. |
| L7 | `curricula UNIQUE (study_program_id, curriculum_year)` forbids same-year revisions. | Keep it for now: curriculum 2021 and 2025 have different years and may both be available. Revisit if same-year revisions are introduced. |
| L8 | RESOLVED with real data — `Ekstrak/` catalogs hold 265 distinct codes and **47 of them are shared across programs** (8 in all 5: e.g. `TNM101`, `AGI101`, `NOP103`, `SIP107`, `MNM106`). Shared MKWU/faculty courses are the norm, not the exception. | Keep global UNIQUE; merge only non-conflicting rows by code and hold conflicting identities for manual review. Add format CHECK `kode ~ '^[A-Z]+[0-9]{3,4}$'` to catch malformed entries like the bare `PNJ`. |

---

## Design tensions (not bugs — decide consciously)

- **D1 — Three overlapping "what am I taking" stores:** V2 assigns clear roles: `degree_plan_items` is the long-term study plan; `timetable_items` is a personal planner for one academic period, with alternatives and at most one active; `student_course_records` stores academic attempts and grades, including a temporary `taking` snapshot created at final KRS. Official student-to-section enrollment is intentionally deferred.
- **D2 — Prerequisites are curriculum-scoped for now:** only verified links within the student's curriculum may be created. Source prerequisites that are still free text stay in manual review and are not guessed into `course_prerequisites`.
- **D3 — Instructors are document references only:** keep the documented instructor name for v2. Actual section-to-instructor assignment is deferred. Lecturer, faculty staff, and admin may verify documents and resolve course reports.

---

## Source-data quality (`Ekstrak/` real catalog)

Analysis of the five extracted curricula (369 rows, 265 distinct `kode_mk`) — drives import requirements:

- **47 codes span ≥2 programs**, 8 span all 5. The `courses` (global identity) vs `curriculum_courses` (program membership) split is load-bearing — do not collapse it.
- **Credit conflicts on shared codes are real:** `FID103` Fisika Dasar 1 is 2 SKS in some programs and 3 in others (`FID104` likewise). Schema absorbs this correctly because `credits_total` lives on `curriculum_courses`. Never move credits up to `courses`.
- **Identity errors needing human review before import:**
  - `MAA103` exists as both "Kalkulus 1"(2 SKS) and "Kalkulus 2"(3 SKS) — including twice inside the Nanoteknologi file.
  - `KKJ301` is "Magang"(18 SKS) in one program, "Magang Industri"(4) in another.
  - `RKK301` duplicated within the Robotika file.
- **Cosmetic drift, safe to canonicalize:** "Buddha"/"Budha", "Khonghucu"/"Konghucu", roman vs arabic numerals ("Katolik 1"/"Katolik I"), stray double spaces. Choose one canonical name per code at import.
- **Malformed code:** bare `PNJ` (no numeric suffix) appears in two files.
- **Program label inconsistency:** metadata mixes "S1 Rekayasa Nanoteknologi" with unprefixed names — normalize against `study_programs.program_name` at import.
- **Prerequisites are free text**, not codes. Hold unresolved entries for manual review and do not create guessed `course_prerequisites` links. Insert only verified same-curriculum relationships.

## Suggested patch sketch

Highest-value fixes, ready to adapt into a migration file. This is a sketch only; the DDL has not been executed.

```sql
-- 1. Fixed values and basic ranges
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'lecturer', 'faculty_staff', 'admin'));

ALTER TABLE class_schedules
  ADD CONSTRAINT class_schedules_day_check
    CHECK (day_of_week BETWEEN 1 AND 5),
  ADD CONSTRAINT class_schedules_time_check
    CHECK (start_time >= TIME '07:00'
       AND end_time <= TIME '17:00'
       AND end_time > start_time);

ALTER TABLE student_profiles
  ADD CONSTRAINT student_profiles_semester_check
    CHECK (current_semester BETWEEN 1 AND 8);
ALTER TABLE student_profiles ALTER COLUMN curriculum_id SET NOT NULL;
ALTER TABLE curriculum_courses
  ADD CONSTRAINT curriculum_courses_semester_check
    CHECK (recommended_semester BETWEEN 1 AND 8),
  ADD CONSTRAINT curriculum_courses_credits_check
    CHECK (credits_total BETWEEN 1 AND 24);
ALTER TABLE degree_plan_items
  ADD CONSTRAINT degree_plan_items_semester_check
    CHECK (planned_semester BETWEEN 1 AND 8);

-- admission_year must not be in the future; enforce that dynamic rule in the backend.
-- Backfill curriculum_courses.term before making it NOT NULL.
ALTER TABLE curriculum_courses ADD COLUMN term varchar(20);
ALTER TABLE curriculum_courses
  ADD CONSTRAINT curriculum_courses_term_check
    CHECK (term IN ('ganjil', 'genap'));

ALTER TABLE student_course_records ADD CONSTRAINT student_course_records_grade_check
  CHECK (final_grade IS NULL OR final_grade IN ('A', 'AB', 'B', 'BC', 'C', 'D', 'E'));
-- Use the same grade ordering/points for minimum_grade and GPA calculations.
-- Repeat the CHECK pattern for the remaining status/type columns from the comments.

-- 2. Retake attempts require an academic period
ALTER TABLE student_course_records ALTER COLUMN academic_period_id SET NOT NULL;

-- 3. FTMM does not use requirement-course groups for its IPS load rule
-- Drop requirement_group_courses before requirement_groups after any data review.
-- Store the IPS-to-maximum-SKS bands in a separate rule table.

-- 4. Active guards selected for v2
CREATE UNIQUE INDEX timetables_one_active_per_period
  ON timetables (user_id, academic_period_id) WHERE is_active;
CREATE UNIQUE INDEX degree_plans_one_active_per_user
  ON degree_plans (user_id) WHERE status = 'active';
-- Do not create one-active indexes for curricula or academic_periods.

-- 5. Cross-table curriculum and period consistency
-- Add timetable_items.academic_period_id and composite keys/FKs (or a trigger)
-- so every item matches both its timetable period and its class-section period.
-- Enforce profile curriculum = active degree-plan curriculum and reject
-- cross-curriculum degree-plan items. A trigger or composite FK is required.
-- Enforce curriculum_course.term against academic_periods.term and planned
-- semester parity with a trigger or mandatory backend validation.

-- 6. No course is its own prerequisite
ALTER TABLE course_prerequisites ADD CONSTRAINT course_prerequisites_no_self
  CHECK (curriculum_course_id <> prerequisite_curriculum_course_id);

-- 7. Live updated_at
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$ LANGUAGE plpgsql;
-- Attach the function to important entity tables.
-- Add a curriculum-change audit table for admin overrides.
```

The IPS rule is dynamic and depends on student records, so it should not be represented by a simple column `CHECK`. Keep all attempts, calculate IPS from records, and leave retake treatment and IPS rounding open until the academic policy is confirmed.

## Decisions log

- **Platform:** Docker PostgreSQL locally now; hosted provider TBD. H5 (RLS) deferred until client-facing hosting is chosen.
- **Roles:** one role per account: `student`, `lecturer`, `faculty_staff`, or `admin`. Lecturer, faculty staff, and admin may verify documents and resolve course reports.
- **Schedule:** Monday–Friday, 07:00–17:00, no overnight classes. A course has one fixed term, ganjil or genap, and planned semester parity is strict.
- **Academic load:** FTMM limits total semester SKS using the previous IPS; the first semester gets 24 SKS. IPS is calculated from course records and the rules live in a database table. IPS rounding remains open.
- **Requirement groups:** FTMM does not use minimum/maximum course counts for this rule. Remove `requirement_groups` and `requirement_group_courses` from the FTMM schema.
- **Retakes:** keep one record per attempt across periods; an attempt requires `academic_period_id`; a retake consumes semester SKS; keep `taking` as a temporary snapshot created at final KRS. The exact effect of a retake on the new semester's IPS remains open.
- **Grades:** accepted labels are `A`, `AB`, `B`, `BC`, `C`, `D`, `E`, with points 4, 3.5, 3, 2.5, 2, 1, 0. D is passing. Transfer credits count toward study completion but not IPS/IPK.
- **Curricula:** admission year 2024 and earlier uses curriculum 2021; 2025 and later uses curriculum 2025. Both remain available; older cohorts cannot be moved automatically. `curriculum_id` is required, admin overrides are audited, active degree plans must use the profile's curriculum, and historical course records keep their original curriculum relationship.
- **Timetables:** planner only for v2. Several alternatives may exist for one period, with at most one active; every item must match the timetable's academic period. Official section enrollment is deferred.
- **Prerequisites:** insert only verified same-curriculum links. Unresolved source text is held for manual review; no guessed foreign keys.
- **Catalog lifecycle:** catalog rows are not hard-deleted. Student accounts are deactivated and anonymized while academic records remain. Conflicting imports wait for manual review; non-conflicting shared course codes keep the global unique identity.
- **Capacity and instructors:** keep section capacity/status as future metadata; instructor data remains document references. Actual enrollment and section-to-instructor assignment are deferred.
- **Enum enforcement:** use database `CHECK`s for the fixed values, plus triggers/composite foreign keys or mandatory backend validation for rules that span tables.
