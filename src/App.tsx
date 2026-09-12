import React, { useState, useEffect } from 'react';
import {
  Project,
  PlanningSession,
  Card,
  User,
  Workspace,
  Role,
  Workstream,
} from './types';
import { SEED_WORKSPACE, SEED_PROJECTS, SEED_CARDS, SEED_SESSIONS, SEED_USERS } from './data/seedData';
import { persistenceService } from './services/PersistenceService';
import { authService } from './services/AuthService';
import { presenceService } from './services/PresenceService';
import { AppHeader } from './components/layout/AppHeader';
import { WorkspaceHome } from './components/home/WorkspaceHome';
import { ProjectOverview } from './components/project/ProjectOverview';
import { SessionRoom } from './components/session/SessionRoom';
import { ProjectBoard } from './components/board/ProjectBoard';
import { SessionResults } from './components/results/SessionResults';
import { ExcelImportWizard } from './components/import/ExcelImportWizard';
import { CreateSessionModal } from './components/session/CreateSessionModal';
import { PrdAcceptanceModal } from './components/verification/PrdAcceptanceModal';

export type ActiveView =
  | 'home'
  | 'project_overview'
  | 'session_room'
  | 'project_board'
  | 'session_results'
  | 'import_wizard';

export default function App() {
  // Application Data State
  const [workspace, setWorkspace] = useState<Workspace>(SEED_WORKSPACE);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<PlanningSession[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(SEED_USERS[0]);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(true);

  // Navigation State
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  // Modals
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize data from Persistence & Auth Services
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    // Check if persistence has data, else seed
    let storedProjects = await persistenceService.getProjects();
    if (storedProjects.length === 0) {
      for (const p of SEED_PROJECTS) {
        await persistenceService.saveProject(p);
      }
      await persistenceService.saveCards(SEED_CARDS);
      for (const s of SEED_SESSIONS) {
        await persistenceService.saveSession(s);
      }
      storedProjects = SEED_PROJECTS;
    }

    const storedSessions = await persistenceService.getSessions();
    const activeProj = storedProjects[0];
    const storedCards = await persistenceService.getCards(activeProj?.id || '');

    setProjects(storedProjects);
    setSessions(storedSessions);
    setCards(storedCards);
    if (activeProj) setSelectedProjectId(activeProj.id);
    if (storedSessions[0]) setSelectedSessionId(storedSessions[0].id);

    // Set auth user
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    // Handle URL parameters if invite link was used
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      handleJoinByCode(joinCode);
    }
  };

  const handleJoinByCode = async (code: string) => {
    const invite = await authService.redeemInvitation(code);
    if (invite) {
      if (invite.projectId) setSelectedProjectId(invite.projectId);
      if (invite.sessionId) {
        setSelectedSessionId(invite.sessionId);
        setActiveView('session_room');
      } else {
        setActiveView('project_overview');
      }
      showToast(`Joined project as ${invite.role} via invitation link!`);
    } else {
      showToast('Invitation link is invalid or has expired.');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch persona
  const handleSwitchUser = (user: User) => {
    authService.setCurrentUser(user);
    setCurrentUser(user);
    showToast(`Switched active user to ${user.name} (${user.role})`);
  };

  // Toggle Theme
  const handleToggleTheme = () => {
    const next = !isDarkTheme;
    setIsDarkTheme(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Create Project handler
  const handleCreateProject = async (
    name: string,
    description: string,
    horizon: string,
    impactLabel: string
  ) => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      workspaceId: workspace.id,
      name,
      description,
      targetHorizon: horizon,
      impactLabelName: impactLabel,
      workstreams: [
        {
          id: `ws-core-${Date.now()}`,
          projectId: `proj-${Date.now()}`,
          name: 'Core Capabilities',
          leadName: currentUser.name,
          color: '#d4af37',
          displayOrder: 1,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await persistenceService.saveProject(newProj);
    const updated = await persistenceService.getProjects();
    setProjects(updated);
    setSelectedProjectId(newProj.id);
    setActiveView('project_overview');
    showToast(`Created project "${name}" successfully.`);
  };

  // Create Planning Session handler
  const handleCreateSessionSubmit = async (
    sessionData: Omit<PlanningSession, 'id' | 'createdAt' | 'updatedAt' | 'version'>
  ) => {
    const newSession: PlanningSession = {
      ...sessionData,
      id: `sess-${Date.now()}`,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await persistenceService.saveSession(newSession);
    const updated = await persistenceService.getSessions();
    setSessions(updated);
    setSelectedSessionId(newSession.id);
    setShowCreateSessionModal(false);
    setActiveView('session_room');
    showToast(`Launched planning session "${newSession.name}"!`);
  };

  // Update card in board or overview
  const handleUpdateCard = async (updated: Card) => {
    await persistenceService.saveCard(updated);
    const updatedCards = await persistenceService.getCards(selectedProjectId);
    setCards(updatedCards);
    showToast(`Updated deliverable "${updated.title}".`);
  };

  // Add workstream
  const handleAddWorkstream = async (name: string, lead: string, color: string) => {
    const currentProj = projects.find((p) => p.id === selectedProjectId);
    if (!currentProj) return;

    const newWs: Workstream = {
      id: `ws-${Date.now()}`,
      projectId: currentProj.id,
      name,
      leadName: lead,
      color,
      displayOrder: currentProj.workstreams.length + 1,
    };

    const updatedProj: Project = {
      ...currentProj,
      workstreams: [...currentProj.workstreams, newWs],
      updatedAt: new Date().toISOString(),
    };

    await persistenceService.saveProject(updatedProj);
    const all = await persistenceService.getProjects();
    setProjects(all);
    showToast(`Added workstream "${name}".`);
  };

  // Import completed
  const handleImportComplete = async (importedCards: Card[], appendMode: boolean) => {
    await persistenceService.saveCards(importedCards);
    const refreshed = await persistenceService.getCards(selectedProjectId);
    setCards(refreshed);
    setActiveView('project_overview');
    showToast(`Successfully imported ${importedCards.length} deliverable cards!`);
  };

  // Delete Project handler
  const handleDeleteProject = async (projectId: string) => {
    await persistenceService.deleteProject(projectId);
    const updatedProjects = await persistenceService.getProjects();
    const updatedSessions = await persistenceService.getSessions();
    setProjects(updatedProjects);
    setSessions(updatedSessions);

    if (selectedProjectId === projectId) {
      const nextProj = updatedProjects[0] || null;
      setSelectedProjectId(nextProj ? nextProj.id : '');
      if (nextProj) {
        const nextCards = await persistenceService.getCards(nextProj.id);
        setCards(nextCards);
      } else {
        setCards([]);
      }
      setActiveView('home');
    }
    showToast('Project deleted successfully.');
  };

  // Active object references
  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const currentSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];
  const projectCards = cards.filter((c) => c.projectId === selectedProjectId);

  return (
    <div className={`min-h-screen bg-[#faf9f5] dark:bg-[#18191c] text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors ${isDarkTheme ? 'dark' : ''}`}>
      {/* Global Application Header */}
      <AppHeader
        activeView={activeView}
        activeTab={
          activeView === 'home'
            ? 'home'
            : activeView === 'project_overview'
            ? 'project'
            : activeView === 'session_room'
            ? 'session'
            : activeView === 'project_board'
            ? 'board'
            : activeView === 'session_results'
            ? 'results'
            : activeView === 'import_wizard'
            ? 'import'
            : 'home'
        }
        currentProject={currentProject}
        currentSession={currentSession}
        currentUser={currentUser}
        isDarkTheme={isDarkTheme}
        onTabChange={(tab) => {
          if (tab === 'home') setActiveView('home');
          else if (tab === 'project') setActiveView('project_overview');
          else if (tab === 'session') setActiveView('session_room');
          else if (tab === 'board') setActiveView('project_board');
          else if (tab === 'results') setActiveView('session_results');
          else if (tab === 'import') setActiveView('import_wizard');
        }}
        onNavigateHome={() => setActiveView('home')}
        onNavigateOverview={() => setActiveView('project_overview')}
        onNavigateBoard={() => setActiveView('project_board')}
        onNavigateSession={() => setActiveView('session_room')}
        onNavigateResults={() => setActiveView('session_results')}
        onOpenImport={() => setActiveView('import_wizard')}
        onOpenVerification={() => setShowVerificationModal(true)}
        onSwitchUser={handleSwitchUser}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Router */}
      <main className="flex-1 flex flex-col overflow-x-hidden">
        {/* VIEW 1: WORKSPACE HOME */}
        {activeView === 'home' && (
          <WorkspaceHome
            workspace={workspace}
            projects={projects}
            sessions={sessions}
            currentUser={currentUser}
            onSelectProject={(projId) => {
              setSelectedProjectId(projId);
              persistenceService.getCards(projId).then(setCards);
              setActiveView('project_overview');
            }}
            onSelectSession={(sessId) => {
              const sess = sessions.find((s) => s.id === sessId);
              if (sess) {
                setSelectedProjectId(sess.projectId);
                setSelectedSessionId(sess.id);
                persistenceService.getCards(sess.projectId).then(setCards);
                setActiveView('session_room');
              }
            }}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            onOpenImport={() => setActiveView('import_wizard')}
          />
        )}

        {/* VIEW 2: PROJECT OVERVIEW */}
        {activeView === 'project_overview' && currentProject && (
          <ProjectOverview
            project={currentProject}
            cards={projectCards}
            sessions={sessions.filter((s) => s.projectId === currentProject.id)}
            currentUser={currentUser}
            onNavigateHome={() => setActiveView('home')}
            onDeleteProject={handleDeleteProject}
            onEnterSession={(sessId) => {
              setSelectedSessionId(sessId);
              setActiveView('session_room');
            }}
            onCreateSessionClick={() => setShowCreateSessionModal(true)}
            onOpenImport={() => setActiveView('import_wizard')}
            onOpenBoard={() => setActiveView('project_board')}
            onAddWorkstream={handleAddWorkstream}
          />
        )}

        {/* VIEW 3: COLLABORATIVE SESSION ROOM */}
        {activeView === 'session_room' && currentSession && currentProject && (
          <SessionRoom
            session={currentSession}
            project={currentProject}
            cards={projectCards}
            currentUser={currentUser}
            onNavigateHome={() => setActiveView('home')}
            onNavigateOverview={() => setActiveView('project_overview')}
            onSessionUpdated={(updated) => {
              setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            }}
            onCardsUpdated={(updated) => setCards(updated)}
            onNavigateToResults={() => setActiveView('session_results')}
          />
        )}

        {/* VIEW 4: PROJECT BOARD */}
        {activeView === 'project_board' && currentProject && (
          <ProjectBoard
            project={currentProject}
            cards={projectCards}
            currentUser={currentUser}
            onBackToOverview={() => setActiveView('project_overview')}
            onNavigateHome={() => setActiveView('home')}
            onUpdateCard={handleUpdateCard}
          />
        )}

        {/* VIEW 5: SESSION RESULTS & EXPORT */}
        {activeView === 'session_results' && currentSession && currentProject && (
          <SessionResults
            session={currentSession}
            project={currentProject}
            cards={projectCards}
            currentUser={currentUser}
            onBackToSession={() => setActiveView('session_room')}
            onNavigateHome={() => setActiveView('home')}
            onNavigateOverview={() => setActiveView('project_overview')}
            onSessionUpdated={(updated) => {
              setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            }}
          />
        )}

        {/* VIEW 6: EXCEL IMPORT WIZARD */}
        {activeView === 'import_wizard' && currentProject && (
          <ExcelImportWizard
            project={currentProject}
            existingCards={projectCards}
            onCancel={() => setActiveView('project_overview')}
            onImportComplete={handleImportComplete}
          />
        )}
      </main>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#18191c] text-white border border-[#d4af37]/50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-[#d4af37]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateSessionModal && currentProject && (
        <CreateSessionModal
          project={currentProject}
          currentUser={currentUser}
          onClose={() => setShowCreateSessionModal(false)}
          onSubmit={handleCreateSessionSubmit}
        />
      )}

      {/* PRD Acceptance Verification Modal */}
      {showVerificationModal && (
        <PrdAcceptanceModal onClose={() => setShowVerificationModal(false)} />
      )}
    </div>
  );
}
