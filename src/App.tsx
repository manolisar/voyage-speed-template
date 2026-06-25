import { useCallback, useState } from 'react';
import type { Session } from './types';
import { useSession } from './hooks/useSession';
import { useVoyages } from './hooks/useVoyages';
import { computeVoyage } from './domain/calculations';
import { shipByCode } from './domain/ships';
import { roleLabel } from './domain/roles';
import { loadPersisted, persist } from './storage/persist';
import { importExcel } from './storage/excel';
import { AuthGate } from './components/AuthGate';
import { LandingScreen } from './components/LandingScreen';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CruiseCard } from './components/CruiseCard';
import { SummaryCards } from './components/SummaryCards';
import { LegsTable } from './components/LegsTable';
import { VersionHistory } from './components/VersionHistory';
import { MathExplainer } from './components/MathExplainer';
import { UnlockModal } from './components/UnlockModal';
import { Toast } from './components/Toast';

function Workspace({ session, onSignOut, onImportExcel }: { session: Session; onSignOut: () => void; onImportExcel: () => void }) {
  const v = useVoyages(session);
  const { legViews, summary } = computeVoyage(v.current);
  const ship = shipByCode(session.ship);
  const locked = v.current ? v.current.locked : true;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <Header
        ship={ship}
        userLabel={v.loggedBy}
        canEdit={v.canEdit}
        locked={locked}
        voyageTotal={Object.keys(v.voyages).length}
        exportMenu={v.exportMenu}
        onToggleExportMenu={() => v.setExportMenu(!v.exportMenu)}
        onCloseExportMenu={() => v.setExportMenu(false)}
        onExportXlsx={v.doExportExcel}
        onSaveJson={v.doSaveJson}
        onOpenJson={v.doOpenJson}
        onImportExcel={onImportExcel}
        onToggleLock={v.toggleLock}
        onSignOut={onSignOut}
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

        <main className="vt-scroll overflow-auto bg-bg">
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
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted">
              <div className="text-[0.95rem] font-bold text-ink">No voyage selected</div>
              <div className="text-[0.8rem]">
                {v.canEdit
                  ? 'Create a voyage with “New Voyage”, open a saved .json, or Import an Excel template.'
                  : 'No voyages exist for this ship yet.'}
              </div>
            </div>
          )}
        </main>
      </div>

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

  // Identify first (ship + name + role), THEN the daily password gate.
  if (!session) return <LandingScreen initial={null} onDone={setSession} />;

  return (
    <AuthGate>
      <Workspace key={`${session.ship}:${reload}`} session={session} onSignOut={signOut} onImportExcel={doImportExcel} />
    </AuthGate>
  );
}
