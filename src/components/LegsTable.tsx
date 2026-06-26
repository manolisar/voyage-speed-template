// Legs section — header (legend + add buttons) and the 25-column table. The
// first FROZEN columns (Type … Speed) stick to the left on horizontal scroll;
// their left offsets are measured from the rendered header so variable column
// widths stay aligned.
import { useLayoutEffect, useRef, useState } from 'react';
import type { Leg, LegType, Voyage } from '../types';
import type { LegView } from '../domain/calculations';
import { LegRow } from './LegRow';
import { PlusIcon } from './Icons';

const FROZEN = 7; // Type, Date, Location, Dist, Mode, Time, Speed

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

  // Measured left offset of each frozen header cell — fed back as `left` for
  // the sticky frozen columns so they line up with their (variable) widths.
  const headRowRef = useRef<HTMLTableRowElement>(null);
  const [lefts, setLefts] = useState<number[]>([]);
  useLayoutEffect(() => {
    const row = headRowRef.current;
    if (!row) return;
    const measure = () => {
      const cells = Array.from(row.children) as HTMLElement[];
      const next: number[] = [];
      // Normalise against the first cell so column 0 sticks at left:0 — offsetLeft
      // is relative to the offsetParent, which isn't always the table's edge.
      const base = cells[0]?.offsetLeft ?? 0;
      for (let i = 0; i < FROZEN && i < cells.length; i++) next.push(Math.round(cells[i].offsetLeft - base));
      // Returning `prev` unchanged bails React out — no re-render, no loop.
      setLefts((prev) => (prev.length === next.length && prev.every((v, k) => v === next[k]) ? prev : next));
    };
    measure();
    // Observe the table (not the row) so column-width changes from cell content
    // are caught; the dep on legs.length covers add/remove. The bailout above
    // keeps this from looping when offsets are unchanged.
    const ro = new ResizeObserver(measure);
    ro.observe(row.closest('table') ?? row);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [legs.length]);

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

      <div className="vt-scroll overflow-x-auto rounded-xl border border-line bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* border-separate (not collapse): collapsed borders vanish on the
            sticky header / frozen cells during scroll in Chromium. */}
        <table className="w-full min-w-[2280px] border-separate border-spacing-0 text-[0.72rem]">
          <thead>
            <tr ref={headRowRef}>
              {COLUMNS.map(([label, align], i) => {
                const isFrozen = i < FROZEN;
                return (
                  <th
                    key={i}
                    scope="col"
                    className={`sticky top-0 whitespace-nowrap border-b border-r border-line bg-rail px-2 py-2 text-[0.5rem] font-bold uppercase tracking-[1.1px] text-faint ${
                      isFrozen ? 'z-30' : 'z-20'
                    }${i === FROZEN - 1 ? ' vt-freeze-edge' : ''}`}
                    style={{
                      textAlign: align as 'left' | 'right' | 'center',
                      ...(isFrozen ? { left: lefts[i] ?? 0 } : null),
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
