# Voyage Speed Tracker

A static, single-page **speed & time planner** for **Celebrity Eclipse** (Solstice-class).
Each voyage is a list of legs (port calls, at-sea days, tender/anchorage calls); the app solves
the **speed ↔ ETA/time** relationship over each passage using the time since the previous port's
**FAW** (Full Away) and per-leg **UTC offsets**, so timezone changes across a crossing are exact.

Built to the same philosophy as **Voyage Tracker v8**: no backend, no database — a static bundle
that keeps its data in the browser and writes a plain **`.json`** file as the portable record.

## Features

- 21-column legs table with live, dependency-free calculations:
  - **SPD** mode — enter the times, the app computes **Speed** (kn).
  - **TIME** mode — enter a target **Speed**, the app computes the **ETA**.
  - Per-leg **St/By**, **Port hours**, **Daylight** (sunset − sunrise), Open Loop / Sea Condition.
- Seven summary cards (port calls, distance, average speed, steaming/St-By/port time, sea condition).
- Voyages grouped by calendar quarter in the sidebar; search + active/ended/locked filters.
- **Lock / Edit** workflow with a reason-logged **version history**.
- **Save / Open `.json`** via the File System Access API (Chromium/Edge), with a download/upload
  fallback on other browsers. Work also autosaves to `localStorage` so a refresh is lossless.
- **Export to Excel** (`.xlsx`) — this voyage or all voyages — preserving the original template
  layout and **live** Time/Speed formulas + Σ TOTAL. No external libraries.

## Access code

The app opens behind a **daily password**: the steady keyword **`bridge`** followed by **today's
date** in `YYYY-MM-DD`, read from the local machine clock.

> Example — on 25 Jun 2026 the password is `bridge2026-06-25`.

The code rolls over at local midnight. **This is a convenience gate, not real security** — the
keyword is shared and the date is public, so anyone who knows the keyword can derive the day's
code. Real access control onboard is the workstation itself (Windows lock screen / share ACL),
exactly as in v8. No secret is stored; the check is a plain client-side string compare
(`src/domain/password.ts`). If you need a genuine barrier, replace this with a real auth layer.

## Tech stack

React 19 · Vite 7 · Tailwind CSS v4 (CSS-first) · TypeScript · Vitest.
`vite.config.ts` uses a **relative base** (`base: './'`) so the built bundle runs both from a
GitHub Pages subpath and when opened from a corporate network share / static host.

**Browser:** the native Save/Open file pickers need a Chromium browser (Chrome/Edge); elsewhere
the app falls back to download/upload, so it still works everywhere.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck
npm test             # math + password + bundle unit tests
npm run build        # production bundle in dist/
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml` (lint → typecheck → test → build → Pages).
For a network-share deployment, run `npm run build` and copy `dist/` to the share — the relative
base means it runs from any path.

## Layout

```
src/
├── domain/        time, calculations (the solver), password, schedule, seed
├── storage/       persist (localStorage), bundle (JSON shape), jsonFile (Save/Open), xlsx
├── hooks/         useVoyages (state machine: mutations, lock/version, save/open)
└── components/    AuthGate, Header, Sidebar, CruiseCard, SummaryCards, LegsTable/LegRow,
                   VersionHistory, MathExplainer, UnlockModal, Toast, Icons
```

The calculation engine (`src/domain/calculations.ts`) is a pure function over a voyage and is the
single source of truth for every displayed number; `src/domain/calculations.test.ts` locks the
results.
