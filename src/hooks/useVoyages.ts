// App state machine — voyages, selection, filters, lock/version workflow,
// leg mutations, and JSON save/open. Ported from the design artifact's DCLogic
// class into a single React hook so the components stay presentational.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Filter, Leg, LegType, Voyage, VoyageMap } from '../types';
import { seedVoyages, SEED_SELECTED_ID } from '../domain/seed';
import { loadPersisted, persist } from '../storage/persist';
import { saveJson, openJson } from '../storage/jsonFile';

function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
  );
}

const TYPE_CYCLE: LegType[] = ['Port', 'Sea', 'Tender'];

export interface VoyagesApi {
  voyages: VoyageMap;
  selectedId: string;
  current: Voyage | undefined;
  editable: boolean;
  filter: Filter;
  search: string;
  showUnlock: boolean;
  unlockNote: string;
  toast: string;
  exportMenu: boolean;
  expandedQ: Record<string, boolean>;

  setSearch: (s: string) => void;
  setFilter: (f: Filter) => void;
  selectVoyage: (id: string) => void;
  toggleQuarter: (qk: string) => void;

  updateLeg: (i: number, field: keyof Leg, val: string) => void;
  setMode: (i: number, mode: 'speed' | 'time') => void;
  toggleType: (i: number) => void;
  addLeg: (type: LegType) => void;
  insertLeg: (i: number) => void;
  deleteLeg: (i: number) => void;
  moveLeg: (i: number, dir: -1 | 1) => void;

  toggleLock: () => void;
  setUnlockNote: (s: string) => void;
  confirmUnlock: () => void;
  cancelUnlock: () => void;

  setExportMenu: (open: boolean) => void;
  flash: (msg: string) => void;

  doSaveJson: () => Promise<void>;
  doOpenJson: () => Promise<void>;
}

export function useVoyages(): VoyagesApi {
  const initial = useMemo(() => {
    const p = loadPersisted();
    if (p) return { voyages: p.voyages, selectedId: p.selectedId || SEED_SELECTED_ID };
    return { voyages: seedVoyages(), selectedId: SEED_SELECTED_ID };
  }, []);

  const [voyages, setVoyages] = useState<VoyageMap>(initial.voyages);
  const [selectedId, setSelectedId] = useState<string>(initial.selectedId);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [showUnlock, setShowUnlock] = useState(false);
  const [unlockNote, setUnlockNote] = useState('');
  const [toast, setToast] = useState('');
  const [exportMenu, setExportMenu] = useState(false);
  const [expandedQ, setExpandedQ] = useState<Record<string, boolean>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // autosave
  useEffect(() => {
    persist(voyages, selectedId);
  }, [voyages, selectedId]);

  const current = voyages[selectedId];
  const editable = !!current && !current.locked;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }, []);

  // Immutable mutate of the selected voyage.
  const mutate = useCallback(
    (fn: (v: Voyage) => void) => {
      setVoyages((prev) => {
        const next: VoyageMap = JSON.parse(JSON.stringify(prev));
        const v = next[selectedId];
        if (!v) return prev;
        fn(v);
        return next;
      });
    },
    [selectedId],
  );

  const guessUtc = useCallback((): string => {
    const v = voyages[selectedId];
    if (v) {
      for (let i = v.legs.length - 1; i >= 0; i--) {
        if (v.legs[i].utc !== '') return v.legs[i].utc;
      }
    }
    return '-5';
  }, [voyages, selectedId]);

  const blankLeg = useCallback(
    (type: LegType): Leg => ({
      type,
      date: '',
      port: type === 'Sea' ? 'At Sea' : type === 'Tender' ? 'Anchorage' : '',
      dist: '',
      mode: 'speed',
      eta: '',
      arr: '',
      dep: '',
      faw: '',
      sunrise: '',
      sunset: '',
      utc: guessUtc(),
      openLoop: '',
      seaCond: '',
      remarks: '',
      speed: '',
    }),
    [guessUtc],
  );

  const updateLeg = useCallback(
    (i: number, field: keyof Leg, val: string) => {
      if (!editable && field !== 'type') return;
      mutate((v) => {
        (v.legs[i][field] as string) = val;
      });
    },
    [editable, mutate],
  );

  const setMode = useCallback(
    (i: number, mode: 'speed' | 'time') => {
      if (!editable) return;
      mutate((v) => {
        v.legs[i].mode = mode;
      });
    },
    [editable, mutate],
  );

  const toggleType = useCallback(
    (i: number) => {
      if (!editable) return;
      mutate((v) => {
        const cur = v.legs[i].type;
        v.legs[i].type = TYPE_CYCLE[(TYPE_CYCLE.indexOf(cur) + 1) % 3];
      });
    },
    [editable, mutate],
  );

  const addLeg = useCallback(
    (type: LegType) => {
      if (!editable) return;
      const l = blankLeg(type);
      mutate((v) => {
        v.legs.push(l);
      });
      flash((type === 'Sea' ? 'At-sea' : type === 'Tender' ? 'Tender' : 'Port') + ' leg added');
    },
    [editable, blankLeg, mutate, flash],
  );

  const insertLeg = useCallback(
    (i: number) => {
      if (!editable) return;
      const l = blankLeg('Port');
      mutate((v) => {
        v.legs.splice(i + 1, 0, l);
      });
    },
    [editable, blankLeg, mutate],
  );

  const deleteLeg = useCallback(
    (i: number) => {
      if (!editable) return;
      mutate((v) => {
        v.legs.splice(i, 1);
      });
    },
    [editable, mutate],
  );

  const moveLeg = useCallback(
    (i: number, dir: -1 | 1) => {
      if (!editable) return;
      mutate((v) => {
        const j = i + dir;
        if (j < 0 || j >= v.legs.length) return;
        const t = v.legs[i];
        v.legs[i] = v.legs[j];
        v.legs[j] = t;
      });
    },
    [editable, mutate],
  );

  const toggleLock = useCallback(() => {
    const v = voyages[selectedId];
    if (!v) return;
    if (v.locked) {
      setUnlockNote('');
      setShowUnlock(true);
    } else {
      mutate((vo) => {
        vo.locked = true;
        vo.versions.push({ action: 'Locked', by: vo.loggedBy, note: 'Edits committed', at: nowStamp() });
      });
      flash('Voyage locked');
    }
  }, [voyages, selectedId, mutate, flash]);

  const confirmUnlock = useCallback(() => {
    const note = unlockNote.trim() || 'No reason given';
    mutate((vo) => {
      vo.locked = false;
      vo.versions.push({ action: 'Unlocked', by: vo.loggedBy, note, at: nowStamp() });
    });
    setShowUnlock(false);
    setUnlockNote('');
    flash('Unlocked — edit mode enabled');
  }, [unlockNote, mutate, flash]);

  const cancelUnlock = useCallback(() => setShowUnlock(false), []);

  const selectVoyage = useCallback((id: string) => setSelectedId(id), []);
  const toggleQuarter = useCallback((qk: string) => {
    setExpandedQ((prev) => ({ ...prev, [qk]: prev[qk] === false }));
  }, []);

  const doSaveJson = useCallback(async () => {
    try {
      const res = await saveJson(voyages, selectedId);
      if (res) flash(`Saved · ${res.filename}`);
    } catch (e) {
      flash(`Save failed: ${(e as Error).message}`);
    }
  }, [voyages, selectedId, flash]);

  const doOpenJson = useCallback(async () => {
    try {
      const bundle = await openJson();
      if (!bundle) return;
      setVoyages(bundle.voyages);
      setSelectedId(bundle.selectedId || Object.keys(bundle.voyages)[0] || '');
      flash('Voyages loaded from file');
    } catch (e) {
      flash(`Open failed: ${(e as Error).message}`);
    }
  }, [flash]);

  return {
    voyages,
    selectedId,
    current,
    editable,
    filter,
    search,
    showUnlock,
    unlockNote,
    toast,
    exportMenu,
    expandedQ,
    setSearch,
    setFilter,
    selectVoyage,
    toggleQuarter,
    updateLeg,
    setMode,
    toggleType,
    addLeg,
    insertLeg,
    deleteLeg,
    moveLeg,
    toggleLock,
    setUnlockNote,
    confirmUnlock,
    cancelUnlock,
    setExportMenu,
    flash,
    doSaveJson,
    doOpenJson,
  } as VoyagesApi;
}
