# Voyage Speed Tracker — Project Charter

> Speed & time planner for the **Solstice-class fleet** (5 ships). Rebuilt from a Claude Design
> artifact (`Voyage Speed Tracker.dc.html`) into a production React/TS SPA. Same engineering
> philosophy as `~/Projects/Voyage_Tracker_v8`: static, no backend, JSON is the record.

## 1. What this app is

A static SPA that plans each voyage's legs and solves the **speed ↔ ETA/time** relationship over
every passage. A port leg's passage runs from the **previous** port's **FAW** (Full Away) to this
leg's arrival; all timestamps convert to absolute UTC minutes via each leg's **UTC offset**, so a
mid-crossing timezone change is exact. Two solve directions per port leg:

- **SPD** mode — operator enters the times → Speed (kn) is computed.
- **TIME** mode — operator enters a target Speed → ETA is computed.

It also splits the maneuvering (**St/By**) phase per port call into **Arrival** (`Arr − ETA`,
pilot→berth) and **Departure** (`FAW − Dep`, berth→pilot); each takes a manual distance and the app
computes the slow maneuvering speed (distance ÷ that time).

The app serves the **5 Solstice-class ships** — each is an independent workspace (own voyages, own
JSON, own localStorage). No backend, no database. Data autosaves to per-ship `localStorage` and is
hand-off'd as a `.json` file or as the fleet's official **Excel (.xlsx)** template (import + export,
round-trip).

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
- **`src/storage/`** — `persist.ts` (per-ship localStorage autosave, key
  `vt_speed_voyages_v6_<SHIP>`), `bundle.ts` (JSON shape + validation, mirrors v8's
  `exportImport.ts`), `jsonFile.ts` (File System Access API Save/Open + download/upload fallback),
  `excel.ts` (Excel import + faithful styled export — see §7).
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

## 5. Access model — identify, then daily password, then role-gated edit

Two stages, in this order:

1. **Identify** (`LandingScreen` → `useSession`): pick ship (5 Solstice-class), enter name, pick
   role. Persisted in `localStorage` (`vst_session`) so a known machine skips it on relaunch.
2. **Daily password** (`AuthGate`): **`bridge` + today's local date (`YYYY-MM-DD`)**, e.g.
   `bridge2026-06-25`. Computed from the local clock in `domain/password.ts`, rolls over at local
   midnight, unlock stamped in `sessionStorage` keyed by the date.

**Roles** (`domain/roles.ts`): Master, Staff Captain, Navigation Officer, Chief Engineer may
unlock/edit; **Bridge Officer is view-only**. The role gates the Lock/Edit toggle, New Voyage, JSON
Open, and all inputs (`editable = !locked && roleCanEdit`). Name + role are stamped into `loggedBy`
on every committed change (lock/unlock/new voyage), so the on-disk record carries attribution.

**Neither the password nor the role is real security** — the keyword is shared, the date is public,
and roles are picked at the landing screen with nothing verifying them. They are workflow guards.
Real access control is the workstation (Windows lock / share ACL), same stance as v8's "Edit Mode is
a guard, not a boundary." No secret is stored. If a real barrier is ever needed, replace these
modules; do not pretend the current gates are ones.

## 6. Conventions

- All math lives in `domain/calculations.ts` + `domain/time.ts` and is unit-tested. Never compute
  voyage numbers inside a component.
- Visual target = the design artifact at 1380×900. Palette/fonts are theme tokens in
  `src/index.css`; use Tailwind utilities against them, with a few arbitrary pixel widths for the
  dense table.
- 5 Solstice-class ships (`domain/ships.ts`); each is an independent per-ship workspace. Eclipse
  (EC) ships with the worked demo voyages; the other four start empty (crew creates via New Voyage).
  Legs are free-text ports (no catalog).

## 7. Excel round-trip (`src/storage/excel.ts`)

Imports and exports the fleet's official **Speed Templates** workbook 1:1 (layout, fonts, colours,
formulas), using **`exceljs`** (lazy-loaded via dynamic `import()` so it stays out of the initial
bundle — it ships as its own chunk).

**Workbook = one sheet per voyage** (sheet name = voyage id). Per sheet: R1 ship name (navy
`#002060` fill, white Arial 24), R5 start port, R6 date range, R7 headers, data rows from R8, then a
`Total:` SUM row. Columns **A–P**: `Date`(weekday A + date B) · `Port` · `Type` (D=port, C=sea,
T=tender) · `Distance` · `Time`(formula `=(24/24+H{r}-K{prevPort})+N-M/24`) · `Speed`(formula
`=E/F/24`, `0.0`) · `ETA`(red) · `Arrival` · `Departure` · `FAW`(red) · `Sunrise` · `Sunset` ·
`ZT`("UTC -5") · `Remarks` · `Open Loop Time` (**decimal hours**, e.g. 6.5 = 06:30). Embark/disembark
rows are navy with white text; port-call names use Century Gothic; Speed has a conditional format
`> 20 → light-red fill / dark-red text`.

**Field mapping** is in `excel.ts` (`typeToCode`/`codeToType`, `utcToZT`/`ztToUtc`,
`hoursToHHMM`/`hhmmToHours`). The Time/Speed formulas are written so Excel recomputes natively, and
ignored on import (the app recomputes). **The template has no columns for St/By Arr/Dep distances or
Sea Condition** — those are app-only fields, kept in the app + the `.json` record but intentionally
NOT in the Excel file (the `.json` bundle is the lossless record; Excel is the official report).

Import detects the ship from the title (e.g. "Celebrity Eclipse" → `EC`) and replaces that ship's
voyages (confirm first), then switches to it (`App.tsx`). Round-trip is locked by
`excel.test.ts` (build → parse).

*Last updated: 2026-06-25.*
