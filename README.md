# FTMM Compass

Academic-advisor web app for **FTMM — Fakultas Teknologi Maju dan Multidisiplin, Universitas Airlangga**. Students plan their degree, find courses, inspect prerequisite chains, check a weekly timetable, and chat with "Compass AI".

> **Status: frontend mockup.** Every screen is fully interactive, but there is no backend: login accepts any credentials, the AI replies from keyword rules, stats are hardcoded, and nothing persists across a page refresh.

## Features

| Page | What it does |
|---|---|
| **Login** | Cybercampus-style sign-in (simulated — any NIM/password works) |
| **Dashboard** | Progress stat cards (SKS, semester, IPK) + weekly schedule widget with conflict highlighting |
| **Course Finder** | Search/filter the course catalog (parity, SKS), quick-look modal, full detail view with an SVG prerequisite flow diagram |
| **Degree Planner** | 8-semester roadmap with drag & drop; compulsory courses lock to their semester and electives must respect odd/even parity; "Jadwal Aktif" timetable tab |
| **Compass AI** | Chat assistant with canned keyword responses (try *"rekomendasi"* or *"krs"*) |

## Tech stack

- [React 19](https://react.dev) + TypeScript 5.7
- [Vite 8](https://vite.dev) dev server/build
- [Tailwind CSS v4](https://tailwindcss.com) via `@tailwindcss/vite` — theme tokens live in `src/index.css`, no config file
- `lucide-react` icons, `clsx` + `tailwind-merge`

## Run it yourself

Prereqs: **Node.js 22** and **pnpm** (exact pins in `.mise.toml`; `mise install` sets both up if you use [mise](https://mise.jdx.dev)). npm works too — but pnpm-lock.yaml is authoritative.

```bash
git clone <this-repo> ftmm-compass-web
cd ftmm-compass-web
pnpm install
pnpm dev
```

Open **http://localhost:8443**, log in with anything (e.g. NIM `1621123456`).

Other commands:

```bash
pnpm build      # production bundle → dist/
pnpm preview    # serve the production build
PORT=3000 pnpm dev   # different port (default 8443, strict)
```

## Project structure

```
src/
├── main.tsx              # React entrypoint
├── App.tsx               # All top-level state: auth flag, active page, pending courses
├── data.ts               # Course catalog types + MOCK_COURSES + weekly SCHEDULE
├── index.css             # Tailwind v4 @theme: navy/gold/teal palette, Poppins/Inter/JetBrains Mono
├── utils.ts              # cn() class merger
└── pages/
    ├── Login.tsx
    ├── Dashboard.tsx
    ├── CourseFinder.tsx  # includes CourseDetailView + PrerequisiteDiagram
    ├── DegreePlanner.tsx # includes inline INITIAL_PLAN seed data
    ├── TimetableBuilder.tsx  # currently unreachable from the UI
    └── Chatbot.tsx
```

## Known limitations

Because this is a mockup, by design:

1. **Fake authentication** — any input logs you in after a 1s delay.
2. **No persistence** — your plan, added courses, and session vanish on reload.
3. **Hardcoded dashboard numbers** — they don't react to planner changes.
4. **Scripted chatbot** — two keyword rules plus a fallback answer.
5. **Tiny catalog** — 6 courses in `MOCK_COURSES`; the seeded plan references a few more that only exist inside `DegreePlanner.tsx`.
6. **TimetableBuilder page exists but isn't wired into the navigation** — its grid is duplicated in Dashboard and Degree Planner instead.
7. The displayed schedule conflict (Machine Learning × Data Visualization, Tuesday 10:00) is intentional demo data.

Roadmap note: the Figma Make integration (`.figma/` config + plugins in `vite.config.ts`) is planned for removal so the repo runs as a plain Vite app.

## For AI agents

See [AGENTS.md](./AGENTS.md) — architecture map, state contracts, design tokens, conventions, and tooling (codegraph index, LSP, browser verification).
