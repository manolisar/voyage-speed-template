// One leg row in the table. Reads raw values from the Leg and computed
// display values from its LegView. Field/column set ported from the design.
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Leg, LegType } from '../types';
import type { LegView, SpeedBand } from '../domain/calculations';

// Columns 0..FROZEN-1 (Type … Speed) are frozen to the left when the table
// scrolls horizontally; their left offsets are measured by LegsTable.
const FROZEN = 7;

const TYPE_CHIP: Record<LegType, { label: string; bg: string; fg: string; bd: string; row: string; solid: string }> = {
  Port: { label: 'PORT', bg: '#EFF6FF', fg: '#2563EB', bd: '#BFDBFE', row: 'var(--color-surface)', solid: 'var(--color-surface)' },
  Sea: { label: 'SEA', bg: '#ECFEFF', fg: '#0891b2', bd: '#A5F3FC', row: 'rgba(2,132,199,0.05)', solid: 'color-mix(in srgb, #0284C7 5%, var(--color-surface))' },
  Tender: { label: 'TENDER', bg: '#FFF7ED', fg: '#EA580C', bd: '#FED7AA', row: 'rgba(234,88,12,0.06)', solid: 'color-mix(in srgb, #EA580C 6%, var(--color-surface))' },
};

// Speed-band warning colours. In-band speeds render in plain ink; only the
// out-of-range bands (hi/lo) get a colour + thin underline accent, so colour
// means "attention" rather than decoration. Theme-aware via tokens.
const SPEED_VAR: Record<SpeedBand, string> = {
  hi: 'var(--color-spd-hi-fg)',
  lo: 'var(--color-spd-lo-fg)',
  ok: 'var(--color-spd-ok-fg)',
};

const tdCls = 'border-b border-r border-line';
const dash = <span className="font-mono text-[0.72rem] text-faint">—</span>;

// Accessible names for the otherwise-unlabeled grid inputs.
const FIELD_LABEL: Partial<Record<keyof Leg, string>> = {
  date: 'Date',
  port: 'Location',
  dist: 'Distance in nautical miles',
  eta: 'ETA',
  arr: 'Arrival',
  dep: 'Departure',
  faw: 'Full away (FAW)',
  sunrise: 'Sunrise',
  sunset: 'Sunset',
  utc: 'UTC offset',
  openLoop: 'Open loop time',
  seaCond: 'Sea condition time',
  stbyArrDist: 'Arrival St/By distance',
  stbyDepDist: 'Departure St/By distance',
  remarks: 'Remarks',
  speed: 'Target speed in knots',
};
const NUMERIC_FIELDS = new Set<keyof Leg>(['dist', 'utc', 'speed', 'stbyArrDist', 'stbyDepDist']);

interface Props {
  leg: Leg;
  view: LegView;
  index: number;
  readonly: boolean;
  lefts: number[]; // measured left offsets for the frozen columns
  fillActive: boolean; // this row is within an in-progress date fill range
  onField: (i: number, field: keyof Leg, val: string) => void;
  onMode: (i: number, mode: 'speed' | 'time') => void;
  onToggleType: (i: number) => void;
  onUp: (i: number) => void;
  onDown: (i: number) => void;
  onInsert: (i: number) => void;
  onDelete: (i: number) => void;
  onFillPreview: (from: number, to: number) => void;
  onFillCommit: (from: number, to: number) => void;
}

export function LegRow({
  leg,
  view,
  index,
  readonly,
  lefts,
  fillActive,
  onField,
  onMode,
  onToggleType,
  onUp,
  onDown,
  onInsert,
  onDelete,
  onFillPreview,
  onFillCommit,
}: Props) {
  const chip = TYPE_CHIP[leg.type];
  const set = (field: keyof Leg) => (e: ChangeEvent<HTMLInputElement>) => onField(index, field, e.target.value);

  // Sticky style for the first FROZEN columns. `bg` keeps frozen cells opaque
  // so scrolled columns don't bleed through their transparent row tint.
  const frozen = (col: number, bg = chip.solid): CSSProperties | undefined =>
    col < FROZEN ? { position: 'sticky', left: lefts[col] ?? 0, zIndex: 10, background: bg } : undefined;
  const edge = (col: number) => (col === FROZEN - 1 ? ' vt-freeze-edge' : '');

  // Excel-style fill handle: drag down from a date cell to write a +1-day
  // series into the rows below. Tracks the pointer over rows by their
  // data-leg-index, previews live, and commits on release.
  const startFill = (e: PointerEvent) => {
    if (readonly) return;
    e.preventDefault();
    e.stopPropagation();
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'crosshair';
    let target = index;
    const move = (ev: globalThis.PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const tr = el?.closest('[data-leg-index]') as HTMLElement | null;
      if (tr) {
        const n = Number(tr.dataset.legIndex);
        if (!Number.isNaN(n)) target = Math.max(index, n);
      }
      onFillPreview(index, target);
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      onFillPreview(-1, -1);
      if (target > index) onFillCommit(index, target);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    onFillPreview(index, index);
  };

  // Shared input renderer for the dense cells.
  const inp = (
    field: keyof Leg,
    opts: { width: number; placeholder?: string; align?: 'left' | 'right' | 'center'; mono?: boolean; color?: string; weight?: number },
  ) => (
    <input
      value={leg[field]}
      onChange={set(field)}
      disabled={readonly}
      aria-label={`${FIELD_LABEL[field] ?? field}, leg ${index + 1}`}
      inputMode={NUMERIC_FIELDS.has(field) ? 'decimal' : undefined}
      spellCheck={false}
      placeholder={opts.placeholder ?? '—'}
      style={{ width: opts.width, color: opts.color ?? 'var(--color-ink)', fontWeight: opts.weight, textAlign: opts.align ?? 'left' }}
      className={`rounded border border-transparent bg-transparent px-1 py-[3px] text-[0.72rem] outline-none focus:border-cyan focus:bg-surface hover:bg-rail ${
        opts.mono ? 'font-mono' : ''
      }`}
    />
  );

  const dateBg = fillActive ? 'color-mix(in srgb, var(--color-cyan) 16%, var(--color-surface))' : chip.solid;

  // Out-of-band speeds get a vertical accent on the Speed cell's left edge
  // (calmer than an underline). The border is always reserved (transparent when
  // in-band) so flagged rows don't shift the column.
  const speedBand = view.speedBand && view.speedBand !== 'ok' ? view.speedBand : null;
  const speedAccent = speedBand ? SPEED_VAR[speedBand] : 'transparent';

  return (
    <tr data-leg-index={index} style={{ background: chip.row }}>
      {/* Type */}
      <td className={`${tdCls} px-1.5 py-[3px] text-center${edge(0)}`} style={frozen(0)}>
        <button
          type="button"
          onClick={() => onToggleType(index)}
          disabled={readonly}
          aria-label={`Leg ${index + 1} type: ${chip.label}. Change type`}
          className="vt-unbutton rounded-[5px] border px-[7px] py-0.5 font-mono text-[0.58rem] font-extrabold tracking-[0.5px]"
          style={{
            background: 'transparent',
            color: chip.fg,
            borderColor: `color-mix(in srgb, ${chip.fg} 38%, transparent)`,
            cursor: readonly ? 'default' : 'pointer',
          }}
        >
          {chip.label}
        </button>
      </td>
      {/* Date — with Excel-style fill handle */}
      <td className={`${tdCls} relative px-1${edge(1)}`} style={frozen(1, dateBg)}>
        {inp('date', { width: 96, placeholder: 'YYYY-MM-DD', mono: true })}
        {!readonly && (
          <span
            role="button"
            tabIndex={-1}
            aria-label={`Fill dates below from leg ${index + 1}`}
            title="Drag down to fill the dates below"
            onPointerDown={startFill}
            className="vt-fill-handle absolute bottom-[3px] right-[4px] h-[8px] w-[8px] cursor-crosshair rounded-[2px] border border-surface bg-cyan shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
          />
        )}
      </td>
      {/* Location */}
      <td className={`${tdCls} px-1${edge(2)}`} style={frozen(2)}>{inp('port', { width: 158, weight: 600 })}</td>
      {/* Dist */}
      <td className={`${tdCls} px-1 text-right${edge(3)}`} style={frozen(3)}>
        {view.isPort ? inp('dist', { width: 62, align: 'right', mono: true }) : dash}
      </td>
      {/* Mode */}
      <td className={`${tdCls} px-1 text-center${edge(4)}`} style={frozen(4)}>
        {view.isPort && (
          <span className="inline-flex overflow-hidden rounded-md border border-line" role="group" aria-label={`Leg ${index + 1} solve mode`}>
            <button
              type="button"
              onClick={() => onMode(index, 'speed')}
              disabled={readonly}
              aria-pressed={leg.mode === 'speed'}
              aria-label="Speed mode: enter times, compute speed"
              className="vt-unbutton px-2 py-[3px] text-[0.56rem] font-extrabold tracking-[0.6px]"
              style={leg.mode === 'speed' ? { background: '#06b6d4', color: '#fff' } : { background: 'var(--color-surface)', color: 'var(--color-muted)' }}
            >
              SPD
            </button>
            <button
              type="button"
              onClick={() => onMode(index, 'time')}
              disabled={readonly}
              aria-pressed={leg.mode !== 'speed'}
              aria-label="Time mode: enter target speed, compute ETA"
              className="vt-unbutton border-l-2 border-line px-2 py-[3px] text-[0.56rem] font-extrabold tracking-[0.6px]"
              style={leg.mode !== 'speed' ? { background: '#6366F1', color: '#fff' } : { background: 'var(--color-surface)', color: 'var(--color-muted)' }}
            >
              TIME
            </button>
          </span>
        )}
      </td>
      {/* Time (computed) */}
      <td className={`${tdCls} px-1.5 text-right${edge(5)}`} style={frozen(5)}>
        <div className="font-mono text-[0.74rem] font-bold" style={{ color: view.timeComputed ? 'var(--color-ink)' : 'var(--color-faint)' }}>
          {view.timeDisplay}
        </div>
      </td>
      {/* Speed */}
      <td className={`${tdCls} px-1 text-right${edge(6)}`} style={{ ...frozen(6), borderLeft: `3px solid ${speedAccent}` }}>
        {view.speedComputed ? (
          view.speedDisplay ? (
            <span
              className="inline-block font-mono text-[0.74rem] font-extrabold"
              style={{ color: speedBand ? SPEED_VAR[speedBand] : 'var(--color-ink)' }}
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
            aria-label={`Target speed in knots, leg ${index + 1}`}
            inputMode="decimal"
            spellCheck={false}
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
        {view.isPort ? inp('stbyArrDist', { width: 46, align: 'center', mono: true }) : dash}
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
        {view.isPort ? inp('stbyDepDist', { width: 46, align: 'center', mono: true }) : dash}
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
      <td className={`${tdCls} px-1 text-center`}>{view.isPort ? inp('sunrise', { width: 52, placeholder: 'hh:mm', align: 'center', mono: true, color: 'var(--color-muted)' }) : dash}</td>
      <td className={`${tdCls} px-1 text-center`}>{view.isPort ? inp('sunset', { width: 52, placeholder: 'hh:mm', align: 'center', mono: true, color: 'var(--color-muted)' }) : dash}</td>
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
      <td className={`${tdCls} px-1`}>
        <RemarksCell value={leg.remarks} readonly={readonly} index={index} onChange={(v) => onField(index, 'remarks', v)} />
      </td>
      {/* Actions */}
      <td className="whitespace-nowrap border-b border-line px-1.5 py-[3px] text-center">
        <span className="inline-flex gap-0.5">
          <ActionBtn label={`Move leg ${index + 1} up`} hoverClass="hover:text-cyan-deep" disabled={readonly} onClick={() => onUp(index)}>↑</ActionBtn>
          <ActionBtn label={`Move leg ${index + 1} down`} hoverClass="hover:text-cyan-deep" disabled={readonly} onClick={() => onDown(index)}>↓</ActionBtn>
          <ActionBtn label={`Insert leg below leg ${index + 1}`} hoverClass="hover:text-green" disabled={readonly} onClick={() => onInsert(index)}>＋</ActionBtn>
          <ActionBtn label={`Delete leg ${index + 1}`} hoverClass="hover:text-[#DC2626]" disabled={readonly} onClick={() => onDelete(index)}>✕</ActionBtn>
        </span>
      </td>
    </tr>
  );
}

// Remarks cell: a full-width single-line input plus an expandable panel that
// reveals the whole note in a wrapping textarea (long remarks no longer clip).
function RemarksCell({
  value,
  readonly,
  index,
  onChange,
}: {
  value: string;
  readonly: boolean;
  index: number;
  onChange: (v: string) => void;
}) {
  const PANEL_W = 320;
  const PANEL_H = 150;
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Position the portal panel relative to the toggle, flipping above the button
  // when there isn't room below (keeps bottom rows from being clipped).
  const place = () => {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return;
    const flipUp = b.bottom + PANEL_H + 8 > window.innerHeight;
    const top = flipUp ? b.top - PANEL_H - 6 : b.bottom + 6;
    const left = Math.max(8, Math.min(b.right - PANEL_W, window.innerWidth - PANEL_W - 8));
    setPos({ left, top: Math.max(8, top) });
  };

  useLayoutEffect(() => {
    if (open) place();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    // Re-place on viewport changes; close on any scroll (fixed panel would drift).
    window.addEventListener('resize', place);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="flex items-center gap-1">
      {/* readOnly (not disabled) in view mode so the text stays full-contrast
          and selectable — a disabled field greys it out and blocks copy. */}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readonly}
        aria-label={`Remarks, leg ${index + 1}`}
        spellCheck={false}
        placeholder="—"
        className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-[3px] text-[0.72rem] text-muted outline-none focus:border-cyan focus:bg-surface hover:bg-rail"
      />
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} remarks for leg ${index + 1}`}
        title="Expand remarks"
        className="vt-unbutton flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-faint hover:bg-rail hover:text-ink"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.12s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open &&
        pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              className="fixed z-[101] rounded-lg border border-line bg-surface p-2 shadow-[0_8px_24px_rgba(15,23,42,0.18)]"
              style={{ left: pos.left, top: pos.top, width: PANEL_W }}
            >
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                readOnly={readonly}
                rows={5}
                autoFocus
                spellCheck={false}
                placeholder="Remarks…"
                aria-label={`Full remarks for leg ${index + 1}`}
                className="w-full resize-y whitespace-pre-wrap break-words rounded border border-line bg-bg px-2 py-1.5 text-[0.74rem] leading-relaxed text-ink outline-none focus:border-cyan"
              />
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

function ActionBtn({
  children,
  label,
  hoverClass,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  hoverClass: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`vt-unbutton rounded px-[3px] text-[0.8rem] leading-none text-muted hover:bg-rail disabled:opacity-25 ${hoverClass}`}
    >
      {children}
    </button>
  );
}
