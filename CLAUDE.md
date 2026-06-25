# Voyage Speed Tracker — Project Charter

> Speed & time planner for **Celebrity Eclipse** (Solstice-class). Rebuilt from a Claude Design
> artifact (`Voyage Speed Tracker.dc.html`) into a production React/TS SPA. Same engineering
> philosophy as `~/Projects/Voyage_Tracker_v8`: static, no backend, JSON is the record.

## 1. What this app is

A static SPA that plans each voyage's legs and solves the **speed ↔ ETA/time** relationship over
every passage. A port leg's passage runs from the **previous** port's **FAW** (Full Away) to this
leg's arrival; all timestamps convert to absolute UTC minutes via each leg's **UTC offset**, so a
mid-crossing timezone change is exact. Two solve directions per port leg:

- **SPD** mode — operator enters the times → Speed (kn) is computed.
- **TIME** mode — operator enters a target Speed → ETA is computed.

No backend, no database. Data autosaves to `localStorage` and is hand-off'd as a `.json` file.

## 2. Tech stack

- React 19 + Vite 7, `@vitejs/plugin-react`
- Tailwind CSS v4 (CSS-first; palette + fonts as theme tokens in `src/index.css`)
- TypeScript (strict) + Vitest
- Fonts: Manrope (UI) + IBM Plex Mono (numerics)
- `vite.config.ts` `base: './'` (relative) — runs from a GitHub Pages subpath **and** from a
  corporate network share. Do not hardcode an absolute base.

## 3. Architecture

- **`src/domain/`** is the brain and is framework-free:
  - `time.ts` — `dayNum`, `hhmmToMin`, `minToHHMM`, `fmtHM`, `instUTC`, `fmtDate`.
  - `calculations.ts` — `computeVoyage(voyage) → { legViews[], summary }`. **The single source of
    truth for every displayed number.** Ported verbatim from the design artifact's `compute()`.
    Locked by `calculations.test.ts`. Change numbers here, never in components.
  - `password.ts` — the daily gate (see §5).
  - `schedule.ts` — sidebar quarter grouping. `seed.ts` — first-run dataset (voyages 586–621).
- **`src/storage/`** — `persist.ts` (localStorage autosave, key `vt_speed_voyages_v6`),
  `bundle.ts` (JSON shape + validation, mirrors v8's `exportImport.ts`), `jsonFile.ts`
  (File System Access API Save/Open + download/upload fallback), `xlsx.ts` (dependency-free
  `.xlsx` writer with live formulas).
- **`src/hooks/useVoyages.ts`** — the state machine: voyages map, selection, filters, leg
  mutations, lock/version workflow, toast, and JSON save/open. Components are presentational.
- **`src/components/`** — `AuthGate` wraps everything; `App.tsx` composes Header + Sidebar + main
  (CruiseCard, SummaryCards, LegsTable/LegRow, VersionHistory, MathExplainer) + UnlockModal + Toast.

## 4. Data model

A **Leg** (`src/types.ts`) is one table row. `type` ∈ `Port | Sea | Tender` (Tender computes like a
Port); `mode` ∈ `speed | time`. Times are `HH:MM` strings; `utc` is signed hours as a string;
`openLoop`/`seaCond` are `HH:MM` durations. A **Voyage** holds `legs[]`, `versions[]`, `locked`,
`ended`, `loggedBy`. The on-disk **Bundle** is `{ bundleVersion, app, exportedAt, selectedId,
voyages }`; `parseBundle` also accepts a bare single-voyage JSON (permissive import, v8-style).

## 5. Access model — daily password gate

`AuthGate` requires **`bridge` + today's local date (`YYYY-MM-DD`)**, e.g. `bridge2026-06-25`.
Computed from the local clock in `domain/password.ts`, so it rolls over at local midnight. Unlock
is stamped in `sessionStorage` keyed by the date (re-prompts across midnight).

**This is a convenience gate, not security** — the keyword is shared and the date is public.
Real access control is the workstation (Windows lock / share ACL), same stance as v8's "Edit Mode
is a guard, not a boundary." No secret is stored. If a real barrier is ever needed, replace this
module; do not pretend the current gate is one.

## 6. Conventions

- All math lives in `domain/calculations.ts` + `domain/time.ts` and is unit-tested. Never compute
  voyage numbers inside a component.
- Visual target = the design artifact at 1380×900. Palette/fonts are theme tokens in
  `src/index.css`; use Tailwind utilities against them, with a few arbitrary pixel widths for the
  dense table.
- Eclipse-only by design (no fleet selector). Legs are free-text ports (no catalog).

*Last updated: 2026-06-25.*
