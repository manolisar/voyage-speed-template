// .json Save / Open — v8 "JSON is the record" philosophy, single-file flavor.
//
// Prefers the File System Access API (Chromium / Edge — the corporate target)
// so the operator picks a real file on the network share and re-saves in place.
// Falls back to a download anchor / hidden file input on browsers without it
// (Firefox, Safari), so the feature degrades instead of breaking.
import type { Bundle, ShipCode, VoyageMap } from '../types';
import { buildBundle, parseBundle } from './bundle';

// Minimal typings for the File System Access API surface we use (avoids a
// dependency on the full lib + keeps strict mode happy).
interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}
interface FSFileHandle {
  createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>;
  getFile: () => Promise<File>;
}
interface FSAccessWindow {
  showSaveFilePicker?: (opts?: SaveFilePickerOptions) => Promise<FSFileHandle>;
  showOpenFilePicker?: (opts?: {
    types?: { description?: string; accept: Record<string, string[]> }[];
    multiple?: boolean;
  }) => Promise<FSFileHandle[]>;
}

const JSON_TYPES = [{ description: 'Voyage Speed Tracker JSON', accept: { 'application/json': ['.json'] } }];

function suggestedName(ship: ShipCode): string {
  return `${ship}_speed-template_${new Date().toISOString().slice(0, 10)}.json`;
}

export interface SaveResult {
  filename: string;
  method: 'fs-access' | 'download';
}

/** Returns null if the user cancelled the native picker. */
export async function saveJson(ship: ShipCode, voyages: VoyageMap, selectedId: string): Promise<SaveResult | null> {
  const bundle = buildBundle(voyages, selectedId, ship);
  const text = JSON.stringify(bundle, null, 2);
  const w = window as unknown as FSAccessWindow;

  if (typeof w.showSaveFilePicker === 'function') {
    try {
      const handle = await w.showSaveFilePicker({ suggestedName: suggestedName(ship), types: JSON_TYPES });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      const file = await handle.getFile();
      return { filename: file.name, method: 'fs-access' };
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return null; // user cancelled
      // fall through to download on any unexpected picker failure
    }
  }
  return downloadJson(text, suggestedName(ship));
}

function downloadJson(text: string, filename: string): SaveResult {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
  return { filename, method: 'download' };
}

/** Returns the parsed bundle, or null if the user cancelled the picker. */
export async function openJson(): Promise<Bundle | null> {
  const w = window as unknown as FSAccessWindow;
  if (typeof w.showOpenFilePicker === 'function') {
    try {
      const [handle] = await w.showOpenFilePicker({ types: JSON_TYPES, multiple: false });
      const file = await handle.getFile();
      return parseBundle(await file.text());
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return null;
      throw e;
    }
  }
  return openViaInput();
}

function openViaInput(): Promise<Bundle | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        resolve(parseBundle(await file.text()));
      } catch (e) {
        reject(e);
      }
    };
    input.click();
  });
}
