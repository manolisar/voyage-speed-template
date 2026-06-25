import { describe, it, expect } from 'vitest';
import { computeVoyage } from './calculations';
import { seedVoyages } from './seed';

const seed = seedVoyages();

describe('computeVoyage — SPD mode (voyage 586)', () => {
  const { legViews, summary } = computeVoyage(seed['586']);

  it('computes speed from times across the FAW carry (Basseterre, idx 3)', () => {
    const r = legViews[3];
    // 1130 nm over 62.0 h since Fort Lauderdale FAW → 18.2 kn
    expect(r.timeDisplay).toBe('62:00');
    expect(r.speedComputed).toBe(true);
    expect(r.speedDisplay).toBe('18.2');
    expect(r.speedBand).toBe('ok');
  });

  it('derives St/By and Port hours per leg', () => {
    const r = legViews[3];
    expect(r.stbyDisplay).toBe('2:00'); // (Arr−ETA)=1h + (FAW−Dep)=1h
    expect(r.portDisplay).toBe('9:00'); // Dep−Arr
  });

  it('computes daylight = sunset − sunrise', () => {
    expect(legViews[3].daylightDisplay).toBe('11:05'); // 17:38 − 06:33
    expect(legViews[3].hasDaylight).toBe(true);
  });

  it('treats at-sea legs as carriers (no speed math)', () => {
    expect(legViews[1].isSea).toBe(true);
    expect(legViews[1].speedComputed).toBe(false);
    expect(legViews[1].timeDisplay).toBe('—');
  });

  it('rolls up the summary', () => {
    expect(summary.portCalls).toBe(8);
    expect(summary.totalDist).toBe(3324);
    expect(summary.avg).not.toBeNull();
    expect(summary.avg! > 0).toBe(true);
  });
});

describe('computeVoyage — TIME mode (voyage 587)', () => {
  const { legViews } = computeVoyage(seed['587']);

  it('computes ETA from a target speed (CocoCay, idx 2)', () => {
    const r = legViews[2];
    expect(r.etaComputed).toBe(true);
    expect(r.timeDisplay).toBe('23:20'); // 420 nm / 18 kn = 23.333 h
    expect(r.etaDisplay).toBe('16:50');
  });
});

describe('computeVoyage — guards', () => {
  it('returns an empty result for an undefined voyage', () => {
    const { legViews, summary } = computeVoyage(undefined);
    expect(legViews).toEqual([]);
    expect(summary.portCalls).toBe(0);
  });
});
