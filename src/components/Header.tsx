// Top bar — brand + ship, signed-in user, JSON Save/Open, XLSX export, Lock/Edit.
import type { Ship } from '../types';
import type { XlsxScope } from '../storage/excel';
import {
  CompassIcon,
  DownloadIcon,
  FileIcon,
  GridIcon,
  SaveIcon,
  UploadIcon,
  LockIcon,
  EditIcon,
} from './Icons';

interface Props {
  ship: Ship;
  userLabel: string; // "M. Archontakis · Navigation Officer"
  canEdit: boolean;
  locked: boolean;
  voyageTotal: number;
  exportMenu: boolean;
  onToggleExportMenu: () => void;
  onCloseExportMenu: () => void;
  onExportXlsx: (scope: XlsxScope) => void;
  onSaveJson: () => void;
  onOpenJson: () => void;
  onImportExcel: () => void;
  onToggleLock: () => void;
  onSignOut: () => void;
}

export function Header({
  ship,
  userLabel,
  canEdit,
  locked,
  voyageTotal,
  exportMenu,
  onToggleExportMenu,
  onCloseExportMenu,
  onExportXlsx,
  onSaveJson,
  onOpenJson,
  onImportExcel,
  onToggleLock,
  onSignOut,
}: Props) {
  const iconBtn =
    'inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-[0.75rem] font-semibold text-ink hover:bg-rail';
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

      {/* signed-in user + sign out */}
      <div className="flex items-center gap-2">
        <span className="hidden text-[0.68rem] text-muted sm:inline">{userLabel}</span>
        <button onClick={onSignOut} className={iconBtn} title="Switch ship / sign out">
          ⇄ Switch
        </button>
      </div>

      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.62rem] font-bold tracking-[0.8px]"
        style={
          !canEdit || locked
            ? { background: '#F3F5F9', color: '#6B7B8F', borderColor: '#E5E9F0' }
            : { background: '#FFFBEB', color: '#D97706', borderColor: '#FDE68A' }
        }
      >
        {!canEdit ? 'VIEW ONLY · BRIDGE' : locked ? 'VIEW ONLY' : 'EDIT MODE'}
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
      <button onClick={onSaveJson} className={iconBtn} title="Save all voyages to a .json file">
        <SaveIcon size={13} /> Save
      </button>

      <div className="relative">
        <button onClick={onToggleExportMenu} className={iconBtn}>
          <DownloadIcon size={13} /> Export <span className="text-[0.6rem] opacity-45">{exportMenu ? '▴' : '▾'}</span>
        </button>
        {exportMenu && (
          <div className="fixed inset-0 z-40" onClick={onCloseExportMenu}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="vt-scale-in absolute right-4 top-[58px] min-w-[218px] overflow-hidden rounded-[10px] border border-line bg-surface p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.15)]"
            >
              <div className="px-2 pb-1 pt-1.5 text-[0.5rem] font-bold uppercase tracking-[1.2px] text-faint">
                Excel · template format
              </div>
              <div
                onClick={() => onExportXlsx('current')}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-[0.78rem] text-ink hover:bg-rail"
              >
                <span className="inline-flex text-cyan-deep">
                  <FileIcon size={14} />
                </span>
                This voyage
              </div>
              <div
                onClick={() => onExportXlsx('all')}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-[0.78rem] text-ink hover:bg-rail"
              >
                <span className="inline-flex text-green">
                  <GridIcon size={14} />
                </span>
                All voyages
                <span className="ml-auto font-mono text-[0.6rem] text-faint">{voyageTotal}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {canEdit && (
        <button
          onClick={onToggleLock}
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[0.75rem] font-semibold text-white hover:brightness-95"
          style={{ background: locked ? '#F59E0B' : '#102a43' }}
        >
          <span className="inline-flex">{locked ? <EditIcon size={13} /> : <LockIcon size={13} />}</span>
          {locked ? 'Enable Edit' : 'Lock Voyage'}
        </button>
      )}
    </header>
  );
}
