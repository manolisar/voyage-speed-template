// Bridge / engine roles. Edit rights: everyone may unlock and edit EXCEPT the
// generic Bridge Officer, who is view-only (per project decision). Role is also
// stamped into `loggedBy` for attribution — it is a workflow guard, not a
// security boundary (the daily password + workstation are the real gate).
import type { Role } from '../types';

export const ROLES: { value: Role; label: string }[] = [
  { value: 'master', label: 'Master' },
  { value: 'staff', label: 'Staff Captain' },
  { value: 'navigation', label: 'Navigation Officer' },
  { value: 'bridge', label: 'Bridge Officer' },
  { value: 'chief', label: 'Chief Engineer' },
];

const LABELS: Record<Role, string> = Object.fromEntries(ROLES.map((r) => [r.value, r.label])) as Record<Role, string>;

const VIEW_ONLY: ReadonlySet<Role> = new Set<Role>(['bridge']);

export function roleLabel(role: Role): string {
  return LABELS[role] ?? role;
}

export function roleCanEdit(role: Role): boolean {
  return !VIEW_ONLY.has(role);
}

export function isRole(v: unknown): v is Role {
  return typeof v === 'string' && v in LABELS;
}
