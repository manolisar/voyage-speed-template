// Legs section — header (legend + add buttons) and the 21-column table.
import type { Leg, LegType, Voyage } from '../types';
import type { LegView } from '../domain/calculations';
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
}

export function LegsTable(props: Props) {
  const { voyage, legViews, readonly, onAdd } = props;
  const legs = voyage?.legs ?? [];

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
            <span className="inline-block h-[9px] w-[9px] rounded-sm bg-[#FB923C]" />&lt;10 kn
          </span>
        </div>
        <div className="flex gap-1.5">
          {addBtn('Port', 'Port')}
          {addBtn('At Sea', 'Sea')}
          {addBtn('Tender', 'Tender')}
        </div>
      </div>

      <div className="vt-scroll overflow-x-auto rounded-xl border border-line bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <table className="w-full min-w-[2280px] border-collapse text-[0.72rem]">
          <thead>
            <tr>
              {COLUMNS.map(([label, align], i) => (
                <th
                  key={i}
                  scope="col"
                  className="sticky top-0 whitespace-nowrap border-b border-r border-line bg-rail px-2 py-2 text-[0.5rem] font-bold uppercase tracking-[1.1px] text-faint"
                  style={{ textAlign: align as 'left' | 'right' | 'center' }}
                >
                  {label}
                </th>
              ))}
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
                onField={props.onField}
                onMode={props.onMode}
                onToggleType={props.onToggleType}
                onUp={props.onUp}
                onDown={props.onDown}
                onInsert={props.onInsert}
                onDelete={props.onDelete}
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
