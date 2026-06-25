// One leg row in the table. Reads raw values from the Leg and computed
// display values from its LegView. Field/column set ported from the design.
import type { ChangeEvent } from 'react';
import type { Leg, LegType } from '../types';
import type { LegView, SpeedBand } from '../domain/calculations';

const TYPE_CHIP: Record<LegType, { label: string; bg: string; fg: string; bd: string; row: string }> = {
  Port: { label: 'PORT', bg: '#EFF6FF', fg: '#2563EB', bd: '#BFDBFE', row: '#ffffff' },
  Sea: { label: 'SEA', bg: '#ECFEFF', fg: '#0891b2', bd: '#A5F3FC', row: 'rgba(2,132,199,0.025)' },
  Tender: { label: 'TENDER', bg: '#FFF7ED', fg: '#EA580C', bd: '#FED7AA', row: 'rgba(234,88,12,0.03)' },
};

const SPEED_COLORS: Record<SpeedBand, { fg: string; bg: string }> = {
  hi: { fg: '#B91C1C', bg: '#FEE2E2' },
  lo: { fg: '#C2410C', bg: '#FFEDD5' },
  ok: { fg: '#047857', bg: '#ECFDF5' },
};

const tdCls = 'border-b border-r border-line';
const dash = <span className="font-mono text-[0.72rem] text-faint">—</span>;

interface Props {
  leg: Leg;
  view: LegView;
  index: number;
  readonly: boolean;
  onField: (i: number, field: keyof Leg, val: string) => void;
  onMode: (i: number, mode: 'speed' | 'time') => void;
  onToggleType: (i: number) => void;
  onUp: (i: number) => void;
  onDown: (i: number) => void;
  onInsert: (i: number) => void;
  onDelete: (i: number) => void;
}

export function LegRow({
  leg,
  view,
  index,
  readonly,
  onField,
  onMode,
  onToggleType,
  onUp,
  onDown,
  onInsert,
  onDelete,
}: Props) {
  const chip = TYPE_CHIP[leg.type];
  const set = (field: keyof Leg) => (e: ChangeEvent<HTMLInputElement>) => onField(index, field, e.target.value);

  // Shared input renderer for the dense cells.
  const inp = (
    field: keyof Leg,
    opts: { width: number; placeholder?: string; align?: 'left' | 'right' | 'center'; mono?: boolean; color?: string; weight?: number },
  ) => (
    <input
      value={leg[field]}
      onChange={set(field)}
      disabled={readonly}
      placeholder={opts.placeholder ?? '—'}
      style={{ width: opts.width, color: opts.color, fontWeight: opts.weight, textAlign: opts.align ?? 'left' }}
      className={`rounded border border-transparent bg-transparent px-1 py-[3px] text-[0.72rem] outline-none focus:border-cyan focus:bg-surface hover:bg-rail ${
        opts.mono ? 'font-mono' : ''
      }`}
    />
  );

  return (
    <tr style={{ background: chip.row }}>
      {/* Type */}
      <td className={`${tdCls} px-1.5 py-[3px] text-center`}>
        <span
          onClick={() => onToggleType(index)}
          className="rounded-[5px] border px-[7px] py-0.5 font-mono text-[0.58rem] font-extrabold tracking-[0.5px]"
          style={{ background: chip.bg, color: chip.fg, borderColor: chip.bd, cursor: readonly ? 'default' : 'pointer' }}
        >
          {chip.label}
        </span>
      </td>
      {/* Date */}
      <td className={`${tdCls} px-1`}>{inp('date', { width: 96, placeholder: 'YYYY-MM-DD', mono: true })}</td>
      {/* Location */}
      <td className={`${tdCls} px-1`}>{inp('port', { width: 158, weight: 600 })}</td>
      {/* Dist */}
      <td className={`${tdCls} px-1 text-right`}>
        {view.isPort ? inp('dist', { width: 62, align: 'right', mono: true }) : dash}
      </td>
      {/* Mode */}
      <td className={`${tdCls} px-1 text-center`}>
        {view.isPort && (
          <span className="inline-flex overflow-hidden rounded-md border border-line">
            <span
              onClick={() => onMode(index, 'speed')}
              className="cursor-pointer px-1.5 py-[3px] text-[0.54rem] font-extrabold tracking-[0.5px]"
              style={leg.mode === 'speed' ? { background: '#06b6d4', color: '#fff' } : { background: '#fff', color: '#6B7B8F' }}
            >
              SPD
            </span>
            <span
              onClick={() => onMode(index, 'time')}
              className="cursor-pointer border-l border-line px-1.5 py-[3px] text-[0.54rem] font-extrabold tracking-[0.5px]"
              style={leg.mode !== 'speed' ? { background: '#6366F1', color: '#fff' } : { background: '#fff', color: '#6B7B8F' }}
            >
              TIME
            </span>
          </span>
        )}
      </td>
      {/* Time (computed) */}
      <td className={`${tdCls} px-1.5 text-right`}>
        <div className="font-mono text-[0.74rem] font-bold" style={{ color: view.timeComputed ? '#1A2233' : '#B0BAC6' }}>
          {view.timeDisplay}
        </div>
      </td>
      {/* Speed */}
      <td className={`${tdCls} px-1 text-right`}>
        {view.speedComputed ? (
          view.speedDisplay ? (
            <span
              className="inline-block rounded-[5px] px-[7px] py-0.5 font-mono text-[0.74rem] font-extrabold"
              style={{
                color: SPEED_COLORS[view.speedBand ?? 'ok'].fg,
                background: SPEED_COLORS[view.speedBand ?? 'ok'].bg,
              }}
            >
              {view.speedDisplay}
            </span>
          ) : (
            dash
          )
        ) : view.speedInput ? (
          <input
            value={leg.speed}
            onChange={set('speed')}
            disabled={readonly}
            placeholder="kn"
            style={{ width: 54 }}
            className="rounded border border-cyan bg-[#ECFEFF] px-1 py-[3px] text-right font-mono text-[0.72rem] font-bold outline-none focus:bg-surface"
          />
        ) : null}
      </td>
      {/* ETA */}
      <td className={`${tdCls} px-1 text-center`}>
        {view.isSea ? (
          dash
        ) : view.etaComputed ? (
          <span className="font-mono text-[0.72rem] font-bold text-cyan-deep">{view.etaDisplay}</span>
        ) : (
          inp('eta', { width: 52, placeholder: 'hh:mm', align: 'center', mono: true })
        )}
      </td>
      {/* Arr / Dep / FAW */}
      <td className={`${tdCls} px-1 text-center`}>{view.isPort ? inp('arr', { width: 52, placeholder: 'hh:mm', align: 'center', mono: true }) : dash}</td>
      <td className={`${tdCls} px-1 text-center`}>{view.isPort ? inp('dep', { width: 52, placeholder: 'hh:mm', align: 'center', mono: true }) : dash}</td>
      <td className={`${tdCls} px-1 text-center`}>{view.isPort ? inp('faw', { width: 52, placeholder: 'hh:mm', align: 'center', mono: true }) : dash}</td>
      {/* Arr St/By: distance · time · speed */}
      <td className={`${tdCls} px-1 text-center`}>
        {view.isPort ? inp('stbyArrDist', { width: 46, align: 'right', mono: true }) : dash}
      </td>
      <td className={`${tdCls} px-1.5 text-center`}>
        <span className="font-mono text-[0.7rem] text-amber">{view.isPort ? view.stbyArrTime : '—'}</span>
      </td>
      <td className={`${tdCls} px-1.5 text-center`}>
        {view.stbyArrSpeed ? (
          <span className="font-mono text-[0.7rem] font-bold text-cyan-deep">{view.stbyArrSpeed}</span>
        ) : (
          dash
        )}
      </td>
      {/* Dep St/By: distance · time · speed */}
      <td className={`${tdCls} px-1 text-center`}>
        {view.isPort ? inp('stbyDepDist', { width: 46, align: 'right', mono: true }) : dash}
      </td>
      <td className={`${tdCls} px-1.5 text-center`}>
        <span className="font-mono text-[0.7rem] text-amber">{view.isPort ? view.stbyDepTime : '—'}</span>
      </td>
      <td className={`${tdCls} px-1.5 text-center`}>
        {view.stbyDepSpeed ? (
          <span className="font-mono text-[0.7rem] font-bold text-cyan-deep">{view.stbyDepSpeed}</span>
        ) : (
          dash
        )}
      </td>
      {/* Port hrs */}
      <td className={`${tdCls} px-1.5 text-center`}>
        <span className="font-mono text-[0.7rem] text-pink">{view.portDisplay}</span>
      </td>
      {/* Sunrise / Sunset */}
      <td className={`${tdCls} px-1 text-center`}>{view.isPort ? inp('sunrise', { width: 52, placeholder: 'hh:mm', align: 'center', mono: true, color: '#6B7B8F' }) : dash}</td>
      <td className={`${tdCls} px-1 text-center`}>{view.isPort ? inp('sunset', { width: 52, placeholder: 'hh:mm', align: 'center', mono: true, color: '#6B7B8F' }) : dash}</td>
      {/* Daylight */}
      <td className={`${tdCls} px-1.5 text-center`}>
        <span className="font-mono text-[0.7rem]" style={{ color: view.hasDaylight ? '#D97706' : '#B0BAC6' }}>
          {view.daylightDisplay}
        </span>
      </td>
      {/* UTC ± */}
      <td className={`${tdCls} px-1 text-center`}>{inp('utc', { width: 44, placeholder: '±0', align: 'center', mono: true, color: '#0891b2', weight: 700 })}</td>
      {/* Open Loop / Sea Cond */}
      <td className={`${tdCls} px-1 text-center`}>{view.isPort ? inp('openLoop', { width: 58, placeholder: 'HH:mm', align: 'center', mono: true, color: '#0284C7' }) : dash}</td>
      <td className={`${tdCls} px-1 text-center`}>{view.isPort ? inp('seaCond', { width: 58, placeholder: 'HH:mm', align: 'center', mono: true, color: '#6366F1' }) : dash}</td>
      {/* Remarks */}
      <td className={`${tdCls} px-1`}>{inp('remarks', { width: 150, color: '#6B7B8F' })}</td>
      {/* Actions */}
      <td className="whitespace-nowrap border-b border-line px-1.5 py-[3px] text-center">
        <span className="inline-flex gap-0.5" style={{ opacity: readonly ? 0.25 : 1 }}>
          <ActionBtn title="Move up" hover="#0891b2" onClick={() => onUp(index)}>↑</ActionBtn>
          <ActionBtn title="Move down" hover="#0891b2" onClick={() => onDown(index)}>↓</ActionBtn>
          <ActionBtn title="Insert below" hover="#059669" onClick={() => onInsert(index)}>＋</ActionBtn>
          <ActionBtn title="Delete" hover="#DC2626" onClick={() => onDelete(index)}>✕</ActionBtn>
        </span>
      </td>
    </tr>
  );
}

function ActionBtn({
  children,
  title,
  hover,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  hover: string;
  onClick: () => void;
}) {
  return (
    <span
      title={title}
      onClick={onClick}
      className="cursor-pointer rounded px-[3px] text-[0.8rem] leading-none text-muted hover:bg-rail"
      style={{ ['--hov' as string]: hover }}
      onMouseEnter={(e) => (e.currentTarget.style.color = hover)}
      onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7B8F')}
    >
      {children}
    </span>
  );
}
