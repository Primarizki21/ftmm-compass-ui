# FTMM Compass — Agent Guide

Academic-advisor **mockup** for FTMM (Fakultas Teknologi Maju dan Multidisiplin), Universitas Airlangga. React 19 + Vite 8 + Tailwind CSS v4 SPA, frontend-only: **no backend, no persistence, all data mocked**. Born in Figma Make; standalone-cloneable.

## Classified data — `Ekstrak/`

`Ekstrak/*.json` holds the real FTMM course catalogs extracted from official faculty documents. Treat as classified:

- NEVER modify, rename, move, or delete anything inside `Ekstrak/`. Read-only analysis allowed.
- NEVER stage or commit it (it is gitignored — treat any appearance in `git status` as an accident to revert, not a change to add).
- NEVER copy its contents into `src/`, docs, commit messages, prompts, logs, or any external surface. Derived/cleaned copies live outside the folder.

## Commands

```bash
pnpm install        # deps (pnpm-lock.yaml is source of truth; .mise.toml pins node 22 + pnpm)
pnpm dev            # Vite on 0.0.0.0:$PORT (default 8443, strictPort)
pnpm build          # production build to dist/
pnpm preview        # serve dist/
pnpm format         # oxfmt
```

Inside Figma Make a dev server is already running on `$PORT`; in a normal clone you start it yourself. `vite.config.ts` requires `.figma/make/site.json` at import time — it is committed; do not delete it until the planned Figma-Make decoupling lands.

## Database baseline — v2

`RANCANGAN DIAGRAM AWAL.sql` is a PostgreSQL 16 baseline, not a runtime migration. The React app does not connect to it: there is no backend, migration runner, or database persistence yet. `SCHEMA_REVIEW.md` is the decision record behind the baseline.

Current database contract:
- `users.role` is exactly one of `student`, `lecturer`, `faculty_staff`, or `admin`.
- FTMM class schedules are Monday–Friday, 07:00–17:00; `end_time` must be later than `start_time`.
- `current_semester`, `recommended_semester`, and `planned_semester` are 1–8; course credits are 1–24.
- Grades are `A`, `AB`, `B`, `BC`, `C`, `D`, `E`, mapped to 4, 3.5, 3, 2.5, 2, 1, 0; D is passing. Transfer credits do not affect IPS/IPK.
- Curriculum 2021 applies to admission year 2024 and earlier; curriculum 2025 applies from 2025 onward. Both remain available, and admin overrides are audited. Historical course records keep their original curriculum.
- `degree_plan_items` is the long-term plan. `timetable_items` is a personal planner with alternative timetables and at most one active timetable per period. `student_course_records` stores attempts/grades; `taking` is a temporary snapshot at final KRS. Official section enrollment is not modeled yet.
- Each curriculum course has one fixed term (`ganjil` or `genap`); planned-semester parity and timetable period/term consistency are strict.
- `requirement_groups` is not part of the FTMM v2 model. Semester SKS limits are a separate database rule table based on the previous IPS; semester one defaults to 24 SKS.
- Catalog rows are retained rather than hard-deleted. Unresolved prerequisites and conflicting source imports wait for manual review. Capacity/status fields are future enrollment metadata; instructor rows are document references only.

Implementation notes:
- Retake IPS behavior and IPS rounding are intentionally unresolved. Keep all attempts and do not hard-code either calculation until academic policy is confirmed.
- Rules spanning tables require composite foreign keys, triggers, or mandatory backend validation; a column `CHECK` cannot enforce them alone.
- Validate the baseline against PostgreSQL 16 before changing it. Test invalid role/day/time/grade, cross-period timetable items, cross-curriculum plan items, term/parity mismatches, and duplicate active plans/timetables.
- Do not modify or expose `Ekstrak/`; it is classified source data.


## Architecture

No router. `src/App.tsx` owns all top state and swaps pages via `useState<Page>`:

```
main.tsx → App.tsx ─┬─ isLoggedIn=false → pages/Login.tsx (fake auth: any input, 1s delay)
                    └─ sidebar nav (useState) ─┬─ Dashboard       (stats + timetable widget)
                                               ├─ CourseFinder    (search/filter/modal/CourseDetailView/PrerequisiteDiagram)
                                               ├─ DegreePlanner   (drag-drop roadmap + timetable tab)
                                               └─ Chatbot         (keyword-matched canned replies)
```

State contract (App.tsx):
- `pendingCourses: Course[]` — courses added in CourseFinder, consumed by DegreePlanner.
- DegreePlanner auto-files `Wajib` (compulsory) courses into their fixed semester via `useEffect`, keeps `Pilihan` (elective) in a drag bank; drops are parity-constrained (`odd`→semesters 1/3/5/7, `even`→2/4/6/8).
- Nothing survives reload.

Data lives in two places (known fragmentation): catalog + schedule in `src/data.ts` (`MOCK_COURSES`: 6 courses, `SCHEDULE`: 4 items with one **intentional** conflict II4042×II4045 Selasa 10:00 that drives conflict UI); semester-plan seed inline in `DegreePlanner.tsx` `INITIAL_PLAN` (courses MA1101/FI1101/MA1201/IF1210 exist only there).

## Design system

Tailwind v4 `@theme` in `src/index.css` — no tailwind.config. Palette: navy `#0f3e32`, gold `#d7b03d`, teal `#93f08e`, orange/danger `#ad5712`, warm off-white bg `#faf9f7`. Fonts: headings Poppins (`--font-serif`), body Inter, mono JetBrains Mono (Google Fonts @import). Use tokens as utilities (`bg-navy`, `text-gold`, …) — never hardcode hex in JSX. Class merging helper: `cn()` in `src/utils.ts`.

## Code conventions

- Default exports for components.
- Double-quote strings containing apostrophes (or escape them) — unescaped `'` in single quotes breaks the build.
- Closed tags, balanced braces; UI text is Indonesian, code identifiers English.
- Format with `pnpm format` before handing off; no linter/test suite exists.

## Known mock boundaries (intentional — do not "fix" silently)

| Symptom | Reality |
|---|---|
| Login accepts anything | Auth is simulated (`Login.tsx`) |
| Chatbot answers 2 topics only | Keyword rules in `Chatbot.tsx` (`data science|rekomendasi`, `krs|planning`) |
| Dashboard numbers never move | Hardcoded (84/144 SKS, IPK 3.75, sem 5) |
| `TimetableBuilder.tsx` unreachable | Orphaned by design decision 2026-08-26; its grid is duplicated in Dashboard widget + DegreePlanner tab |
| Schedule shows a clash | Seeded deliberately to demo conflict styling |

Planned future work (user-stated): remove the Figma Make integration (`.figma/`, plugins in `vite.config.ts`) entirely.

## Tools for agents
- **codegraph** (indexed; `.codegraph/` gitignored): query architecture/symbols/call-paths first via the `codegraph_explore` MCP tool with `projectPath` = this repo root. Refresh after substantial changes: `~/.codegraph/versions/v1.5.0/bin/codegraph init .`
- **LSP**: TypeScript server available — use for definitions/references/rename instead of text search.
- **Browser**: verify UI changes against the real surface. Flow: open `http://localhost:8443` → submit login form (any values) → nav buttons are `nav button:nth-of-type(1..4)` in order Dashboard/Course Finder/Degree Planner/Compass AI.
- **grep/read**: fallback for everything else; `src/` is small (~1.9k lines across 11 TS/TSX files).
