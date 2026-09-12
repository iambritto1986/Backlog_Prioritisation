import {
  Project,
  Card,
  PlanningSession,
  SessionAssessment,
  FollowUpAction,
  CardComment,
  ActivityLog,
  VersionSnapshot,
  Workstream,
} from '../types';
import { IPersistenceService } from './types';
import {
  SEED_PROJECTS,
  SEED_CARDS,
  SEED_SESSIONS,
  SEED_ASSESSMENTS,
  SEED_ACTIONS,
  SEED_COMMENTS,
} from '../data/seedData';

const STORAGE_KEYS = {
  PROJECTS: 'pp_projects_v1',
  CARDS: 'pp_cards_v1',
  SESSIONS: 'pp_sessions_v1',
  ASSESSMENTS: 'pp_assessments_v1',
  ACTIONS: 'pp_actions_v1',
  COMMENTS: 'pp_comments_v1',
  LOGS: 'pp_logs_v1',
};

export class PersistenceService implements IPersistenceService {
  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (!localStorage.getItem(STORAGE_KEYS.PROJECTS)) {
      this.resetToDefaults();
    }
  }

  async resetToDefaults(): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(SEED_PROJECTS));
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(SEED_CARDS));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(SEED_SESSIONS));

    // Convert assessments array to record keyed by `${sessionId}:${cardId}`
    const assessMap: Record<string, SessionAssessment> = {};
    SEED_ASSESSMENTS.forEach((a) => {
      assessMap[`${a.sessionId}:${a.cardId}`] = a;
    });
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(assessMap));

    localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(SEED_ACTIONS));
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(SEED_COMMENTS));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
  }

  // PROJECTS
  async getProjects(): Promise<Project[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return raw ? JSON.parse(raw) : [];
  }

  async getProject(id: string): Promise<Project | null> {
    const projects = await this.getProjects();
    return projects.find((p) => p.id === id) || null;
  }

  async saveProject(project: Project): Promise<void> {
    const projects = await this.getProjects();
    const idx = projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      projects[idx] = project;
    } else {
      projects.push(project);
    }
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  }

  async deleteProject(id: string): Promise<void> {
    const projects = await this.getProjects();
    const updatedProjects = projects.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));

    // Clean up associated cards
    const rawCards = localStorage.getItem(STORAGE_KEYS.CARDS);
    if (rawCards) {
      const allCards: Card[] = JSON.parse(rawCards);
      const remainingCards = allCards.filter((c) => c.projectId !== id);
      localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(remainingCards));
    }

    // Clean up associated sessions
    const rawSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (rawSessions) {
      const allSessions: PlanningSession[] = JSON.parse(rawSessions);
      const remainingSessions = allSessions.filter((s) => s.projectId !== id);
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(remainingSessions));
    }
  }

  // CARDS
  async getCards(projectId: string): Promise<Card[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.CARDS);
    const all: Card[] = raw ? JSON.parse(raw) : [];
    return all.filter((c) => c.projectId === projectId);
  }

  async getCard(id: string): Promise<Card | null> {
    const raw = localStorage.getItem(STORAGE_KEYS.CARDS);
    const all: Card[] = raw ? JSON.parse(raw) : [];
    return all.find((c) => c.id === id) || null;
  }

  async saveCards(newOrUpdatedCards: Card[]): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEYS.CARDS);
    const existing: Card[] = raw ? JSON.parse(raw) : [];
    const map = new Map<string, Card>(existing.map((c) => [c.id, c]));

    newOrUpdatedCards.forEach((c) => {
      map.set(c.id, c);
    });

    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(Array.from(map.values())));
  }

  async updateCard(card: Card): Promise<void> {
    await this.saveCards([card]);
  }

  async saveCard(card: Card): Promise<void> {
    await this.saveCards([card]);
  }

  async createCard(card: Card): Promise<Card> {
    const raw = localStorage.getItem(STORAGE_KEYS.CARDS);
    const all: Card[] = raw ? JSON.parse(raw) : [];
    const newCard: Card = {
      ...card,
      createdAt: card.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.push(newCard);
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(all));
    return newCard;
  }

  async deleteCard(id: string): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEYS.CARDS);
    if (raw) {
      const all: Card[] = JSON.parse(raw);
      const filtered = all.filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(filtered));
    }

    // Clean up associated assessments
    const rawAssess = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
    if (rawAssess) {
      const map: Record<string, SessionAssessment> = JSON.parse(rawAssess);
      const updatedMap: Record<string, SessionAssessment> = {};
      Object.entries(map).forEach(([k, v]) => {
        if (v.cardId !== id) {
          updatedMap[k] = v;
        }
      });
      localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(updatedMap));
    }
  }

  // SESSIONS
  async getSessions(projectId?: string): Promise<PlanningSession[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    const all: PlanningSession[] = raw ? JSON.parse(raw) : [];
    if (!projectId) return all;
    return all.filter((s) => s.projectId === projectId);
  }

  async getSession(id: string): Promise<PlanningSession | null> {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    const all: PlanningSession[] = raw ? JSON.parse(raw) : [];
    return all.find((s) => s.id === id) || null;
  }

  async saveSession(session: PlanningSession): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    const all: PlanningSession[] = raw ? JSON.parse(raw) : [];
    const idx = all.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      all[idx] = session;
    } else {
      all.push(session);
    }
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(all));
  }

  async deleteSession(sessionId: string): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (raw) {
      const all: PlanningSession[] = JSON.parse(raw);
      const filtered = all.filter((s) => s.id !== sessionId);
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(filtered));
    }

    // Cascade delete assessments for this session
    const rawAssess = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
    if (rawAssess) {
      const map: Record<string, SessionAssessment> = JSON.parse(rawAssess);
      const updatedMap: Record<string, SessionAssessment> = {};
      Object.entries(map).forEach(([k, v]) => {
        if (v.sessionId !== sessionId) {
          updatedMap[k] = v;
        }
      });
      localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(updatedMap));
    }

    // Cascade delete actions for this session
    const rawActions = localStorage.getItem(STORAGE_KEYS.ACTIONS);
    if (rawActions) {
      const all: FollowUpAction[] = JSON.parse(rawActions);
      localStorage.setItem(
        STORAGE_KEYS.ACTIONS,
        JSON.stringify(all.filter((a) => a.sessionId !== sessionId))
      );
    }

    // Cascade delete comments for this session
    const rawComms = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    if (rawComms) {
      const all: CardComment[] = JSON.parse(rawComms);
      localStorage.setItem(
        STORAGE_KEYS.COMMENTS,
        JSON.stringify(all.filter((c) => c.sessionId !== sessionId))
      );
    }

    // Cascade delete logs for this session
    const rawLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (rawLogs) {
      const all: ActivityLog[] = JSON.parse(rawLogs);
      localStorage.setItem(
        STORAGE_KEYS.LOGS,
        JSON.stringify(all.filter((l) => l.sessionId !== sessionId))
      );
    }
  }

  async duplicateSession(sessionId: string): Promise<PlanningSession> {
    const original = await this.getSession(sessionId);
    if (!original) throw new Error('Original session not found');

    const newId = `sess-${Date.now()}`;
    const duplicated: PlanningSession = {
      ...original,
      id: newId,
      name: `${original.name} (Copy)`,
      stage: 'preparation',
      version: 1,
      versionSnapshots: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.saveSession(duplicated);

    // Duplicate assessments
    const existingAssessments = await this.getAssessments(sessionId);
    const rawAssess = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
    const assessMap: Record<string, SessionAssessment> = rawAssess ? JSON.parse(rawAssess) : {};
    Object.values(existingAssessments).forEach((a) => {
      assessMap[`${newId}:${a.cardId}`] = {
        ...a,
        sessionId: newId,
        version: 1,
        lastEditedAt: new Date().toISOString(),
      };
    });
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(assessMap));

    return duplicated;
  }

  // WORKSTREAMS
  async deleteWorkstream(projectId: string, workstreamId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) return;

    project.workstreams = project.workstreams.filter((w) => w.id !== workstreamId);
    project.updatedAt = new Date().toISOString();
    await this.saveProject(project);
  }

  async updateWorkstream(projectId: string, workstream: Workstream): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) return;

    const idx = project.workstreams.findIndex((w) => w.id === workstream.id);
    if (idx >= 0) {
      project.workstreams[idx] = workstream;
    } else {
      project.workstreams.push(workstream);
    }
    project.updatedAt = new Date().toISOString();
    await this.saveProject(project);
  }

  async closeSession(sessionId: string, closedBy: string, summary: string): Promise<VersionSnapshot> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const assessmentsMap = await this.getAssessments(sessionId);
    const assessments = Object.values(assessmentsMap);
    const actions = await this.getActions(sessionId);

    const selectedCount = assessments.filter((a) => a.decision === 'Selected').length;

    const snapshot: VersionSnapshot = {
      version: session.version,
      closedAt: new Date().toISOString(),
      closedBy,
      summary,
      assessmentsCount: assessments.length,
      selectedCount,
      actionsCount: actions.length,
      dataSnapshot: {
        assessments,
        actions,
      },
    };

    session.stage = 'closed';
    session.closedAt = snapshot.closedAt;
    session.versionSnapshots = session.versionSnapshots || [];
    session.versionSnapshots.push(snapshot);
    await this.saveSession(session);

    return snapshot;
  }

  async reopenSession(sessionId: string): Promise<PlanningSession> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    session.stage = 'reopened';
    session.version = (session.version || 1) + 1;
    session.updatedAt = new Date().toISOString();
    await this.saveSession(session);
    return session;
  }

  // ASSESSMENTS
  async getAssessments(sessionId: string): Promise<Record<string, SessionAssessment>> {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
    const map: Record<string, SessionAssessment> = raw ? JSON.parse(raw) : {};
    const result: Record<string, SessionAssessment> = {};

    Object.entries(map).forEach(([key, val]) => {
      if (val.sessionId === sessionId) {
        result[val.cardId] = val;
      }
    });

    return result;
  }

  async getAssessment(sessionId: string, cardId: string): Promise<SessionAssessment | null> {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
    const map: Record<string, SessionAssessment> = raw ? JSON.parse(raw) : {};
    return map[`${sessionId}:${cardId}`] || null;
  }

  async saveAssessment(
    assessment: SessionAssessment
  ): Promise<{ success: boolean; conflict?: SessionAssessment }> {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
    const map: Record<string, SessionAssessment> = raw ? JSON.parse(raw) : {};
    const key = `${assessment.sessionId}:${assessment.cardId}`;
    const existing = map[key];

    // Conflict detection: if existing version is greater than incoming base version, detect conflict!
    if (existing && existing.version > assessment.version) {
      return {
        success: false,
        conflict: existing,
      };
    }

    // Bump version
    const updated: SessionAssessment = {
      ...assessment,
      version: (existing?.version || 0) + 1,
      lastEditedAt: new Date().toISOString(),
    };

    map[key] = updated;
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(map));

    return {
      success: true,
    };
  }

  // ACTIONS
  async getActions(sessionId: string): Promise<FollowUpAction[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIONS);
    const all: FollowUpAction[] = raw ? JSON.parse(raw) : [];
    return all.filter((a) => a.sessionId === sessionId);
  }

  async saveAction(action: FollowUpAction): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIONS);
    const all: FollowUpAction[] = raw ? JSON.parse(raw) : [];
    const idx = all.findIndex((a) => a.id === action.id);
    if (idx >= 0) {
      all[idx] = action;
    } else {
      all.push(action);
    }
    localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(all));
  }

  async deleteAction(id: string): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIONS);
    const all: FollowUpAction[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(filtered));
  }

  // COMMENTS
  async getComments(sessionId: string, cardId: string): Promise<CardComment[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    const all: CardComment[] = raw ? JSON.parse(raw) : [];
    return all.filter((c) => c.sessionId === sessionId && c.cardId === cardId);
  }

  async getAllSessionComments(sessionId: string): Promise<CardComment[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    const all: CardComment[] = raw ? JSON.parse(raw) : [];
    return all.filter((c) => c.sessionId === sessionId);
  }

  async getAllComments(): Promise<CardComment[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    return raw ? JSON.parse(raw) : [];
  }

  async addComment(commentData: Omit<CardComment, 'id' | 'createdAt'>): Promise<CardComment> {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    const all: CardComment[] = raw ? JSON.parse(raw) : [];
    const newComment: CardComment = {
      ...commentData,
      id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    all.push(newComment);
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(all));
    return newComment;
  }

  // LOGS
  async getActivityLogs(sessionId: string): Promise<ActivityLog[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    const all: ActivityLog[] = raw ? JSON.parse(raw) : [];
    return all.filter((l) => l.sessionId === sessionId);
  }

  async logActivity(logData: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    const all: ActivityLog[] = raw ? JSON.parse(raw) : [];
    const entry: ActivityLog = {
      ...logData,
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    all.unshift(entry);
    // Keep max 200 logs
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(all.slice(0, 200)));
  }

  // APPLY AGREED TO PROJECT (PRD Section 8 & 11)
  async applyAgreedToProject(
    sessionId: string,
    appliedBy: string
  ): Promise<{ updatedCount: number; message: string }> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const assessments = await this.getAssessments(sessionId);
    const cards = await this.getCards(session.projectId);
    let updatedCount = 0;

    const updatedCards = cards.map((card) => {
      const assessment = assessments[card.id];
      if (!assessment) return card;

      let changed = false;
      const cardCopy = { ...card };

      // If proposed priority is set and not unprioritized, apply to card
      if (assessment.proposedPriority && assessment.proposedPriority !== 'Unprioritized') {
        if (cardCopy.currentPriority !== assessment.proposedPriority) {
          cardCopy.currentPriority = assessment.proposedPriority;
          changed = true;
        }
      }

      // If workshop decision is Selected and milestone target is defined, update target
      if (assessment.milestoneOutcome && assessment.milestoneOutcome.trim() !== '') {
        cardCopy.targetDateOrQuarter = assessment.milestoneOutcome;
        changed = true;
      }

      if (changed) {
        cardCopy.updatedAt = new Date().toISOString();
        updatedCount++;
      }

      return cardCopy;
    });

    await this.saveCards(updatedCards);

    await this.logActivity({
      sessionId,
      userId: 'system',
      userName: appliedBy,
      action: `Applied agreed workshop priorities and milestone targets to ${updatedCount} project cards`,
    });

    return {
      updatedCount,
      message: `Successfully applied agreed priorities and targets to ${updatedCount} cards in project backlog.`,
    };
  }
}

export const persistenceService = new PersistenceService();
