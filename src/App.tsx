import type { Session } from './types';
import { useSession } from './hooks/useSession';
import { useTheme, type Theme } from './hooks/useTheme';
import { useWorkspace, type WorkspaceApi } from './hooks/useWorkspace';
import { computeVoyage } from './domain/calculations';
import { roleLabel } from './domain/roles';
import { LandingScreen } from './components/LandingScreen';
import { FolderGate } from './components/FolderGate';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CruiseCard } from './components/CruiseCard';
import { SummaryCards } from './components/SummaryCards';
import { LegsTable } from './components/LegsTable';
import { VersionHistory } from './components/VersionHistory';
import { MathExplainer } from './components/MathExplainer';
import { UnlockModal } from './components/UnlockModal';
import { EditPasswordModal } from './components/EditPasswordModal';
import { PasteVoyageModal } from './components/PasteVoyageModal';
import { Toast } from './components/Toast';

function Workspace({
  w,
  onSignOut,
  theme,
  onSetTheme,
}: {
  w: WorkspaceApi;
  onSignOut: () => void;
  theme: Theme;
  onSetTheme: (t: Theme) => void;
}) {
  const { legViews, summary } = computeVoyage(w.current);
  const total = w.currentFile ? Object.keys(w.currentFile.voyages).length : 0;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <h1 className="sr-only">
        Speed Templates — {w.selectedFile || 'no file'}
        {w.current ? `, ${w.current.title}` : ''}
      </h1>
      <Header
        dirName={w.dirName}
        fileName={w.selectedFile}
        shipId={w.shipCode}
        userLabel={w.loggedBy}
        canEdit={w.canEdit}
        editing={w.editable}
        voyageTotal={total}
        exportMenu={w.exportMenu}
        onToggleExportMenu={() => w.setExportMenu(!w.exportMenu)}
        onCloseExportMenu={() => w.setExportMenu(false)}
        onExportXlsx={w.doExportExcel}
        onSaveJson={w.doSaveJson}
        onOpenFolder={w.openFolder}
        onToggleLock={w.toggleLock}
        onSignOut={onSignOut}
        theme={theme}
        onSetTheme={onSetTheme}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[288px_1fr]">
        <Sidebar
          files={w.files}
          selectedFile={w.selectedFile}
          selectedId={w.selectedId}
          search={w.search}
          expanded={w.expanded}
          canEdit={w.canEdit}
          canMutate={w.canEdit && w.editAuthorized}
          clipboardCount={w.clipboardCount}
          onSearch={w.setSearch}
          onSelect={w.selectVoyage}
          onToggleFile={w.toggleFile}
          onNewVoyage={w.createVoyage}
          onCopyVoyage={w.copyVoyage}
          onRequestPaste={w.requestPaste}
        />

        <main id="main-content" tabIndex={-1} className="vt-scroll overflow-auto bg-bg outline-none">
          {w.current ? (
            <div className="flex min-w-[1180px] flex-col gap-5 px-6 py-6">
              <CruiseCard voyage={w.current} fileName={w.selectedFile} />
              <SummaryCards summary={summary} />
              <LegsTable
                voyage={w.current}
                legViews={legViews}
                readonly={!w.editable}
                onField={w.updateLeg}
                onMode={w.setMode}
                onToggleType={w.toggleType}
                onUp={(i) => w.moveLeg(i, -1)}
                onDown={(i) => w.moveLeg(i, 1)}
                onInsert={w.insertLeg}
                onDelete={w.deleteLeg}
                onAdd={w.addLeg}
              />
              <section className="grid grid-cols-[1.4fr_1fr] gap-4">
                <VersionHistory versions={w.current.versions} />
                <MathExplainer />
              </section>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="text-base font-bold text-ink">
                {w.files.length === 0 ? 'No files in this folder' : 'Select a voyage'}
              </div>
              <div className="max-w-md text-[0.8rem] leading-relaxed text-muted">
                {w.files.length === 0
                  ? 'This folder has no readable .json templates. Choose another folder from the header.'
                  : 'Pick a voyage from the tree on the left to view or edit it.'}
              </div>
            </div>
          )}
        </main>
      </div>

      {w.showPassword && (
        <EditPasswordModal loggedBy={w.loggedBy} onConfirm={w.confirmPassword} onCancel={w.cancelPassword} />
      )}
      {w.showUnlock && (
        <UnlockModal
          loggedBy={w.loggedBy}
          note={w.unlockNote}
          onNote={w.setUnlockNote}
          onConfirm={w.confirmUnlock}
          onCancel={w.cancelUnlock}
        />
      )}
      {w.pasteState && (
        <PasteVoyageModal
          targetFile={w.pasteState.targetFile}
          name={w.pasteState.name}
          startDate={w.pasteState.startDate}
          onName={w.setPasteName}
          onDate={w.setPasteDate}
          onConfirm={w.confirmPaste}
          onCancel={w.cancelPaste}
        />
      )}
      <Toast message={w.toast} />
    </div>
  );
}

// After sign-in: hold the folder-backed workspace; show the folder picker until
// a folder is chosen, then the workspace.
function SignedIn({
  session,
  onSignOut,
  theme,
  onSetTheme,
}: {
  session: Session;
  onSignOut: () => void;
  theme: Theme;
  onSetTheme: (t: Theme) => void;
}) {
  const w = useWorkspace(session);
  if (!w.dirName) {
    return <FolderGate userLabel={`${session.name} · ${roleLabel(session.role)}`} onChoose={w.openFolder} />;
  }
  return <Workspace w={w} onSignOut={onSignOut} theme={theme} onSetTheme={onSetTheme} />;
}

export default function App() {
  const { session, setSession, signOut } = useSession();
  const { theme, setTheme } = useTheme();

  if (!session) return <LandingScreen initial={null} onDone={setSession} />;

  return <SignedIn session={session} onSignOut={signOut} theme={theme} onSetTheme={setTheme} />;
}
