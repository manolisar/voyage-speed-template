// Legs section — header (legend + add buttons) and the 26-column table. The
// first FROZEN columns (Type … Speed) stick to the left on horizontal scroll;
// their left offsets are DETERMINISTIC (from the COL_W width table), not
// measured — a <colgroup> + table-fixed layout pins every column width so a
// computed cell can never reflow its column and leave the sticky offsets stale.
import { useState } from 'react';
import type { Leg, LegType, Voyage } from '../types';
import type { LegView } from '../domain/calculations';
import { COL_W, FROZEN, FROZEN_LEFTS, TABLE_MIN_W } from '../domain/fieldTypes';
import { LegRow } from './LegRow';
import { PlusIcon } from './Icons';

const COLUMNS: [string, string][] = [
  ['Type', 'center'], ['Date', 'left'], ['Location', 'left'], ['Dist', 'right'], ['Mode', 'center'],
  ['Time', 'right'], ['Speed', 'right'], ['ETA', 'center'], ['Arr', 'center'], ['Dep', 'center'], ['FAW', 'center'],
  ['Arr SB nm', 'center'], ['Arr SB', 'center'], ['Arr kn', 'center'], ['Dep SB nm', 'center'], ['Dep SB', 'center'], ['Dep kn', 'center'],
  ['Port hrs', 'center'], ['Sunrise', 'center'], ['Sunset', 'center'],
  ['Daylight', 'center'], ['UTC ±', 'center'], ['Open Loop', 'center'], ['Sea Cond', 'center'], ['Remarks', 'left'], ['', 'center'],
];

interface Props {
  voyage: Voyage | undefined;
  legViews: LegView[];
  readonly: boolean;
  onField: (i: number, field: keyof Leg, val: string) => void;
  onMode: (i: number, mode: 'speed' | 'time') => void;
  onToggleType: (i: number) => void;
  onUp: (i: number) => void;
  onDown: (i: number) => void;
  onInsert: (i: number) => void;
  onDelete: (i: number) => void;
  onAdd: (type: LegType) => void;
  onFillDates: (from: number, to: number) => void;
}

export function LegsTable(props: Props) {
  const { voyage, legViews, readonly, onAdd, onFillDates } = props;
  const legs = voyage?.legs ?? [];

  // Frozen-column left offsets are a constant cumulative sum of the COL_W width
  // table (computed once in fieldTypes). No measurement, no ResizeObserver — the
  // colgroup below guarantees columns never reflow, so these can't go stale.
  const lefts = FROZEN_LEFTS;

  // True once the table is scrolled off its left edge — gates the soft shadow
  // at the frozen-column boundary so it only shows while content sits under it
  // (and clears again when scrolled fully back to the left).
  const [scrolled, setScrolled] = useState(false);

  // Excel-style grid keyboard navigation. Each data input carries a `data-col`
  // (its table-column index); inputs sit in row order in the DOM. Up/Down/Enter
  // move within a column (skipping rows that lack that input); Tab/Shift+Tab
  // step across cells, wrapping to the next/previous row. Left/Right keep their
  // normal text-caret behaviour.
  const onGridKey = (e: React.KeyboardEvent<HTMLTableElement>) => {
    const t = e.target as HTMLElement;
    if (t.tagName !== 'INPUT' || t.dataset.col == null) return;
    const input = t as HTMLInputElement;
    const table = e.currentTarget;
    const go = (el: HTMLInputElement | undefined) => {
      if (!el) return;
      e.preventDefault();
      el.focus();
      el.select();
    };
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
      const col = Array.from(table.querySelectorAll<HTMLInputElement>(`input[data-col="${input.dataset.col}"]`));
      const i = col.indexOf(input);
      go(col[i + (e.key === 'ArrowUp' ? -1 : 1)]);
    } else if (e.key === 'Tab') {
      // DOM order is row-major, so stepping ±1 moves across columns and wraps to
      // the next/previous row. At the first/last input we fall through to native
      // Tab so focus can still leave the table.
      const all = Array.from(table.querySelectorAll<HTMLInputElement>('input[data-col]'));
      const i = all.indexOf(input);
      go(all[i + (e.shiftKey ? -1 : 1)]);
    }
  };

  // Live fill-handle range (date drag). null when not dragging.
  const [fill, setFill] = useState<{ from: number; to: number } | null>(null);
  const onFillPreview = (from: number, to: number) => setFill(from < 0 ? null : { from, to });
  const onFillCommit = (from: number, to: number) => {
    setFill(null);
    onFillDates(from, to);
  };

  const addBtn = (label: string, type: LegType) => (
    <button
      onClick={() => onAdd(type)}
      disabled={readonly}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[0.72rem] font-semibold hover:bg-rail disabled:opacity-50"
      style={{ color: readonly ? 'var(--color-faint)' : 'var(--color-ink)' }}
    >
      <PlusIcon size={12} />
      {label}
    </button>
  );

  return (
    <section>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] font-bold uppercase tracking-[1.5px] text-faint">
            Legs · {legs.length} stops
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] text-muted">
            <span className="inline-block h-[9px] w-[9px] rounded-sm bg-[#F87171]" />&gt;19 kn
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] text-muted">
            <span className="inline-block h-[9px] w-[9px] rounded-sm bg-[#8b5cf6]" />&lt;10 kn
          </span>
        </div>
        <div className="flex gap-1.5">
          {addBtn('Port', 'Port')}
          {addBtn('At Sea', 'Sea')}
          {addBtn('Tender', 'Tender')}
        </div>
      </div>

      <div
        className="vt-scroll overflow-x-auto rounded-xl border border-line bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}
      >
        {/* border-separate (not collapse): collapsed borders vanish on the
            sticky header / frozen cells during scroll in Chromium.
            table-fixed + colgroup: column widths come from COL_W, not content,
            so the frozen offsets above stay valid through every edit. */}
        <table
          onKeyDown={onGridKey}
          className="table-fixed border-separate border-spacing-0 text-[0.72rem]"
          style={{ minWidth: TABLE_MIN_W, width: TABLE_MIN_W }}
        >
          <colgroup>
            {COL_W.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map(([label, align], i) => {
                const isFrozen = i < FROZEN;
                return (
                  <th
                    key={i}
                    scope="col"
                    className={`sticky top-0 whitespace-nowrap border-b border-r border-line bg-rail px-2 py-2 text-[0.5rem] font-bold uppercase tracking-[1.1px] text-faint ${
                      isFrozen ? 'z-30' : 'z-20'
                    }`}
                    style={{
                      textAlign: align as 'left' | 'right' | 'center',
                      // Match the body's left-edge separators (see LegRow) so the
                      // frozen-column borders stay put when the table scrolls.
                      ...(isFrozen
                        ? {
                            left: lefts[i] ?? 0,
                            boxShadow:
                              [
                                i > 0 ? 'inset 1px 0 0 0 var(--color-line)' : '',
                                i === FROZEN - 1 && scrolled ? '6px 0 8px -6px rgba(15, 23, 42, 0.22)' : '',
                              ]
                                .filter(Boolean)
                                .join(', ') || undefined,
                          }
                        : null),
                    }}
                  >
                    {label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {legs.map((leg, i) => (
              <LegRow
                key={i}
                leg={leg}
                view={legViews[i]}
                index={i}
                readonly={readonly}
                lefts={lefts}
                scrolled={scrolled}
                fillActive={!!fill && i > fill.from && i <= fill.to}
                onField={props.onField}
                onMode={props.onMode}
                onToggleType={props.onToggleType}
                onUp={props.onUp}
                onDown={props.onDown}
                onInsert={props.onInsert}
                onDelete={props.onDelete}
                onFillPreview={onFillPreview}
                onFillCommit={onFillCommit}
              />
            ))}
          </tbody>
        </table>
      </div>

      {legs.length === 0 && (
        <div className="px-4 py-10 text-center text-[0.82rem] text-faint">
          No legs yet for this voyage. {readonly ? 'Enable Edit to add legs.' : 'Use Add Port / At Sea / Tender above.'}
        </div>
      )}
    </section>
  );
}
