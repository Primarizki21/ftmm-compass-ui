# FTMM Compass UI — Design System Documentation

This document specifies the design system implemented in **FTMM Compass UI**, an academic advisor single-page application mockup for the Faculty of Advanced Technology and Multidiscipline (FTMM), Universitas Airlangga (UNAIR). All tokens, utility classes, component patterns, and mock boundaries documented here reflect the codebase as implemented.

---

## 1. Design Language & Principles

The visual language balances academic rigor and modern institutional identity:

* **Academic Authority & Heritage:** The primary palette utilizes deep forest navy (`#0f3e32`) paired with academic gold (`#d7b03d`) to convey institutional credibility and prestige aligned with Universitas Airlangga guidelines.
* **Cybercampus UNAIR Alignment:** Typography specifically aligns with the Cybercampus UNAIR web experience by utilizing *Poppins* for headings (defined under `--font-heading` in `src/index.css`) and *Inter* (`--font-sans`) for legible interface copy.
* **Clarity & Spatial Hierarchy:** Clean surface backgrounds (`#ffffff`), tinted neutral canvas (`#faf9f7`), subtle structural borders (`#e5e7eb`), and distinct status highlights guide students through complex academic planning tasks.
* **Utility-First Token Discipline:** Styles are strictly driven by Tailwind CSS v4 `@theme` tokens in `src/index.css` and composed via the `cn()` utility (`src/utils.ts`). Hardcoded hex values in JSX component class names are avoided.

---

## 2. Color System

### 2.1 Core Palette Tokens

All colors are declared in `src/index.css` within the `@theme` block.

| Token Name | Hex Value | Tailwind Utilities | Semantic Role | Primary Usage Locations |
| :--- | :--- | :--- | :--- | :--- |
| `--color-navy` | `#0f3e32` | `bg-navy`, `text-navy`, `border-navy`, `ring-navy` | Primary brand background, heading typography, primary CTA | `src/App.tsx`, `src/pages/Login.tsx`, `src/pages/CourseFinder.tsx` |
| `--color-navy-light` | `#165a49` | `bg-navy-light`, `text-navy-light`, `border-navy-light` | Active sidebar nav item, primary button hover, secondary container | `src/App.tsx`, `src/pages/Login.tsx` |
| `--color-navy-dark` | `#08221b` | `bg-navy-dark`, `text-navy-dark` | Deepest brand baseline, high-contrast text on teal surfaces | `src/App.tsx`, `src/pages/Chatbot.tsx` |
| `--color-gold` | `#d7b03d` | `bg-gold`, `text-gold`, `border-gold`, `ring-gold` | Academic accent, active filter pills, focus rings, planned course badges | `src/App.tsx`, `src/pages/CourseFinder.tsx`, `src/pages/DegreePlanner.tsx` |
| `--color-gold-hover` | `#c09d35` | `bg-gold-hover`, `text-gold-hover` | Darkened gold for interactive hover states | `src/index.css` (hover use only; badge text uses `text-navy` for contrast) |
| `--color-teal` | `#93f08e` | `bg-teal`, `text-teal`, `border-teal`, `ring-teal` | Positive feedback, SKS progress bars, completed indicators, user bubbles | `src/pages/Dashboard.tsx`, `src/pages/Chatbot.tsx`, `src/pages/CourseFinder.tsx` |
| `--color-teal-light` | `#b3f5b0` | `bg-teal-light`, `text-teal-light` | Subtitle text on dark surfaces, icon tints on dark panels | `src/App.tsx`, `src/pages/Login.tsx`, `src/pages/Chatbot.tsx` |
| `--color-teal-dark` | `#6bd465` | `bg-teal-dark`, `text-teal-dark` | Icon tints on light surfaces (IPK trend icon) | `src/pages/Dashboard.tsx` (icon only; badge text uses `text-navy` for contrast) |
| `--color-orange` | `#ad5712` | `bg-orange`, `text-orange` | Base warm accent | `src/index.css` |
| `--color-background` | `#faf9f7` | `bg-background` | Warm tinted off-white application canvas | `src/index.css`, `src/App.tsx`, `src/pages/Login.tsx` |
| `--color-surface` | `#ffffff` | `bg-surface` | Pure white container surfaces, cards, modals, topbar | `src/App.tsx`, `src/pages/Dashboard.tsx`, `src/pages/CourseFinder.tsx` |
| `--color-foreground` | `#2d333a` | `text-foreground` | Slate-charcoal primary body and label copy | `src/index.css`, `src/App.tsx`, `src/pages/Login.tsx` |
| `--color-muted` | `#6b7280` | `text-muted`, `border-muted` | Neutral secondary text, metadata timestamps, placeholder icons | `src/App.tsx`, `src/pages/Dashboard.tsx`, `src/pages/CourseFinder.tsx` |
| `--color-border` | `#e5e7eb` | `border-border`, `divide-border` | Subtle boundary lines, card borders, grid dividers | `src/App.tsx`, `src/pages/Dashboard.tsx`, `src/pages/DegreePlanner.tsx` |

### 2.2 Status & Functional Aliases

| Token Name | Aliased Target | Hex Value | Semantic Function | Example In-Code Usage |
| :--- | :--- | :--- | :--- | :--- |
| `--color-warning` | `--color-gold` | `#d7b03d` | Cautionary state, timetable conflict event styling | `bg-warning/20 text-navy border-warning/50` (`src/data.ts`) |
| `--color-danger` | `--color-orange` | `#ad5712` | Schedule clash alert, invalid drop highlight, notification badge | `bg-danger/10 text-danger border-danger/30` (`src/components/TimetableGrid.tsx`) |

### 2.3 Opacity & Surface Tint Conventions

The UI leverages Tailwind alpha modifiers for layered depth:
* `bg-navy/8` or `bg-navy/10`: Subtle institutional badge background for required courses (`src/pages/CourseFinder.tsx`).
* `bg-gold/10` or `bg-gold/20`: Elective course badge tints and modal pill backgrounds (`src/pages/CourseFinder.tsx`).
* `bg-teal/10` or `bg-teal/20`: Completed status pill backgrounds and timetable event blocks (`src/pages/Dashboard.tsx`, `src/data.ts`).
* `bg-danger/10`: Unified conflict notification banners (`src/components/TimetableGrid.tsx`) and invalid drag-over cells (`src/pages/DegreePlanner.tsx`).
* `bg-white/10` with `backdrop-blur-sm`: Glassmorphism header pills over dark navy backgrounds (`src/pages/CourseFinder.tsx`).

---

## 3. Typography

### 3.1 Font Families & Loaded Weights

Google Fonts loaded in `src/index.css` (`@import url(...)`):

| Token | Family Name | Weights Loaded | Fallback | Primary Usage |
| :--- | :--- | :--- | :--- | :--- |
| `--font-heading` | `Poppins` | 300, 400, 500, 600, 700, 800 | `sans-serif` | Headings `h1` through `h6`, brand title, modal hero text |
| `--font-sans` | `Inter` | 300, 400, 500, 600, 700 | `sans-serif` | Application body text, buttons, form inputs, navigation items |
| `--font-mono` | `JetBrains Mono` | 400, 500, 600 | `monospace` | Course codes, NIM, timestamps, credits indicators, workload stats |

### 3.2 Base Layer Configuration

Declared in `src/index.css` `@layer base`:
```css
body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}
```

### 3.3 Type Scale & Observed Hierarchy

| Class Pattern | Size / Leading | Weight | Font Token | Found In |
| :--- | :--- | :--- | :--- | :--- |
| `text-4xl font-heading font-bold leading-tight` | 36px / 1.25 | 700 | `Poppins` | Login hero heading (`src/pages/Login.tsx`) |
| `text-3xl font-heading font-bold` | 30px / 1.25 | 700 | `Poppins` | Dashboard stat counters (`src/pages/Dashboard.tsx`), CourseDetailView title (`src/pages/CourseFinder.tsx`), Login form title |
| `text-2xl font-heading font-bold` | 24px / 1.3 | 700 | `Poppins` | Topbar header (`md:text-2xl` in `src/App.tsx`), modal course title (`src/pages/CourseFinder.tsx`) |
| `text-xl font-heading font-bold` | 20px / 1.4 | 700 | `Poppins` | Topbar mobile title, workload metrics (`src/pages/CourseFinder.tsx`) |
| `text-lg font-heading font-bold` | 18px / 1.4 | 700 | `Poppins` | Section titles, widget headers (`src/pages/Dashboard.tsx`, `src/pages/DegreePlanner.tsx`, `src/pages/Chatbot.tsx`) |
| `text-base font-medium` | 16px / 1.5 | 500 | `Inter` | Primary interactive buttons, large modal copy |
| `text-sm font-medium` / `text-sm text-foreground` | 14px / 1.5 | 400 / 500 | `Inter` | Standard body copy, form inputs, nav items, course descriptions |
| `text-xs font-mono font-bold` | 12px / 1.4 | 700 | `JetBrains Mono` | Course identifiers (`II4042`), NIM (`1621123456`), timetable codes |
| `text-xs text-muted` | 12px / 1.4 | 400 | `Inter` | Secondary metadata labels, semester descriptors, helper copy |
| `text-[10px]` / `text-[9px]` / `text-[8px]` | 8-10px | 600 / 700 | Mixed | Progress percentage, compact badges, workload sub-labels |

---

## 4. Layout & Structure

### 4.1 Application Shell (`src/App.tsx`)

The application layout is structured as a full-viewport responsive layout:
* **Root Container:** `flex h-screen w-full bg-background overflow-hidden font-sans text-foreground`.
* **Sidebar (`<aside>`):** Fixed-width `w-64` (`min-w-[16rem]`) rendered with `bg-navy text-white`. On mobile (`<768px`), it acts as an off-canvas drawer (`absolute z-20`) with a backdrop overlay (`fixed inset-0 bg-black/50 backdrop-blur-sm md:hidden`). On desktop (`md:`), it transitions smoothly between open and collapsed states (`transition-all duration-300 ease-in-out`).
* **Header Bar (`<header>`):** Fixed height `h-16 bg-surface border-b border-border flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-0`. Houses the sidebar toggle (`Menu`), dynamic page title, notification bell with unread dot, and academic term pill (`Semester Ganjil 2024/2025 · Week 4`).
* **Content Viewport (`<main>`):** Scrollable main canvas `flex-1 flex flex-col h-full overflow-hidden relative` containing an inner bounded wrapper `max-w-7xl mx-auto h-full p-4 md:p-8`.

### 4.2 Card & Container Conventions

* **Standard Surface Card:** `bg-surface rounded-xl border border-border shadow-sm`.
* **Interactive Hover Card:** `bg-surface rounded-xl border border-border p-4 hover:border-gold hover:shadow-md transition-all`.
* **Decorative Blur Orbs:** Ambient radial gradients positioned in container corners (e.g. `w-24 h-24 bg-teal-light/10 rounded-full blur-2xl group-hover:bg-teal-light/20 transition-colors` in `src/pages/Dashboard.tsx`).

---

## 5. Component Inventory by Surface

### 5.1 App Shell & Sidebar (`src/App.tsx`)

| Component | Styling & Classes | Behavior & States |
| :--- | :--- | :--- |
| **Sidebar Brand Emblem** | `w-10 h-10 rounded-full bg-gold/10 text-gold border border-gold/30` | Hover triggers compass rotation: `group-hover:rotate-180 transition-transform duration-700` |
| **Navigation Item** | `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200` | Active: `bg-navy-light border-l-4 border-gold text-white`. Inactive: `text-muted hover:text-white hover:bg-navy-light/50 border-l-4 border-transparent` |
| **User Profile Footer** | `flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-navy-light/50 text-teal-light hover:text-white` | Avatar in `bg-teal text-navy-dark` (13:1 AAA contrast); NIM in `font-mono text-muted`; logout trigger with `hover:text-danger` |
| **Notification Bell** | `p-2 text-muted hover:text-navy hover:bg-background rounded-lg relative` | Fixed unread ping indicator: `w-2 h-2 bg-danger rounded-full border border-surface absolute top-1.5 right-1.5` |

### 5.2 Login Surface (`src/pages/Login.tsx`)

| Component | Styling & Classes | Behavior & States |
| :--- | :--- | :--- |
| **Branding Panel** | `hidden lg:flex w-1/2 bg-navy relative p-12 overflow-hidden` | Background photo with `opacity-20 mix-blend-overlay` and gradient overlay `bg-gradient-to-t from-navy via-navy/80 to-transparent` |
| **Input Fields** | `w-full pl-10 pr-4 py-3 rounded-xl border border-border outline-none transition-all` | Focus state: `focus:border-gold focus:ring-1 focus:ring-gold`; leading icon in `text-muted` |
| **Submit Button** | `w-full py-3 px-4 bg-navy hover:bg-navy-light text-white rounded-xl font-medium transition-all` | Focus state: `focus:ring-2 focus:ring-offset-2 focus:ring-navy`; Loading state: `disabled:opacity-70` with CSS spinner `animate-spin` |

### 5.3 Dashboard Surface (`src/pages/Dashboard.tsx`)

| Component | Styling & Classes | Behavior & States |
| :--- | :--- | :--- |
| **Metric Stat Cards** | `bg-surface rounded-xl p-5 border border-border shadow-sm relative overflow-hidden group` | 4-column responsive grid (`grid-cols-2 lg:grid-cols-4 gap-4`); animated progress track (`bg-border h-1.5 rounded-full` with `bg-teal`) |
| **Timetable Widget** | `bg-surface rounded-xl border border-border shadow-sm overflow-hidden` | Uses shared `TimetableGrid` component (`src/components/TimetableGrid.tsx`) with `compact` prop; bounded at `max-height: 420px` |
| **Inline Conflict Alert** | `bg-danger/10 border border-danger/30 rounded-xl p-4 flex items-start gap-3` | Unified conflict banner style rendered by `TimetableGrid`; includes direct navigation link to Degree Planner |

### 5.4 Course Finder Surface (`src/pages/CourseFinder.tsx`)

| Component | Styling & Classes | Behavior & States |
| :--- | :--- | :--- |
| **Search & Filter Bar** | `bg-surface rounded-xl border border-border shadow-sm p-4 space-y-3` | Search input with `Search` icon; program filter pills (`bg-gold text-white` active); parity/SKS filter pills (`bg-navy text-white` active) |
| **Course Catalog Cards** | `bg-surface rounded-xl border border-border p-4 cursor-pointer hover:border-gold hover:shadow-md transition-all` | Type pill (`bg-navy/8 text-navy` for Wajib vs `bg-gold/10 text-navy` for Pilihan); parity pill (`bg-teal/10 text-navy` vs `bg-gold/10 text-navy`) |
| **Course Quick Modal** | `fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm` | Dialog card `bg-surface rounded-2xl shadow-2xl max-w-md animate-in zoom-in-95`; 3-column workload stat summary |
| **Full Detail View** | `h-full flex flex-col animate-in fade-in duration-300` | Replaces catalog view on drill-down; navy hero header with `ArrowLeft` back action, description card, workload card, and prerequisite diagram |
| **Prerequisite Diagram** | SVG container with dynamic bezier curves (`M... C...`) and markers | Node hierarchy: Base prereq (`#f9fafb`), Direct prereq (`#f0fdf8`, border `#93f08e`), Target course (`#0f3e32`, border `#d7b03d`) |

### 5.5 Degree Planner Surface (`src/pages/DegreePlanner.tsx`)

| Component | Styling & Classes | Behavior & States |
| :--- | :--- | :--- |
| **Tab Switcher** | `bg-background p-1 rounded-xl border border-border w-fit` | Active tab: `bg-navy text-white shadow-sm`; Inactive: `text-muted hover:text-navy` |
| **Semester Columns** | `w-[256px] rounded-xl flex flex-col flex-shrink-0 border transition-all duration-150` | 8-column horizontal scroll rail with interactive drag-and-drop states (see Section 6.2) |
| **Placed Course Card** | `p-3 rounded-lg border bg-surface flex gap-2 group transition-shadow hover:shadow-md select-none` | Completed: `border-teal-light/50`; Planned: `border-gold/50` + `Clock`; Locked: `border-navy/20` + `Lock`; Wishlist: `border-dashed border-border` |
| **Pilihan Course Bank** | `bg-surface rounded-xl border border-gold/40 p-3 cursor-move w-[196px]` | Horizontal tray at bottom for unplaced elective courses; drag handle `GripVertical` revealed on hover |

### 5.6 Compass AI Chatbot Surface (`src/pages/Chatbot.tsx`)

| Component | Styling & Classes | Behavior & States |
| :--- | :--- | :--- |
| **Chat Header** | `p-4 border-b border-border bg-navy text-white relative overflow-hidden` | Houses `Sparkles` icon in `bg-white/10` and status label `Online • Powered by FTMM` |
| **User Message Bubble** | `p-4 rounded-2xl rounded-tr-none text-sm leading-relaxed bg-teal text-navy-dark shadow-sm` | Right-aligned container with avatar in `bg-teal text-navy-dark` (13:1 AAA contrast) |
| **Assistant Message Bubble** | `p-4 rounded-2xl rounded-tl-none text-sm leading-relaxed bg-surface border border-border text-foreground shadow-sm` | Left-aligned container with avatar in `bg-navy text-white` |
| **Suggestion Chips** | `px-3 py-1.5 bg-surface border border-border rounded-full text-xs font-medium text-navy hover:border-navy hover:text-navy` | Displayed when message history length is 1; clicking fills input field |
| **Chat Input Area** | `p-4 bg-surface border-t border-border` | Rounded-xl input with embedded send button (`bg-navy hover:bg-navy-light text-white disabled:opacity-50`) |

### 5.7 Orphaned Components Note

* **`src/pages/TimetableBuilder.tsx`:** This file represents a standalone timetable page created in earlier development. By design decision (2026-08-26), it is **orphaned** and disconnected from `src/App.tsx` routing. Its grid logic has been extracted into the shared `src/components/TimetableGrid.tsx` component, used by both `Dashboard.tsx` and `DegreePlanner.tsx`.

---

## 6. States & Feedback

### 6.1 Schedule Conflict Styling

Schedule conflict styling is driven by an intentional mock collision in `src/data.ts` (`II4042 Machine Learning` vs `II4045 Data Visualization` on Tuesday 10:00).

* **Timetable Event Block:** `border-danger border-dashed bg-danger/10 z-10 animate-pulse` with an `AlertTriangle` icon in the top-right corner (`src/components/TimetableGrid.tsx`).
* **Conflict Banner (unified):** Both compact (Dashboard) and full (DegreePlanner) modes use the same component and style: `bg-danger/10 border border-danger/30 rounded-xl p-4 text-danger` rendered by `TimetableGrid`. Compact mode places the banner below the grid with a navigation link; full mode places it above.

### 6.2 Parity Constraint & Drag-and-Drop Signals

Elective courses are constrained by academic parity rules (odd semester courses only drop into Semesters 1, 3, 5, 7; even into 2, 4, 6, 8):

| Semester Drop State | Class Names Applied | Visual & Behavioral Feedback |
| :--- | :--- | :--- |
| `idle` | `bg-background border-border` | Default resting state of the semester column |
| `valid-hover` | `bg-teal/5 border-teal ring-2 ring-teal/25 shadow-lg` | Dropzone glows mint/teal; header switches to `bg-teal/10 border-teal/30`; placeholder displays *Lepaskan di sini* |
| `invalid` | `bg-foreground/3 border-border/70 opacity-55` | Column is dimmed with 55% opacity when parity does not match dragged item |
| `invalid-hover` | `bg-danger/5 border-danger/40` | Dragging over incompatible parity turns container red; displays alert badge: *Hanya semester ganjil/genap* |
| `drag-hint` banner | `bg-navy/5 border border-navy/15 rounded-lg text-navy` | Informational bar above columns stating allowed semester targets |

### 6.3 Loading & Asynchronous Feedback

* **Login Submission:** Clicking *Masuk ke Dashboard* simulates a 1000ms asynchronous authentication flow. The submit button disables (`disabled:opacity-70`) and renders an animated CSS border spinner (`w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin`).
* **Chatbot Response:** Simulates a 1000ms delay before appending assistant replies (`src/pages/Chatbot.tsx:24`).

### 6.4 Empty, Disabled & Locked States

* **Course Catalog Empty Search:** When query or filters yield no results, a centered state renders `BookOpen` at 20% opacity with message: *Tidak ada mata kuliah yang sesuai filter.* (`src/pages/CourseFinder.tsx:110`).
* **Course Already Added:** *Tambahkan ke Degree Planner* button switches to `bg-teal/10 text-teal border border-teal/30 cursor-default` with `CheckCircle2` icon and label *Sudah Ditambahkan*.
* **Locked Courses:** Mandatory courses (`type === 'Wajib'`) and completed courses (`status === 'completed'`) cannot be dragged (`draggable={false}`, `cursor-default`, `Lock` icon, no delete button).
* **Empty Planner Dropzone:** Empty semester displays a dashed placeholder (`border-2 border-dashed border-border rounded-lg text-muted`) labeled *Tarik matkul ke sini*.

---

## 7. Motion & Interaction

All transitions in the application are subtle, hardware-accelerated, and strictly purposeful:

| Motion / Interaction | Class Names Used | Context & Purpose |
| :--- | :--- | :--- |
| **Page Mount Transitions** | `animate-in fade-in duration-500` | Smooth entry when switching pages in `src/App.tsx` |
| **Detail View Mount** | `animate-in fade-in duration-300` | Smooth transition into full course detail |
| **Modal Backdrop Entry** | `animate-in fade-in duration-150` | Overlay background fade |
| **Modal Dialog Entry** | `animate-in zoom-in-95 duration-200` | Subtle scale-up effect on course modal open |
| **Sidebar Collapse / Expand** | `transition-all duration-300 ease-in-out` | Responsive mobile drawer slide and desktop collapse |
| **Emblem Compass Rotation** | `transition-transform duration-700 group-hover:rotate-180` | Playful institutional branding micro-interaction |
| **Interactive Hover Glow** | `transition-all duration-200 hover:shadow-md` | Card elevations on hover |
| **Conflict Warning Pulse** | `animate-pulse` | Emphasizes conflicting event block on the timetable grid |
| **Action Handle Reveal** | `opacity-0 group-hover:opacity-100 transition-opacity` | Reveals drag handles (`GripVertical`) and delete actions (`X`) on hover |

---

## 8. Accessibility & Ergonomics

### 8.1 Color Contrast Matrix

| Foreground Token / Hex | Background Token / Hex | Calculated Contrast | Primary Usage |
| :--- | :--- | :--- | :--- |
| `--color-foreground` (`#2d333a`) | `--color-background` (`#faf9f7`) | 12.1:1 (AAA) | Standard body text across canvas |
| `--color-foreground` (`#2d333a`) | `--color-surface` (`#ffffff`) | 12.8:1 (AAA) | Card copy and table text |
| `--color-navy` (`#0f3e32`) | `--color-surface` (`#ffffff`) | 12.0:1 (AAA) | Card headings, primary brand icons |
| `--color-surface` (`#ffffff`) | `--color-navy` (`#0f3e32`) | 12.0:1 (AAA) | Text on sidebar and primary buttons |
| `--color-gold` (`#d7b03d`) | `--color-navy` (`#0f3e32`) | 5.8:1 (AA) | Accent text, brand headings on navy sidebar |
| `--color-navy` (`#0f3e32`) | `--color-teal` (`#93f08e`) | 8.3:1 (AAA) | Badge text, chat bubble text, avatar text on teal backgrounds (contrast fix) |
| `--color-navy-dark` (`#08221b`) | `--color-teal` (`#93f08e`) | 13.0:1 (AAA) | User chat bubble text, avatar initials on teal (contrast fix) |
| `--color-danger` (`#ad5712`) | `--color-surface` (`#ffffff`) | 5.1:1 (AA) | Conflict alert copy on white cards |
| `--color-danger` (`#ad5712`) | `bg-danger/10` over surface | 4.4:1 (borderline AA) | Conflict banner copy (`src/components/TimetableGrid.tsx`) |

**Resolved contrast issues:** Badge text previously using `text-teal-dark` (~1.9:1) and `text-gold-hover` (~2.6:1) has been migrated to `text-navy` (~12:1 AAA). Chat bubble text previously using `text-white` on `bg-teal` (~1.4:1) has been migrated to `text-navy-dark` (~13:1 AAA). All previously failing pairings now meet WCAG AA or AAA thresholds.

### 8.2 Focus Handling & Interactive Indicators

* **Form Fields:** Form text inputs feature an explicit focus ring and border highlight: `focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all`.
* **Action Buttons:** Primary interactive buttons implement focus rings with offset: `focus:ring-2 focus:ring-offset-2 focus:ring-navy`.
* **Sidebar Active Items:** Left accent border indicator (`border-l-4 border-gold`) provides a non-color-exclusive indicator for the current active page.

### 8.3 Semantic Structure

* Semantic landmarks are strictly used: `<aside>` for sidebar navigation, `<header>` for top bar, `<main>` for primary workspace, `<nav>` for navigation links, and `<form>` for authentication.
* Heading levels (`<h1>` through `<h5>`) maintain logical hierarchy across views, automatically styled with `--font-serif` via `@layer base`.

---

## 9. Extending the System

### 9.1 Registering Tokens in Tailwind CSS v4 (`@theme`)

Tokens must be registered directly in `src/index.css` inside the `@theme` block. Tailwind CSS v4 automatically generates corresponding utility classes:

```css
@theme {
  /* Example: Registering a new accent token */
  --color-brand-accent: #1a56db;
  --font-display: 'Poppins', sans-serif;
}
```

### 9.2 Utility Class Composition & `cn()` Helper

All dynamic and conditional class names must be composed using the `cn()` helper in `src/utils.ts`, which safely combines `clsx` and `tailwind-merge`:

```tsx
import { cn } from '../utils';

<div className={cn(
  "base-class border transition-all",
  isActive ? "border-gold bg-gold/10 text-navy" : "border-border text-muted",
  isDisabled && "opacity-50 cursor-not-allowed"
)} />
```

### 9.3 Language & Copywriting Guidelines

* **UI Copy Language:** All user-facing text, error notices, empty state messages, and placeholder copy must be written in formal Indonesian (**Bahasa Indonesia**), aligning with standard academic terminology at UNAIR (e.g., *Mata Kuliah*, *SKS*, *Wajib*, *Pilihan*, *Semester Ganjil/Genap*, *Dosen Wali*, *KRS*, *NIM*).
* **Code Identifiers:** Code identifiers, React props, variable names, and design documentation remain in English.

---

## 10. Mock Boundaries Appendix

The following table documents intentional mockup boundaries implemented in the prototype. These are designed constraints and should not be modified as bugs:

| Feature / Area | Implementation File | Intentional Boundary / Mock Behavior |
| :--- | :--- | :--- |
| **Authentication Flow** | `src/pages/Login.tsx` | Accepts any non-empty input (NIM and password); simulates a 1000ms delay then switches `isLoggedIn` to `true`. |
| **AI Chatbot Replies** | `src/pages/Chatbot.tsx` | Uses canned responses triggered by keyword matching (`data science`/`rekomendasi` and `krs`/`planning`); returns a default fallback reply for other inputs. |
| **Dashboard Metrics** | `src/pages/Dashboard.tsx` | Stat values are static representations of a 5th-semester student profile (84/144 SKS, 58% progress, IPK 3.75, 7 planned courses). |
| **Schedule Conflict** | `src/data.ts` | An intentional schedule collision is seeded on Tuesday 10:00 between `II4042 Machine Learning` and `II4045 Data Visualization` to exercise conflict styling. |
| **Degree Planner Storage** | `src/pages/DegreePlanner.tsx` | Roadmap state initializes from `INITIAL_PLAN` in memory; page reload resets customizations. |
| **Curriculum Catalog** | `src/courseData.ts` | Normalizes static JSON curriculum data from `/Ekstrak/*.json` via `import.meta.glob`; defaults to built-in mocks if unpopulated. |
| **Orphaned Timetable** | `src/pages/TimetableBuilder.tsx` | Deprecated standalone timetable view; retained for code reference but disconnected from live routing. |
