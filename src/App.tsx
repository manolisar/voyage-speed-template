import { useVoyages } from './hooks/useVoyages';
import { computeVoyage } from './domain/calculations';
import { exportXlsx, type XlsxScope } from './storage/xlsx';
import { AuthGate } from './components/AuthGate';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CruiseCard } from './components/CruiseCard';
import { SummaryCards } from './components/SummaryCards';
import { LegsTable } from './components/LegsTable';
import { VersionHistory } from './components/VersionHistory';
import { MathExplainer } from './components/MathExplainer';
import { UnlockModal } from './components/UnlockModal';
import { Toast } from './components/Toast';

function Workspace() {
  const v = useVoyages();
  const { legViews, summary } = computeVoyage(v.current);
  const locked = v.current ? v.current.locked : true;

  const onExportXlsx = (scope: XlsxScope) => {
    v.setExportMenu(false);
    if (!v.current) return;
    const filename = exportXlsx(v.voyages, v.selectedId, scope);
    v.flash(scope === 'all' ? `All voyages exported · ${filename}` : `Exported · ${filename}`);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <Header
        voyage={v.current}
        locked={locked}
        voyageTotal={Object.keys(v.voyages).length}
        exportMenu={v.exportMenu}
        onToggleExportMenu={() => v.setExportMenu(!v.exportMenu)}
        onCloseExportMenu={() => v.setExportMenu(false)}
        onExportXlsx={onExportXlsx}
        onSaveJson={v.doSaveJson}
        onOpenJson={v.doOpenJson}
        onToggleLock={v.toggleLock}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[288px_1fr]">
        <Sidebar
          voyages={v.voyages}
          selectedId={v.selectedId}
          filter={v.filter}
          search={v.search}
          expandedQ={v.expandedQ}
          onSearch={v.setSearch}
          onFilter={v.setFilter}
          onSelect={v.selectVoyage}
          onToggleQuarter={v.toggleQuarter}
        />

        <main className="vt-scroll overflow-auto bg-bg">
          <div className="flex min-w-[1180px] flex-col gap-5 px-6 py-6">
            <CruiseCard voyage={v.current} />
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
              <VersionHistory versions={v.current?.versions ?? []} />
              <MathExplainer />
            </section>
          </div>
        </main>
      </div>

      {v.showUnlock && (
        <UnlockModal
          loggedBy={v.current?.loggedBy ?? ''}
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
  return (
    <AuthGate>
      <Workspace />
    </AuthGate>
  );
}
