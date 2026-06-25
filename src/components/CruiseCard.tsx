// Cruise header card — title, date span + attribution + filename, status pill,
// route chips (ports only), and duration summary.
import type { ShipCode, Voyage } from '../types';
import { fmtDate, dayNum } from '../domain/time';

export function CruiseCard({ voyage, shipCode }: { voyage: Voyage | undefined; shipCode: ShipCode }) {
  if (!voyage) return null;
  const portLegs = voyage.legs.filter((l) => l.type === 'Port');
  const dates = voyage.legs.length
    ? `${fmtDate(voyage.legs[0].date)} → ${fmtDate(voyage.legs[voyage.legs.length - 1].date)}`
    : 'No dates';
  const duration = (() => {
    if (!voyage.legs.length) return '';
    const a = dayNum(voyage.legs[0].date);
    const b = dayNum(voyage.legs[voyage.legs.length - 1].date);
    return a != null && b != null
      ? `${b - a} nights · ${portLegs.length} ports`
      : `${portLegs.length} ports`;
  })();

  return (
    <div className="rounded-xl border border-line bg-surface px-[1.3rem] py-[1.1rem] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[1.25rem] font-extrabold leading-tight tracking-[-0.3px]">
            {voyage.title}
          </div>
          <div className="mt-1.5 text-[0.7rem] tracking-[0.3px] text-muted">
            {dates} · {voyage.loggedBy} ·{' '}
            <span className="font-mono">
              {shipCode}_{voyage.id}_speed-template.json
            </span>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-bold tracking-[0.5px]"
          style={
            voyage.ended
              ? { background: 'rgba(107,123,143,0.18)', color: 'var(--color-muted)' }
              : { background: 'rgba(16,185,129,0.18)', color: '#10b981' }
          }
        >
          {voyage.ended ? 'Ended' : 'Active'}
        </span>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-2 font-mono text-[0.82rem]">
        {portLegs.map((l, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-faint">→</span>}
            <span className="font-bold">{(l.port || '—').split(',')[0]}</span>
          </span>
        ))}
        <span className="ml-auto font-sans text-[0.68rem] uppercase tracking-[0.5px] text-muted">
          {duration}
        </span>
      </div>
    </div>
  );
}
