// Identify step — pick ship, enter name, pick role. Runs BEFORE the daily
// password (AuthGate). Stamps the session used for attribution + edit rights.
import { useRef, useState, type FormEvent } from 'react';
import type { Role, Session, ShipCode } from '../types';
import { SHIPS } from '../domain/ships';
import { ROLES, roleCanEdit } from '../domain/roles';
import { CompassIcon } from './Icons';

export function LandingScreen({ initial, onDone }: { initial: Session | null; onDone: (s: Session) => void }) {
  const [ship, setShip] = useState<ShipCode | null>(initial?.ship ?? null);
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState<Role>(initial?.role ?? 'navigation');
  const [touched, setTouched] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const shipGroupRef = useRef<HTMLDivElement>(null);

  const ready = !!ship && name.trim().length > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!ship) {
      shipGroupRef.current?.querySelector('button')?.focus();
      return;
    }
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    onDone({ ship, name: name.trim(), role });
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-navy p-4">
      <form
        onSubmit={submit}
        className="vt-scale-in w-[520px] max-w-[94vw] overflow-hidden rounded-2xl bg-surface shadow-[0_25px_50px_-12px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan text-white">
            <CompassIcon size={17} />
          </span>
          <div>
            <div className="text-[0.95rem] font-extrabold leading-tight tracking-tight">Voyage Speed Tracker</div>
            <div className="font-mono text-[0.6rem] uppercase tracking-[1px] text-faint">
              Solstice-class fleet · sign in
            </div>
          </div>
        </div>

        <div className="px-5 py-5">
          <div id="vst-ship-label" className="mb-2 block text-[0.55rem] font-bold uppercase tracking-[1.2px] text-faint">
            Ship
          </div>
          <div ref={shipGroupRef} role="group" aria-labelledby="vst-ship-label" className="grid grid-cols-5 gap-2">
            {SHIPS.map((s) => {
              const on = ship === s.code;
              return (
                <button
                  type="button"
                  key={s.code}
                  onClick={() => setShip(s.code)}
                  aria-pressed={on}
                  className="flex flex-col items-center gap-1 rounded-lg border px-1 py-2.5 text-center transition-colors"
                  style={
                    on
                      ? { background: 'rgba(6,182,212,0.12)', borderColor: 'rgba(6,182,212,0.55)' }
                      : { background: 'var(--color-surface)', borderColor: 'var(--color-line)' }
                  }
                  aria-label={`${s.name}, built ${s.built}`}
                  title={`${s.name} · ${s.built}`}
                >
                  <span
                    className="font-mono text-[0.95rem] font-extrabold"
                    style={{ color: on ? 'var(--color-cyan-deep)' : 'var(--color-ink)' }}
                  >
                    {s.code}
                  </span>
                  <span className="text-[0.5rem] leading-tight text-muted">{s.name.replace('Celebrity ', '')}</span>
                </button>
              );
            })}
          </div>
          {touched && !ship && (
            <div role="alert" className="mt-1.5 text-[0.66rem] font-semibold text-pink">
              Select a ship.
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vst-name" className="mb-1.5 block text-[0.55rem] font-bold uppercase tracking-[1.2px] text-faint">
                Name
              </label>
              <input
                id="vst-name"
                ref={nameRef}
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={touched && !name.trim()}
                placeholder="e.g. M. Archontakis"
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-cyan"
              />
              {touched && !name.trim() && (
                <div role="alert" className="mt-1.5 text-[0.66rem] font-semibold text-pink">
                  Enter your name.
                </div>
              )}
            </div>
            <div>
              <label htmlFor="vst-role" className="mb-1.5 block text-[0.55rem] font-bold uppercase tracking-[1.2px] text-faint">
                Role
              </label>
              <select
                id="vst-role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-cyan"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                    {!roleCanEdit(r.value) ? ' (view only)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 text-[0.66rem] leading-relaxed text-muted">
            Your name + role are stamped on every change you commit (attribution). Bridge Officer is view-only;
            all other roles may edit. The next screen asks for today&rsquo;s access code.
          </div>
        </div>

        <div className="flex justify-end border-t border-line px-5 py-3.5">
          <button
            type="submit"
            disabled={!ready}
            className="rounded-lg bg-cyan px-4 py-2 text-[0.8rem] font-semibold text-white hover:brightness-95 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
