// Left sidebar — search, filter pills, and voyages grouped by calendar quarter.
// Filtering/grouping ported from the design artifact's renderVals().
import type { Filter, VoyageMap } from '../types';
import { quarterFor } from '../domain/schedule';
import { SearchIcon, CalendarIcon } from './Icons';

interface Props {
  voyages: VoyageMap;
  selectedId: string;
  filter: Filter;
  search: string;
  expandedQ: Record<string, boolean>;
  onSearch: (s: string) => void;
  onFilter: (f: Filter) => void;
  onSelect: (id: string) => void;
  onToggleQuarter: (qk: string) => void;
}

const FILTERS: [Filter, string][] = [
  ['all', 'All'],
  ['active', 'Active'],
  ['ended', 'Ended'],
  ['locked', 'Locked'],
];

export function Sidebar({
  voyages,
  selectedId,
  filter,
  search,
  expandedQ,
  onSearch,
  onFilter,
  onSelect,
  onToggleQuarter,
}: Props) {
  const q = search.trim().toLowerCase();
  const ids = Object.keys(voyages).sort((a, b) => Number(a) - Number(b));
  const filtered = ids
    .map((id) => voyages[id])
    .filter((vo) => {
      if (filter === 'active' && vo.ended) return false;
      if (filter === 'ended' && !vo.ended) return false;
      if (filter === 'locked' && !vo.locked) return false;
      if (q) {
        const hay = (vo.title + ' ' + vo.id + ' ' + vo.legs.map((l) => l.port).join(' ')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

  // group by quarter, preserving first-seen order
  const order: string[] = [];
  const groups: Record<string, typeof filtered> = {};
  for (const vo of filtered) {
    const qk = quarterFor(voyages, vo.id);
    if (!groups[qk]) {
      groups[qk] = [];
      order.push(qk);
    }
    groups[qk].push(vo);
  }

  return (
    <aside className="vt-scroll flex flex-col overflow-y-auto border-r border-line bg-surface">
      <div className="relative border-b border-line p-3">
        <span className="pointer-events-none absolute left-[22px] top-1/2 -translate-y-1/2 text-faint">
          <SearchIcon size={14} />
        </span>
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search voyages, ports…"
          className="w-full rounded-lg border border-line bg-bg py-2 pl-8 pr-2.5 text-[0.78rem] text-ink outline-none focus:border-cyan"
        />
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line px-3 py-2.5">
        {FILTERS.map(([k, label]) => {
          const on = filter === k;
          return (
            <button
              key={k}
              onClick={() => onFilter(k)}
              className="rounded-full border px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.8px]"
              style={
                on
                  ? { background: 'rgba(6,182,212,0.10)', color: '#0891b2', borderColor: 'rgba(6,182,212,0.25)' }
                  : { background: '#F3F5F9', color: '#6B7B8F', borderColor: '#E5E9F0' }
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 p-1.5 text-[0.82rem]">
        {order.map((qk) => {
          const open = expandedQ[qk] !== false;
          const rows = groups[qk];
          return (
            <div key={qk}>
              <div
                onClick={() => onToggleQuarter(qk)}
                className="flex cursor-pointer select-none items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.62rem] font-extrabold uppercase tracking-[0.8px] text-[#334e68] hover:bg-rail"
              >
                <span className="w-[11px] flex-shrink-0 text-center text-[0.65rem] text-faint">
                  {open ? '▾' : '▸'}
                </span>
                <span className="flex-shrink-0 text-muted">
                  <CalendarIcon size={13} />
                </span>
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{qk}</span>
                <span className="rounded-full bg-rail px-[7px] py-px font-mono text-[0.56rem] font-semibold text-muted">
                  {rows.length}
                </span>
              </div>
              {open && (
                <div className="mb-1 ml-3 border-l border-line pl-2">
                  {rows.map((vo) => {
                    const active = vo.id === selectedId;
                    const glyph = vo.locked ? '🔒' : vo.ended ? '⚑' : '●';
                    const statusFg = vo.locked ? '#B0BAC6' : vo.ended ? '#6B7B8F' : '#059669';
                    return (
                      <div
                        key={vo.id}
                        onClick={() => onSelect(vo.id)}
                        className="flex cursor-pointer select-none items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-rail"
                        style={{
                          background: active ? 'rgba(6,182,212,0.10)' : 'transparent',
                          color: active ? '#0891b2' : '#1A2233',
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        <span className="w-3.5 flex-shrink-0 text-center" style={{ color: active ? '#0891b2' : '#6B7B8F' }}>
                          ⚓
                        </span>
                        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{vo.title}</span>
                        <span className="font-mono text-[0.58rem] tracking-[0.5px]" style={{ color: statusFg }}>
                          {glyph}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
