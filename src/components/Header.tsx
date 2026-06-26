// Top bar — brand + ship, signed-in user, JSON Save/Open, XLSX export, Lock/Edit.
import { useEffect, useRef, useState } from 'react';
import type { Ship } from '../types';
import type { XlsxScope } from '../storage/excel';
import { THEMES, type Theme } from '../hooks/useTheme';
import {
  CompassIcon,
  DownloadIcon,
  FileIcon,
  GridIcon,
  SaveIcon,
  UploadIcon,
  LockIcon,
  EditIcon,
  PaletteIcon,
  CheckIcon,
} from './Icons';

interface Props {
  ship: Ship;
  userLabel: string; // "M. Archontakis · Navigation Officer"
  canEdit: boolean;
  editing: boolean; // session edit-authorised AND current voyage unlocked
  voyageTotal: number;
  exportMenu: boolean;
  onToggleExportMenu: () => void;
  onCloseExportMenu: () => void;
  onExportXlsx: (scope: XlsxScope) => void;
  onSaveJson: () => void;
  onSaveJsonAs: () => void;
  boundFile: string; // bound .json name for in-place Save ('' if none)
  onOpenJson: () => void;
  onImportExcel: () => void;
  onToggleLock: () => void;
  onSignOut: () => void;
  theme: Theme;
  onSetTheme: (t: Theme) => void;
}

export function Header({
  ship,
  userLabel,
  canEdit,
  editing,
  voyageTotal,
  exportMenu,
  onToggleExportMenu,
  onCloseExportMenu,
  onExportXlsx,
  onSaveJson,
  onSaveJsonAs,
  boundFile,
  onOpenJson,
  onImportExcel,
  onToggleLock,
  onSignOut,
  theme,
  onSetTheme,
}: Props) {
  const iconBtn =
    'inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-[0.75rem] font-semibold text-ink hover:bg-rail';
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (exportMenu) menuRef.current?.querySelector('button')?.focus();
  }, [exportMenu]);

  const [themeMenu, setThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (themeMenu) themeMenuRef.current?.querySelector('button')?.focus();
  }, [themeMenu]);
  return (
    <header className="z-[5] flex h-14 flex-shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
      <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-cyan text-white">
        <CompassIcon size={15} />
      </span>
      <div>
        <div className="text-[0.95rem] font-extrabold leading-tight tracking-[-0.2px]">
          Voyage Speed Tracker <span className="font-medium opacity-65">— {ship.name}</span>
        </div>
        <div className="font-mono text-[0.6rem] uppercase tracking-[1px] text-faint">
          {ship.code} · {ship.built} · Speed &amp; Time Template
        </div>
      </div>

      <div className="flex-1" />

      {/* signed-in user + theme + sign out */}
      <div className="flex items-center gap-2">
        <span className="hidden text-[0.68rem] text-muted sm:inline">{userLabel}</span>
        <div className="relative">
          <button
            onClick={() => setThemeMenu((o) => !o)}
            className={iconBtn}
            aria-haspopup="menu"
            aria-expanded={themeMenu}
            title="Themes"
          >
            <PaletteIcon size={14} /> Themes <span className="text-[0.6rem] opacity-45">{themeMenu ? '▴' : '▾'}</span>
          </button>
          {themeMenu && (
            <div className="fixed inset-0 z-40" onClick={() => setThemeMenu(false)}>
              <div
                ref={themeMenuRef}
                role="menu"
                aria-label="Select a theme"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setThemeMenu(false);
                }}
                className="vt-scale-in absolute right-0 top-[42px] min-w-[208px] overflow-hidden rounded-[10px] border border-line bg-surface p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.15)]"
              >
                {THEMES.map((t) => {
                  const active = t.value === theme;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => {
                        onSetTheme(t.value);
                        setThemeMenu(false);
                      }}
                      className="vt-unbutton flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-rail"
                    >
                      <span className="inline-flex w-3.5 justify-center text-cyan-deep">
                        {active ? <CheckIcon size={13} /> : null}
                      </span>
                      <span className="flex-1">
                        <span className="block text-[0.78rem] font-semibold text-ink">{t.label}</span>
                        <span className="block text-[0.62rem] text-muted">{t.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <button onClick={onSignOut} className={iconBtn} title="Switch ship / sign out">
          <span aria-hidden="true">⇄</span> Switch
        </button>
      </div>

      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.62rem] font-bold tracking-[0.8px]"
        style={
          editing
            ? { background: '#FFFBEB', color: '#D97706', borderColor: '#FDE68A' }
            : { background: 'var(--color-rail)', color: 'var(--color-muted)', borderColor: 'var(--color-line)' }
        }
      >
        {!canEdit ? 'VIEW ONLY · MARINE' : editing ? 'EDIT MODE' : 'VIEW ONLY'}
      </span>

      {canEdit && (
        <button onClick={onImportExcel} className={iconBtn} title="Import voyages from an Excel (.xlsx) template">
          <FileIcon size={13} /> Import
        </button>
      )}
      {canEdit && (
        <button onClick={onOpenJson} className={iconBtn} title="Open a voyages .json file">
          <UploadIcon size={13} /> Open
        </button>
      )}
      <button
        onClick={onSaveJson}
        className={iconBtn}
        title={boundFile ? `Save in place to ${boundFile}` : 'Save all voyages to a .json file…'}
      >
        <SaveIcon size={13} /> Save
      </button>
      {boundFile && (
        <>
          <button onClick={onSaveJsonAs} className={iconBtn} title="Save a copy to a new .json file">
            Save As…
          </button>
          <span
            className="hidden max-w-[150px] items-center gap-1 truncate font-mono text-[0.6rem] text-faint lg:inline-flex"
            title={`Saving in place to ${boundFile}`}
          >
            <span aria-hidden="true">↳</span>
            {boundFile}
          </span>
        </>
      )}

      <div className="relative">
        <button
          onClick={onToggleExportMenu}
          className={iconBtn}
          aria-haspopup="menu"
          aria-expanded={exportMenu}
        >
          <DownloadIcon size={13} /> Export <span className="text-[0.6rem] opacity-45">{exportMenu ? '▴' : '▾'}</span>
        </button>
        {exportMenu && (
          <div className="fixed inset-0 z-40" onClick={onCloseExportMenu}>
            <div
              ref={menuRef}
              role="menu"
              aria-label="Export to Excel"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onCloseExportMenu();
              }}
              className="vt-scale-in absolute right-4 top-[58px] min-w-[218px] overflow-hidden rounded-[10px] border border-line bg-surface p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.15)]"
            >
              <div className="px-2 pb-1 pt-1.5 text-[0.5rem] font-bold uppercase tracking-[1.2px] text-faint">
                Excel · template format
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => onExportXlsx('current')}
                className="vt-unbutton flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[0.78rem] text-ink hover:bg-rail"
              >
                <span className="inline-flex text-cyan-deep">
                  <FileIcon size={14} />
                </span>
                This voyage
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => onExportXlsx('all')}
                className="vt-unbutton flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[0.78rem] text-ink hover:bg-rail"
              >
                <span className="inline-flex text-green">
                  <GridIcon size={14} />
                </span>
                All voyages
                <span className="ml-auto font-mono text-[0.6rem] text-faint">{voyageTotal}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {canEdit && (
        <button
          onClick={onToggleLock}
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[0.75rem] font-semibold text-white hover:brightness-95"
          style={{ background: editing ? 'var(--color-btn-strong)' : 'var(--color-amber-btn)' }}
        >
          <span className="inline-flex">{editing ? <LockIcon size={13} /> : <EditIcon size={13} />}</span>
          {editing ? 'Lock Voyage' : 'Enable Edit'}
        </button>
      )}
    </header>
  );
}
