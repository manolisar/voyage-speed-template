import { useCallback, useState } from 'react';
import type { Session } from './types';
import { useSession } from './hooks/useSession';
import { useTheme, type Theme } from './hooks/useTheme';
import { useVoyages } from './hooks/useVoyages';
import { computeVoyage } from './domain/calculations';
import { shipByCode } from './domain/ships';
import { roleLabel } from './domain/roles';
import { loadPersisted, persist } from './storage/persist';
import { importExcel } from './storage/excel';
import { LandingScreen } from './components/LandingScreen';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CruiseCard } from './components/CruiseCard';
import { SummaryCards } from './components/SummaryCards';
import { LegsTable } from './components/LegsTable';
import { VersionHistory } from './components/VersionHistory';
import { MathExplainer } from './components/MathExplainer';
import { UnlockModal } from './components/UnlockModal';
import { EditPasswordModal } from './components/EditPasswordModal';
import { Toast } from './components/Toast';

function Workspace({
  session,
  onSignOut,
  onImportExcel,
  theme,
  onSetTheme,
}: {
  session: Session;
  onSignOut: () => void;
  onImportExcel: () => void;
  theme: Theme;
  onSetTheme: (t: Theme) => void;
}) {
  const v = useVoyages(session);
  const { legViews, summary } = computeVoyage(v.current);
  const ship = shipByCode(session.ship);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <h1 className="sr-only">
        Voyage Speed Tracker — {ship.name}
        {v.current ? `, ${v.current.title}` : ''}
      </h1>
      <Header
        ship={ship}
        userLabel={v.loggedBy}
        canEdit={v.canEdit}
        editing={v.editable}
        voyageTotal={Object.keys(v.voyages).length}
        exportMenu={v.exportMenu}
        onToggleExportMenu={() => v.setExportMenu(!v.exportMenu)}
        onCloseExportMenu={() => v.setExportMenu(false)}
        onExportXlsx={v.doExportExcel}
        onSaveJson={v.doSaveJson}
        onSaveJsonAs={v.doSaveAsJson}
        boundFile={v.boundFile}
        onOpenJson={v.doOpenJson}
        onImportExcel={onImportExcel}
        onToggleLock={v.toggleLock}
        onSignOut={onSignOut}
        theme={theme}
        onSetTheme={onSetTheme}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[288px_1fr]">
        <Sidebar
          voyages={v.voyages}
          selectedId={v.selectedId}
          filter={v.filter}
          search={v.search}
          expandedQ={v.expandedQ}
          canEdit={v.canEdit}
          onSearch={v.setSearch}
          onFilter={v.setFilter}
          onSelect={v.selectVoyage}
          onToggleQuarter={v.toggleQuarter}
          onNewVoyage={v.createVoyage}
        />

        <main id="main-content" tabIndex={-1} className="vt-scroll overflow-auto bg-bg outline-none">
          {v.current ? (
            <div className="flex min-w-[1180px] flex-col gap-5 px-6 py-6">
              <CruiseCard voyage={v.current} shipCode={session.ship} />
              <SummaryCards summary={summary} />
              <LegsTable
                voyage={v.current}
                legViews={legViews}
                readonly={!v.editable}
                onField={v.updateLeg}
                onMode={v.setMode}
                onToggleType={v.toggleType}
                onUp={(i) => v.moveLeg(i, -1)}
                onDown={(i) => v.moveLeg(i, 1)}
                onInsert={v.insertLeg}
                onDelete={v.deleteLeg}
                onAdd={v.addLeg}
              />
              <section className="grid grid-cols-[1.4fr_1fr] gap-4">
                <VersionHistory versions={v.current.versions} />
                <MathExplainer />
              </section>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
              <div>
                <div className="text-base font-bold text-ink">No voyages for {ship.name}</div>
                <div className="mx-auto mt-1.5 max-w-md text-[0.8rem] leading-relaxed text-muted">
                  Open a saved <span className="font-mono">.json</span> file to load voyages, or start a new
                  one. You choose where to load from — and where to save — when prompted.
                </div>
              </div>
              {v.canEdit ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={v.doOpenJson}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-[0.8rem] font-semibold text-ink hover:bg-rail"
                  >
                    Open .json…
                  </button>
                  <button
                    onClick={onImportExcel}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-[0.8rem] font-semibold text-ink hover:bg-rail"
                  >
                    Import Excel…
                  </button>
                  <button
                    onClick={v.createVoyage}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-cyan px-3.5 py-2 text-[0.8rem] font-semibold text-white hover:brightness-95"
                  >
                    New voyage
                  </button>
                </div>
              ) : (
                <div className="max-w-md text-[0.8rem] text-muted">
                  No voyages exist for this ship yet. An Admin, Master, Navigation Officer, or Environmental
                  Officer can load a <span className="font-mono">.json</span> file or create one.
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {v.showPassword && (
        <EditPasswordModal loggedBy={v.loggedBy} onConfirm={v.confirmPassword} onCancel={v.cancelPassword} />
      )}
      {v.showUnlock && (
        <UnlockModal
          loggedBy={v.loggedBy}
          note={v.unlockNote}
          onNote={v.setUnlockNote}
          onConfirm={v.confirmUnlock}
          onCancel={v.cancelUnlock}
        />
      )}
      <Toast message={v.toast} />
    </div>
  );
}

export default function App() {
  const { session, setSession, signOut } = useSession();
  const { theme, setTheme } = useTheme();
  // Bumped to force the Workspace to re-read storage after a same-ship import.
  const [reload, setReload] = useState(0);

  // Excel import: detect the ship from the file, replace THAT ship's voyages
  // (confirm first), then switch to it so the imported data is shown.
  const doImportExcel = useCallback(async () => {
    if (!session) return;
    const who = `${session.name} · ${roleLabel(session.role)}`;
    try {
      const res = await importExcel(who);
      if (!res) return;
      const target = res.shipCode ?? session.ship;
      const targetName = shipByCode(target).name;
      const count = Object.keys(res.voyages).length;
      const existing = loadPersisted(target);
      const n = existing ? Object.keys(existing.voyages).length : 0;
      const note = res.shipCode && res.shipCode !== session.ship ? ` (you'll switch to ${targetName})` : '';
      if (
        n > 0 &&
        !window.confirm(`Replace all ${n} voyage(s) on ${targetName} with ${count} from the Excel file?${note}`)
      ) {
        return;
      }
      persist(target, res.voyages, res.selectedId);
      try {
        sessionStorage.setItem('vst_flash', `Imported ${count} voyage(s) into ${targetName}`);
      } catch {
        /* ignore */
      }
      if (target !== session.ship) setSession({ ...session, ship: target });
      else setReload((x) => x + 1);
    } catch (e) {
      window.alert('Import failed: ' + (e as Error).message);
    }
  }, [session, setSession]);

  // Identify first (ship + name + role). The app then opens in VIEW mode; the
  // daily password is requested only when an allowed user enables editing.
  if (!session) return <LandingScreen initial={null} onDone={setSession} />;

  return (
    <Workspace
      key={`${session.ship}:${reload}`}
      session={session}
      onSignOut={signOut}
      onImportExcel={doImportExcel}
      theme={theme}
      onSetTheme={setTheme}
    />
  );
}
