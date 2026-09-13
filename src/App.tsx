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
    document.documentElement.classList.add('dark');
    initApp();
  }, []);

  const initApp = async () => {
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
    showToast(`Active persona switched to ${user.name} (${user.role})`);
  };

  // Reset to default seed data
  const handleResetData = async () => {
    await persistenceService.resetToDefaults();
    await initApp();
    showToast('Reset workspace data to PRD defaults.');
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

  // Delete Session handler
  const handleDeleteSession = async (sessionId: string) => {
    await persistenceService.deleteSession(sessionId);
    const updated = await persistenceService.getSessions();
    setSessions(updated);

    if (selectedSessionId === sessionId) {
      const nextSess = updated.find((s) => s.projectId === selectedProjectId) || updated[0] || null;
      setSelectedSessionId(nextSess ? nextSess.id : '');
      if (activeView === 'session_room' || activeView === 'session_results') {
        setActiveView(nextSess ? 'session_room' : 'project_overview');
      }
    }
    showToast('Planning session deleted.');
  };

  // Duplicate Session handler
  const handleDuplicateSession = async (sessionId: string) => {
    const duplicated = await persistenceService.duplicateSession(sessionId);
    const updated = await persistenceService.getSessions();
    setSessions(updated);
    setSelectedSessionId(duplicated.id);
    showToast(`Duplicated session as "${duplicated.name}".`);
  };

  // Card Handlers
  const handleUpdateCard = async (updated: Card) => {
    await persistenceService.saveCard(updated);
    const updatedCards = await persistenceService.getCards(selectedProjectId);
    setCards(updatedCards);
    showToast(`Updated deliverable "${updated.title}".`);
  };

  const handleAddCard = async (newCard: Card) => {
    await persistenceService.createCard(newCard);
    const updatedCards = await persistenceService.getCards(selectedProjectId);
    setCards(updatedCards);
    showToast(`Added deliverable "${newCard.title}".`);
  };

  const handleDeleteCard = async (cardId: string) => {
    await persistenceService.deleteCard(cardId);
    const updatedCards = await persistenceService.getCards(selectedProjectId);
    setCards(updatedCards);
    showToast('Deliverable card deleted.');
  };

  // Workstream Handlers
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

  const handleDeleteWorkstream = async (workstreamId: string) => {
    await persistenceService.deleteWorkstream(selectedProjectId, workstreamId);
    const all = await persistenceService.getProjects();
    setProjects(all);
    showToast('Workstream deleted.');
  };

  const handleUpdateWorkstream = async (workstream: Workstream) => {
    await persistenceService.updateWorkstream(selectedProjectId, workstream);
    const all = await persistenceService.getProjects();
    setProjects(all);
    showToast(`Updated workstream "${workstream.name}".`);
  };

  // Import completed (with Automatic Workstream Formulation & Assessment Sync)
  const handleImportComplete = async (importedCards: Card[], appendMode: boolean) => {
    const currentProj = projects.find((p) => p.id === selectedProjectId);
    const PALETTE = [
      '#d4af37', // Gold
      '#3b82f6', // Blue
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#8b5cf6', // Purple
      '#ef4444', // Red
      '#06b6d4', // Cyan
      '#ec4899', // Pink
      '#6366f1', // Indigo
      '#14b8a6', // Teal
    ];

    if (currentProj) {
      const existingWsMap = new Map<string, Workstream>(
        currentProj.workstreams.map((w) => [w.name.toLowerCase().trim(), w])
      );
      const updatedWorkstreams: Workstream[] = [...currentProj.workstreams];

      // Extract unique workstreams and their leads from imported data
      importedCards.forEach((card) => {
        const wsName = (card.workstreamName || 'General').trim();
        if (!wsName) return;
        const norm = wsName.toLowerCase();

        const leadName =
          (card.sourceMeta as any)?.workstreamLead ||
          card.customFields?.workstreamLead ||
          card.internalOwner ||
          currentUser.name ||
          'Lead';

        if (!existingWsMap.has(norm)) {
          const wsId = `ws-${wsName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now() + Math.random().toString(36).substring(2, 5)}`;
          const color = PALETTE[updatedWorkstreams.length % PALETTE.length];
          const newWs: Workstream = {
            id: wsId,
            projectId: currentProj.id,
            name: wsName,
            leadName,
            color,
            displayOrder: updatedWorkstreams.length + 1,
          };
          updatedWorkstreams.push(newWs);
          existingWsMap.set(norm, newWs);
        } else {
          // If existing workstream had a generic lead but imported data has a specific lead, update it
          const existingWs = existingWsMap.get(norm)!;
          if (leadName && leadName !== 'TBD' && (!existingWs.leadName || existingWs.leadName === 'TBD Lead')) {
            existingWs.leadName = leadName;
          }
        }
      });

      // Update card workstreamIds to match formulated workstream IDs
      importedCards.forEach((card) => {
        const wsName = (card.workstreamName || 'General').trim().toLowerCase();
        const matchedWs = existingWsMap.get(wsName);
        if (matchedWs) {
          card.workstreamId = matchedWs.id;
          card.workstreamName = matchedWs.name;
        }
      });

      // Save updated project workstreams
      const updatedProj: Project = {
        ...currentProj,
        workstreams: updatedWorkstreams,
        updatedAt: new Date().toISOString(),
      };
      await persistenceService.saveProject(updatedProj);
      const allProj = await persistenceService.getProjects();
      setProjects(allProj);
    }

    // Save cards to persistence
    await persistenceService.saveCards(importedCards);

    // Sync imported assessment values into sessions if available
    const projSessions = sessions.filter((s) => s.projectId === selectedProjectId);
    if (projSessions.length > 0) {
      for (const sess of projSessions) {
        for (const card of importedCards) {
          const meta = card.sourceMeta || {};
          const custom = card.customFields || {};

          const businessValue = (meta.businessValue || custom.businessValue || 'Unknown') as any;
          const impact = (meta.impact || custom.impact || 'Unknown') as any;
          const urgency = (meta.urgency || custom.urgency || 'Unknown') as any;
          const effort = (meta.effort || custom.effort || 'Unknown') as any;
          const decision = (meta.sessionDecision || custom.sessionDecision || 'Not Discussed') as any;
          const outcome = (meta.milestoneOutcome || custom.milestoneOutcome || card.targetDateOrQuarter || '') as string;
          const rationale = (meta.teamRationale || custom.teamRationale || '') as string;
          const rankRaw = meta.workstreamRank || custom.workstreamRank;
          const rank = rankRaw && !isNaN(Number(rankRaw)) ? Number(rankRaw) : null;

          if (
            businessValue !== 'Unknown' ||
            impact !== 'Unknown' ||
            urgency !== 'Unknown' ||
            effort !== 'Unknown' ||
            decision !== 'Not Discussed' ||
            outcome ||
            rationale
          ) {
            await persistenceService.saveAssessment({
              sessionId: sess.id,
              cardId: card.id,
              proposedPriority: card.currentPriority,
              businessValue,
              memberImpact: impact,
              urgency,
              effort,
              workstreamRank: rank,
              decision,
              milestoneOutcome: outcome,
              teamRationale: rationale,
              validationNeeds: '',
              lastEditedBy: 'Import Synchronization',
              lastEditedAt: new Date().toISOString(),
              version: 1,
            });
          }
        }
      }
    }

    const refreshed = await persistenceService.getCards(selectedProjectId);
    setCards(refreshed);
    setActiveView('project_overview');
    showToast(`Successfully imported ${importedCards.length} deliverable cards with workstreams!`);
  };

  // Active object references
  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const currentSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];
  const projectCards = cards.filter((c) => c.projectId === (currentProject?.id || ''));

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#e5e7eb] flex flex-col font-sans selection:bg-[#d4af37]/30 selection:text-[#fcd34d]">
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
        onResetData={handleResetData}
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
            onDeleteSession={handleDeleteSession}
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
            onDeleteSession={handleDeleteSession}
            onDuplicateSession={handleDuplicateSession}
            onOpenImport={() => setActiveView('import_wizard')}
            onOpenBoard={() => setActiveView('project_board')}
            onAddWorkstream={handleAddWorkstream}
            onDeleteWorkstream={handleDeleteWorkstream}
            onUpdateWorkstream={handleUpdateWorkstream}
            onAddCard={handleAddCard}
            onDeleteCard={handleDeleteCard}
            onUpdateCard={handleUpdateCard}
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
            onDeleteCard={handleDeleteCard}
            onAddCard={handleAddCard}
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
