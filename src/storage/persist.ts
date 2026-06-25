// Lossless autosave to localStorage (design used the same key). This makes a
// refresh non-destructive even without a manual JSON Save; the .json file
// (storage/jsonFile.ts) is the portable record / hand-off artifact.
import type { VoyageMap } from '../types';

const KEY = 'vt_speed_voyages_v6';

interface PersistShape {
  voyages: VoyageMap;
  selectedId: string;
}

export function loadPersisted(): PersistShape | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved && saved.voyages) {
      return { voyages: saved.voyages, selectedId: saved.selectedId ?? '' };
    }
  } catch {
    /* ignore corrupt cache */
  }
  return null;
}

export function persist(voyages: VoyageMap, selectedId: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ voyages, selectedId }));
  } catch {
    /* quota / private mode — non-fatal */
  }
}
