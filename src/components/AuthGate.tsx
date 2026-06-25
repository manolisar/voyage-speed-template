// Daily password gate. The valid password is "bridge" + today's local date
// (YYYY-MM-DD) — see domain/password.ts. This is a passerby gate, not real
// security (the keyword is shared and the date is public). Once unlocked it
// stamps sessionStorage keyed by today's date, so a tab left open across local
// midnight re-prompts with the new day's password.
import { useState, type FormEvent, type ReactNode } from 'react';
import { checkPassword, localDateKey } from '../domain/password';
import { CompassIcon, LockIcon } from './Icons';

const SS_KEY = 'vst_unlocked';

function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(SS_KEY) === localDateKey();
  } catch {
    return false;
  }
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (checkPassword(value)) {
      try {
        sessionStorage.setItem(SS_KEY, localDateKey());
      } catch {
        /* private mode — still unlock for this render */
      }
      setUnlocked(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-navy p-4">
      <form
        onSubmit={submit}
        className="vt-scale-in w-[400px] max-w-[92vw] overflow-hidden rounded-2xl bg-surface shadow-[0_25px_50px_-12px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan text-white">
            <CompassIcon size={17} />
          </span>
          <div>
            <div className="text-[0.95rem] font-extrabold leading-tight tracking-tight">
              Voyage Speed Tracker
            </div>
            <div className="font-mono text-[0.6rem] uppercase tracking-[1px] text-faint">
              Celebrity Eclipse · EC
            </div>
          </div>
        </div>
        <div className="px-5 py-5">
          <label className="mb-2 flex items-center gap-1.5 text-[0.55rem] font-bold uppercase tracking-[1.2px] text-faint">
            <LockIcon size={11} /> Daily access code
          </label>
          <input
            type="password"
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            placeholder="Enter today's password"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-cyan"
          />
          {error && (
            <div className="mt-2 text-[0.72rem] font-semibold text-[color:var(--color-spd-hi-fg)]">
              Incorrect password for today. The code changes daily.
            </div>
          )}
          <div className="mt-3 text-[0.66rem] leading-relaxed text-muted">
            The access code is the shared keyword followed by today's date. Ask the Chief if you
            don't have it. Access control onboard is the workstation itself — this is a convenience
            gate only.
          </div>
        </div>
        <div className="flex justify-end border-t border-line px-5 py-3.5">
          <button
            type="submit"
            className="rounded-lg bg-cyan px-4 py-2 text-[0.8rem] font-semibold text-white hover:brightness-95"
          >
            Unlock
          </button>
        </div>
      </form>
    </div>
  );
}
