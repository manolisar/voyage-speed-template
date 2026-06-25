// Sidebar quarter grouping — ported from the design's schedule()/quarterFor()
// (design lines 531–550). Each voyage is placed in the calendar quarter that
// holds the MIDPOINT of its date span; voyages with no dated legs fall onto a
// synthetic rolling cursor seeded at the fleet schedule start.
import type { VoyageMap } from '../types';

const DAY_MS = 86400000;
const SCHEDULE_START = Date.parse('2026-12-22T00:00:00Z');

interface Span {
  start: number;
  end: number;
  mid: number;
}

function durationDays(title: string): number {
  if (/Crossing/.test(title)) return 13;
  if (/Bahamas Short/.test(title)) return 5;
  if (/Panama/.test(title)) return 11;
  if (/Repositioning/.test(title)) return 12;
  return 8;
}

export function schedule(voyages: VoyageMap): Record<string, Span> {
  const ids = Object.keys(voyages).sort((a, b) => Number(a) - Number(b));
  const out: Record<string, Span> = {};
  let cursor = SCHEDULE_START;
  for (const id of ids) {
    const vo = voyages[id];
    const dates = vo.legs.map((l) => l.date).filter(Boolean).sort();
    let start: number;
    let end: number;
    if (dates.length) {
      start = Date.parse(dates[0] + 'T00:00:00Z');
      end = Date.parse(dates[dates.length - 1] + 'T00:00:00Z');
    } else {
      start = cursor;
      end = cursor + durationDays(vo.title) * DAY_MS;
    }
    out[id] = { start, end, mid: (start + end) / 2 };
    cursor = end + DAY_MS;
  }
  return out;
}

/** 'YYYY · Qn' label for the quarter holding the voyage's midpoint. */
export function quarterFor(voyages: VoyageMap, id: string): string {
  const s = schedule(voyages)[id];
  if (!s) return '—';
  const d = new Date(s.mid);
  return d.getUTCFullYear() + ' · Q' + (Math.floor(d.getUTCMonth() / 3) + 1);
}
