# Speed Templates

A static, single-page **speed & time planner** for the **Solstice-class fleet** (5 ships).
Each voyage is a list of legs (port calls, at-sea days, tender/anchorage calls); the app solves
the **speed ↔ ETA/time** relationship over each passage using the time since the previous port's
**FAW** (Full Away) and per-leg **UTC offsets**, so timezone changes across a crossing are exact.

Built to the same philosophy as **Voyage Tracker v8**: no backend, no database — a static bundle
that keeps its data in the browser and writes a plain **`.json`** file as the portable record.

## Features

- Live, dependency-free calculations per leg:
  - **SPD** mode — enter the times, the app computes **Speed** (kn).
  - **TIME** mode — enter a target **Speed**, the app computes the **ETA**.
  - **St/By split** — Arrival (`Arr − ETA`, pilot→berth) and Departure (`FAW − Dep`, berth→pilot)
    maneuvering phases, each with a manual distance and a computed maneuvering **speed**.
  - Per-leg **Port hours**, **Daylight** (sunset − sunrise), Open Loop / Sea Condition.
- Seven summary cards (port calls, distance, average speed, steaming/St-By/port time, sea condition).
- **5 ships**, each an independent workspace (own voyages, own JSON, own localStorage).
- Voyages grouped by calendar quarter in the sidebar; search + active/ended/locked filters; **New Voyage**.
- **Lock / Edit** workflow with a reason-logged **version history**, stamped with the signed-in user.
- **Save / Open `.json`** via the File System Access API (Chromium/Edge), with a download/upload
  fallback on other browsers. Work also autosaves to `localStorage` so a refresh is lossless.
- **Excel round-trip** — **Import** the fleet's official Speed Templates `.xlsx` and **Export** back
  in the exact same format and colours (navy title, red ETA/FAW, live Time/Speed formulas, Total
  row, Speed > 20 highlight). One sheet per voyage; import detects the ship from the title. Excel
  handling uses `exceljs`, lazy-loaded so it never weighs down the initial page.

## Sign-in — ship, role, then daily code

On launch you **identify** first: pick your ship (1 of 5 Solstice-class), enter your name, and pick
your role. Then a **daily password** unlocks the app: the steady keyword **`bridge`** followed by
**today's date** in `YYYY-MM-DD`, read from the local machine clock.

> Example — on 25 Jun 2026 the password is `bridge2026-06-25`.

**Roles:** Master, Staff Captain, Navigation Officer, and Chief Engineer may edit; **Bridge Officer
is view-only**. Your name + role are stamped on every committed change.

The code rolls over at local midnight. **This is a convenience gate, not real security** — the
keyword is shared, the date is public, and roles are self-selected with nothing verifying them. Real
access control onboard is the workstation itself (Windows lock screen / share ACL), as in v8. No
secret is stored; the password check is a plain client-side string compare (`src/domain/password.ts`).
If you need a genuine barrier, replace these with a real auth layer.

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
├── storage/       persist (localStorage), bundle (JSON shape), jsonFile (Save/Open), excel (xlsx I/O)
├── hooks/         useVoyages (state machine: mutations, lock/version, save/open)
└── components/    AuthGate, Header, Sidebar, CruiseCard, SummaryCards, LegsTable/LegRow,
                   VersionHistory, MathExplainer, UnlockModal, Toast, Icons
```

The calculation engine (`src/domain/calculations.ts`) is a pure function over a voyage and is the
single source of truth for every displayed number; `src/domain/calculations.test.ts` locks the
results.
