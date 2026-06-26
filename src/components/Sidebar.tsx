// Left sidebar — search + a file → voyage tree. Each .json in the folder is a
// top node; its voyages (sorted by start date) nest beneath. Copy a voyage and
// paste it into another file (cross-file), or add a new voyage to a file.
import type { WorkspaceFile } from '../storage/workspace';
import { voyageStartDate } from '../domain/schedule';
import { SearchIcon, PlusIcon, FileIcon, CopyIcon, PasteIcon } from './Icons';

interface Props {
  files: WorkspaceFile[];
  selectedFile: string;
  selectedId: string;
  search: string;
  expanded: Record<string, boolean>;
  canEdit: boolean;
  canMutate: boolean; // canEdit AND edit-authorised → New/Paste allowed
  clipboardCount: number;
  onSearch: (s: string) => void;
  onSelect: (file: string, id: string) => void;
  onToggleFile: (file: string) => void;
  onNewVoyage: () => void;
  onCopyVoyage: (file: string, id: string) => void;
  onRequestPaste: (file: string) => void;
}

function fmtDate(d: string): string {
  if (!d) return 'undated';
  const t = Date.parse(d + 'T00:00:00Z');
  return Number.isNaN(t)
    ? d
    : new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function Sidebar({
  files,
  selectedFile,
  selectedId,
  search,
  expanded,
  canEdit,
  canMutate,
  clipboardCount,
  onSearch,
  onSelect,
  onToggleFile,
  onNewVoyage,
  onCopyVoyage,
  onRequestPaste,
}: Props) {
  const q = search.trim().toLowerCase();

  return (
    <aside className="vt-scroll flex flex-col overflow-y-auto border-r border-line bg-surface">
      <div className="relative border-b border-line p-3">
        <span className="pointer-events-none absolute left-[22px] top-1/2 -translate-y-1/2 text-faint">
          <SearchIcon size={14} />
        </span>
        <input
          type="search"
          name="voyage-search"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search voyages and ports across all files"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search voyages, ports…"
          className="w-full rounded-lg border border-line bg-bg py-2 pl-8 pr-2.5 text-[0.78rem] text-ink outline-none focus:border-cyan"
        />
      </div>

      {canMutate && selectedFile && (
        <div className="border-b border-line px-3 py-2.5">
          <button
            onClick={onNewVoyage}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-cyan/40 bg-[rgba(6,182,212,0.08)] py-2 text-[0.72rem] font-bold uppercase tracking-[0.8px] text-cyan-deep hover:bg-[rgba(6,182,212,0.15)]"
          >
            <PlusIcon size={12} /> New voyage in {selectedFile}
          </button>
        </div>
      )}

      <div className="flex-1 p-1.5 text-[0.82rem]">
        {files.length === 0 && (
          <div className="px-3 py-8 text-center text-[0.74rem] leading-relaxed text-faint">
            No <span className="font-mono">.json</span> files in this folder yet.
          </div>
        )}

        {files.map((file) => {
          const open = expanded[file.name] !== false;
          const rows = Object.values(file.voyages)
            .filter((vo) => {
              if (!q) return true;
              const hay = (vo.title + ' ' + vo.legs.map((l) => l.port).join(' ')).toLowerCase();
              return hay.includes(q);
            })
            .sort((a, b) => voyageStartDate(a).localeCompare(voyageStartDate(b)));
          if (q && rows.length === 0 && !file.error) return null;

          return (
            <div key={file.name} className="mb-0.5">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onToggleFile(file.name)}
                  aria-label={open ? `Collapse ${file.name}` : `Expand ${file.name}`}
                  aria-expanded={open}
                  className="vt-unbutton w-[16px] flex-shrink-0 rounded text-center text-[0.65rem] text-faint hover:text-ink"
                >
                  {open ? '▾' : '▸'}
                </button>
                <button
                  type="button"
                  onClick={() => onSelect(file.name, rows[0]?.id ?? '')}
                  aria-current={selectedFile === file.name ? 'true' : undefined}
                  className="vt-unbutton flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left hover:bg-rail"
                  style={{ background: selectedFile === file.name ? 'rgba(6,182,212,0.08)' : 'transparent' }}
                >
                  <span className="flex-shrink-0 text-muted">
                    <FileIcon size={13} />
                  </span>
                  <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.74rem] font-semibold text-ink">
                    {file.name}
                  </span>
                  {file.shipId && (
                    <span className="flex-shrink-0 rounded bg-rail px-1 font-mono text-[0.52rem] font-bold uppercase tracking-[0.5px] text-muted">
                      {file.shipId}
                    </span>
                  )}
                  {!file.error && (
                    <span className="flex-shrink-0 rounded-full bg-rail px-[7px] py-px font-mono text-[0.56rem] font-semibold text-muted">
                      {Object.keys(file.voyages).length}
                    </span>
                  )}
                </button>
                {clipboardCount > 0 && canMutate && !file.error && (
                  <button
                    type="button"
                    onClick={() => onRequestPaste(file.name)}
                    title={`Paste copied voyage into ${file.name}`}
                    aria-label={`Paste copied voyage into ${file.name}`}
                    className="vt-unbutton flex-shrink-0 rounded p-1 text-cyan-deep hover:bg-rail"
                  >
                    <PasteIcon size={13} />
                  </button>
                )}
              </div>

              {open && file.error && (
                <div className="ml-5 rounded bg-[rgba(244,63,94,0.06)] px-2 py-1 text-[0.62rem] text-[color:var(--color-spd-hi-fg)]">
                  Couldn’t read this file: {file.error}
                </div>
              )}

              {open && !file.error && (
                <div className="mb-1 ml-3 border-l border-line pl-1.5">
                  {rows.length === 0 && (
                    <div className="px-2 py-1 text-[0.64rem] text-faint">No voyages</div>
                  )}
                  {rows.map((vo) => {
                    const active = file.name === selectedFile && vo.id === selectedId;
                    const glyph = vo.locked ? '🔒' : vo.ended ? '⚑' : '●';
                    const statusLabel = vo.locked ? 'Locked' : vo.ended ? 'Ended' : 'Active';
                    const statusFg = vo.locked ? 'var(--color-faint)' : vo.ended ? 'var(--color-muted)' : '#10b981';
                    return (
                      <div key={vo.id} className="group flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onSelect(file.name, vo.id)}
                          aria-current={active ? 'true' : undefined}
                          className="vt-unbutton flex min-w-0 flex-1 select-none items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-rail"
                          style={{
                            background: active ? 'rgba(6,182,212,0.12)' : 'transparent',
                            color: active ? 'var(--color-cyan-deep)' : 'var(--color-ink)',
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          <span aria-hidden="true" className="w-3 flex-shrink-0 text-center" style={{ color: active ? 'var(--color-cyan-deep)' : 'var(--color-muted)' }}>
                            ⚓
                          </span>
                          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">
                            {vo.title}
                          </span>
                          <span className="hidden flex-shrink-0 font-mono text-[0.56rem] text-faint sm:inline">
                            {fmtDate(voyageStartDate(vo))}
                          </span>
                          <span className="sr-only">{statusLabel}</span>
                          <span aria-hidden="true" className="font-mono text-[0.58rem] tracking-[0.5px]" style={{ color: statusFg }}>
                            {glyph}
                          </span>
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => onCopyVoyage(file.name, vo.id)}
                            title={`Copy “${vo.title}”`}
                            aria-label={`Copy voyage ${vo.title}`}
                            className="vt-unbutton flex-shrink-0 rounded p-1 text-muted opacity-0 hover:bg-rail hover:text-cyan-deep focus:opacity-100 group-hover:opacity-100"
                          >
                            <CopyIcon size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
