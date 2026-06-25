// Seven stratified summary cards (top bar + title strip + tinted body),
// derived from the voyage Summary. Layout/colors from the design artifact.
import type { Summary } from '../domain/calculations';
import { fmtHM } from '../domain/time';

interface CardDef {
  label: string;
  unit: string;
  value: string;
  sub: string;
  color: string;
  tint: string;
}

function cards(s: Summary): CardDef[] {
  return [
    { label: 'Port Calls', unit: '', value: String(s.portCalls || 0), sub: 'stops', color: '#059669', tint: 'rgba(5,150,105,0.04)' },
    { label: 'Total Distance', unit: 'nm', value: s.totalDist != null ? Math.round(s.totalDist).toLocaleString('en-GB') : '0', sub: '', color: '#102a43', tint: 'rgba(15,23,42,0.025)' },
    { label: 'Average Speed', unit: 'kn', value: s.avg != null ? s.avg.toFixed(1) : '—', sub: 'passages', color: '#0284C7', tint: 'rgba(2,132,199,0.04)' },
    { label: 'Steaming Time', unit: 'HH:MM', value: fmtHM((s.totalHrs || 0) * 60), sub: s.totalHrs ? '(' + (s.totalHrs / 24).toFixed(1) + ' d)' : '', color: '#EA580C', tint: 'rgba(234,88,12,0.04)' },
    { label: 'St/By Time', unit: 'HH:MM', value: fmtHM(s.stbyMin || 0), sub: 'maneuvering', color: '#D97706', tint: 'rgba(217,119,6,0.04)' },
    { label: 'Port Time', unit: 'HH:MM', value: fmtHM(s.portMin || 0), sub: 'alongside', color: '#DB2777', tint: 'rgba(219,39,119,0.04)' },
    { label: 'Sea Condition', unit: 'HH:MM', value: fmtHM(s.seaCondMin || 0), sub: 'env ops', color: '#6366F1', tint: 'rgba(99,102,241,0.04)' },
  ];
}

export function SummaryCards({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-7">
      {cards(summary).map((c, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-line shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          style={{ background: c.tint }}
        >
          <div className="h-2" style={{ background: c.color }} />
          <div
            className="flex items-center justify-between border-b border-line bg-rail px-3.5 py-2 text-[0.55rem] font-bold uppercase tracking-[1.5px]"
            style={{ color: c.color }}
          >
            <span>{c.label}</span>
            <span className="font-mono text-[0.6rem] normal-case tracking-[0.5px] text-muted">{c.unit}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-1.5 px-3.5 py-2.5">
            <span className="font-mono text-[1.4rem] font-extrabold leading-none" style={{ color: c.color }}>
              {c.value}
            </span>
            <span className="text-[0.58rem] text-muted">{c.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
