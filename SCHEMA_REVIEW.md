# Schema Review — `RANCANGAN DIAGRAM AWAL.sql`

Scope: 21 tables, 33 foreign keys, 14 indexes. Static review — DDL was not executed against a live PostgreSQL instance.

## Verdict

Normalization is good: surrogate UUID keys, proper junction tables, no JSON blobs, no duplicated facts. The skeleton is sound. The problems are systemic, not structural:

1. **No data-validation layer.** ~16 free-text `varchar` columns carry enumerations that exist only as SQL comments. The database accepts any value.
2. **No lifecycle guarantees.** `is_active` flags, `updated_at`, validity windows, min/max rules — all depend on application discipline.
3. **Some parent-child consistency is impossible to express with the current FK shape.**
4. **Index gaps on reverse lookups.**

---

## HIGH

### H1 — Zero CHECK constraints
Every enumeration, range, and ordering rule is unenforced:
- `users.role` accepts `'banana'`.
- `class_schedules.day_of_week` accepts `0` or `99` (doc says 1–7).
- `class_schedules.end_time <= start_time` is legal.
- `requirement_groups.minimum_courses > maximum_courses` is legal.
- Negative `credits_total`, `current_semester`, `admission_year` are legal. User Input: ok goood

Fix: `CHECK` constraints (or domains) on ~16 enum columns + numeric ranges. Cheap now, painful after data exists.
User Input: users.role i think is only student, lecturer, Facullty staf (Tendik or tenaga didik fakultas i think), and admin. class_schedules.day_of_week i think only until Monday until Friday. if start time start at 7 AM and end at 9 AM, it should but end_time >= start_time? (by number wise?). for maximum or minimum courses is determined by the SKS point, it determined by stundet IPS, here's the SKS rule
IPS < 2,00: Maksimal mengambil 15 SKS.IPS 2,00 – 2,50: Maksimal mengambil 18 SKS.IPS 2,51 – 3,00: Maksimal mengambil 20 SKS.IPS > 3,00: 24 SKS.

### H2 — Nullable column defeats its own UNIQUE index
`student_course_records.academic_period_id` is nullable but part of `UNIQUE (user_id, curriculum_course_id, academic_period_id)`. In PostgreSQL, NULLs are distinct in unique indexes, so unlimited duplicate `(user, course, NULL)` rows are allowed — dedup silently fails exactly where the period is unknown.

Decision: retakes confirmed — one record per attempt across periods, best score counts toward IPK. Keep the unique key shape and make `academic_period_id` NOT NULL (an attempt without a period is meaningless). "Best score wins" is a query-time rule (`MAX(final_grade)` per course); never prune losing attempts.

### H3 — Timetable can hold sections from a foreign period
`timetable_items → class_sections` and `timetables.academic_period_id` are independent chains. Nothing forces `class_sections.academic_period_id = timetables.academic_period_id`. A 2025/ganjil timetable can contain a 2023/genap section.

Fix: add `academic_period_id` to `timetable_items` and use a composite FK back to `(timetable_id, academic_period_id)` on `timetables`, or enforce via trigger.

### H4 — Curriculum mixing is unconstrained
- `degree_plan_items.curriculum_course_id` is not checked against `degree_plans.curriculum_id`.
- `student_course_records` has no curriculum anchor at all.
- Same pattern for `timetable_items` via `class_sections`.

With multiple curriculum generations in the catalog, rows can silently combine curricula (profile says 2021, record points at the 2024 row of the same course).

Fix: propagate `curriculum_id` down and add composite FKs, or accept app-level enforcement knowingly.

### H5 — No RLS / grants / policies (conditional)
Decision: local Docker PostgreSQL first, hosted provider later. With backend-only DB access, RLS is not required today.

Trigger condition: the moment tables are exposed directly to clients (Supabase-style provider), enable RLS + owner-only policies on all user-data tables (`degree_plans`, `student_course_records`, `timetables`, `course_reports`) and make `users.role` writable only by the service role — otherwise cross-user data leaks and privilege escalation. Keep DDL vanilla PostgreSQL meanwhile so the dump migrates to any host unchanged.

---

## MEDIUM

### M1 — `updated_at` never updates
`DEFAULT now()` fires on INSERT only. Six tables (`users`, `student_profiles`, `courses`, `curriculum_courses`, `degree_plans`, `timetables`) have permanently stale `updated_at`.

Fix: one `BEFORE UPDATE` trigger function, attached to those six tables.

### M2 — "Exactly one active" is unguarded
Multiple rows can be active simultaneously:
- active `curricula` per program,
- active `academic_periods` (globally),
- `timetables.is_active` per (user, period),
- `degree_plans.status = 'active'` per user.

Fix: partial unique indexes, e.g. `CREATE UNIQUE INDEX ON curricula (study_program_id) WHERE is_active;`

### M3 — Prerequisite graph unprotected
Self-loop is legal today (`curriculum_course_id = prerequisite_curriculum_course_id`). Longer cycles (A↔B) cannot be prevented declaratively.

Fix: `CHECK (curriculum_course_id <> prerequisite_curriculum_course_id)` now; detect longer cycles app-side (recursive CTE at write time).

### M4 — No delete strategy
All 33 FKs are `NO ACTION` (deferrable). Deleting one curriculum requires ordered deletes across ≥8 child tables. No edge documents a `CASCADE`/`SET NULL` choice.

Fix: decide per-edge delete behavior (catalog edges: RESTRICT; owned data like plan items: CASCADE), and document the seed order the deferrable FKs imply.

### M5 — Missing FK-side indexes
PostgreSQL does not auto-index the referencing side. Reverse lookups and FK checks scan full tables on:
`class_schedules.class_section_id`, `timetable_items.class_section_id`, `curriculum_courses.course_id`, `requirement_group_courses.curriculum_course_id`, `course_prerequisites.prerequisite_curriculum_course_id`, `class_sections.curriculum_course_id`, `course_reports.user_id` / `.curriculum_course_id`, `student_profiles.study_program_id` / `.curriculum_id`, `course_instructor_references.curriculum_course_id`, `student_course_records.academic_period_id`.

Fix: index the ones real queries hit (per-section schedule, per-course usage, per-user reports).

### M6 — Grade domain undefined
`final_grade` and `course_prerequisites.minimum_grade` are `varchar(5)` with no scale. UNAIR uses A/B+/B/C+/C/D/E; `'zz'` is currently a passing grade as far as the DB cares. Server-side IPK and prereq checks degrade to string comparison.

Fix: CHECK IN-list or lookup table + grade-point mapping.

### M7 — Group bounds never consumed
`requirement_groups.minimum_courses/maximum_courses` are stored but nothing validates membership count. A group of 10 members with `maximum_courses = 1` is storable.

Acceptable if app-enforced by design — recorded here so it is a decision, not an oversight.

### M8 — `capacity` is decorative
No enrollment fact links students to `class_sections` (`timetable_items` is a personal planner, not enrollment). Capacity and `enrollment_status` can never be evaluated against reality.

Fix: add a `section_enrollments` table when real KRS integration lands, or drop `capacity` until then.

Decision: timetables become the personal KRS planner later, with multiple alternative folds per period ("fold 1" default plan, "fold 2" internship variant, ...). Current schema already fits: `UNIQUE (user_id, academic_period_id, timetable_name)` permits many folds per period; use `is_active` to mark the chosen fold (pairs with the M2 partial index). Stays planner-only until real enrollment exists.

---

## LOW

| # | Finding | Fix |
|---|---------|-----|
| L1 | All indexes unnamed → auto-generated names, painful future `DROP ... IF EXISTS`. | Name every index. |
| L2 | Audit columns inconsistent: `student_profiles` has no `created_at`; `course_learning_outcomes`, `course_instructor_references`, `course_prerequisites`, `requirement_groups`, `requirement_group_courses`, `academic_periods`, `class_schedules` have neither timestamp. | Standardize. |
| L3 | `source_documents.verified_by_user_id` and `last_verified_at` settable independently (verifier without date, date without verifier). | `CHECK ((a IS NULL) = (b IS NULL))` or merge into one status. |
| L4 | ~16 varchar enum columns (roles, statuses, types, scopes, terms) documented in comments only. | CHECKs now; native ENUMs/lookup tables when stable. |
| L5 | `gen_random_uuid()` needs PG 13+ (or `pgcrypto`). | Moot with Docker `postgres:16+`; pin the image tag explicitly. |
| L6 | `room_name` free text; no room/schedule overlap prevention (no `EXCLUDE` constraint). Double-bookings undetectable. | Fine for planner-only scope; revisit if rooms matter. |
| L7 | `curricula UNIQUE (study_program_id, curriculum_year)` forbids two revisions in one year, yet `valid_from/valid_until` imply range logic. | Confirm one-curriculum-per-year is the rule. |
| L8 | RESOLVED with real data — `Ekstrak/` catalogs hold 265 distinct codes and **47 of them are shared across programs** (8 in all 5: e.g. `TNM101`, `AGI101`, `NOP103`, `SIP107`, `MNM106`). Shared MKWU/faculty courses are the norm, not the exception. | Keep global UNIQUE — required so shared courses stay single entities referenced by many curricula. Import must MERGE by code, never blind-insert. Add format CHECK `kode ~ '^[A-Z]+[0-9]{3,4}$'` to catch malformed entries like the bare `PNJ`. |

---

## Design tensions (not bugs — decide consciously)

- **D1 — Three overlapping "what am I taking" stores:** `degree_plan_items.item_status`, `student_course_records.record_status`, `timetable_items`. Sync contract undefined; which is source of truth at which lifecycle stage? Suggested pipeline: plan item → record → section booking.
- **D2 — Prerequisites are curriculum-scoped:** the same logical prereq is duplicated per curriculum generation and drifts independently. Recognizing old `MA1101` ≡ new `MA1101` requires `course_code` comparison, which FKs do not give you. Consider prereq-by-`course_id` + applicability window. Source data reinforces this: `prasyarat` in `Ekstrak/` is free text ("Matematika"), so resolution should happen once against the global `courses` table, not per curriculum.
- **D3 — Instructors are document references only** (per column comment: not actual schedules). Section ↔ instructor assignment is unrepresentable. Fine for V0.1; flagged so it is not forgotten.

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
- **Prerequisites are free text**, not codes. Loading them into `course_prerequisites` needs fuzzy/manual resolution; import them with `verification_status='unverified'` (the schema default) until confirmed.

## Suggested patch sketch

Highest-value fixes, ready to adapt into a migration file:

```sql
-- 1. Rule inside the database: fixed-value columns (same pattern for all ~16 enum columns)
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'admin', 'reviewer'));
ALTER TABLE class_schedules ADD CONSTRAINT class_schedules_day_check
  CHECK (day_of_week BETWEEN 1 AND 7),
  ADD CONSTRAINT class_schedules_time_check CHECK (end_time > start_time);
ALTER TABLE requirement_groups ADD CONSTRAINT requirement_groups_bounds_check
  CHECK (minimum_courses <= maximum_courses);
ALTER TABLE curriculum_courses ADD CONSTRAINT curriculum_courses_credits_check
  CHECK (credits_total BETWEEN 1 AND 24);
-- grade scale: adjust list to FTMM's exact letters
ALTER TABLE student_course_records ADD CONSTRAINT student_course_records_grade_check
  CHECK (final_grade IS NULL OR final_grade IN ('A', 'AB', 'B+', 'B', 'C+', 'C', 'D', 'E'));

-- 2. Retake model: an attempt must have a period
ALTER TABLE student_course_records ALTER COLUMN academic_period_id SET NOT NULL;

-- 3. Exactly-one-active guards
CREATE UNIQUE INDEX curricula_one_active_per_program ON curricula (study_program_id) WHERE is_active;
CREATE UNIQUE INDEX academic_periods_one_active ON academic_periods ((1)) WHERE is_active;
CREATE UNIQUE INDEX timetables_one_active_per_period ON timetables (user_id, academic_period_id) WHERE is_active;

-- 4. No course is its own prerequisite
ALTER TABLE course_prerequisites ADD CONSTRAINT course_prerequisites_no_self
  CHECK (curriculum_course_id <> prerequisite_curriculum_course_id);

-- 5. Live updated_at: one function, attached per table
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$ LANGUAGE plpgsql;
CREATE TRIGGER users_touch BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
-- repeat the CREATE TRIGGER for student_profiles, courses, curriculum_courses,
-- degree_plans, timetables
```

## Decisions log

- **Platform:** Docker PostgreSQL locally now; hosted provider TBD. H5 (RLS) deferred until client-facing hosting is chosen.
- **Retakes:** multiple attempts allowed, best score counts. Resolves H2 direction: `academic_period_id` NOT NULL, unique-key shape unchanged.
- **Course codes:** global UNIQUE kept and re-confirmed against the real `Ekstrak/` catalog — 47 cross-program shared codes make merge-by-code mandatory. L8 closed.
- **Timetables:** future multi-fold KRS planner; schema fits unchanged.
- **Enum enforcement:** CHECK constraints inside the database (author choice). Closes L4; concrete statements in the patch sketch above.
