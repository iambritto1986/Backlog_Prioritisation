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
  WorkspacePlanStatus,
  SessionFeedback,
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
  FEEDBACK: 'pp_feedback_v1',
};

// ---------------------------------------------------------------------------
// LocalPersistenceService — the original, unchanged localStorage
// implementation. Kept as-is (not deleted) for two reasons:
//
// 1. Guest fallback. Session guests join via a link with no Clerk account
//    (see api.js's comments on why /api/db requires requireAuth()), so they
//    can't write to the real backend at all today. Before this migration,
//    EVERY browser (facilitator or guest) persisted locally and synced peers
//    via Socket.IO — that's how guests have always worked. Flipping
//    everything to the API unconditionally would silently break guest
//    writes (votes, comments, assessments) the moment this ships. Wiring a
//    real guest identity into the backend (a lightweight guest User row,
//    validated against the session's joinToken instead of a Clerk session)
//    is a real follow-up, not something to rush into this pass — so guests
//    keep exactly today's behavior via this class.
// 2. Safety net. If the real API ever fails (network hiccup, DB not
//    configured yet on a fresh deploy — see db.js's prisma-null fallback),
//    ApiPersistenceService calls fall back to this instead of losing the
//    write entirely.
// ---------------------------------------------------------------------------
class LocalPersistenceService implements IPersistenceService {
  async resetToDefaults(): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(SEED_PROJECTS));
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(SEED_CARDS));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(SEED_SESSIONS));

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

    const rawCards = localStorage.getItem(STORAGE_KEYS.CARDS);
    if (rawCards) {
      const allCards: Card[] = JSON.parse(rawCards);
      const remainingCards = allCards.filter((c) => c.projectId !== id);
      localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(remainingCards));
    }

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

  async replaceCardsForProject(projectId: string, newCards: Card[]): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEYS.CARDS);
    const existing: Card[] = raw ? JSON.parse(raw) : [];
    const otherCards = existing.filter((c) => c.projectId !== projectId);
    const combined = [...otherCards, ...newCards];
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(combined));
  }

  async clearCardsForProject(projectId: string): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEYS.CARDS);
    const existing: Card[] = raw ? JSON.parse(raw) : [];
    const remaining = existing.filter((c) => c.projectId !== projectId);
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(remaining));
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

    const rawActions = localStorage.getItem(STORAGE_KEYS.ACTIONS);
    if (rawActions) {
      const all: FollowUpAction[] = JSON.parse(rawActions);
      localStorage.setItem(
        STORAGE_KEYS.ACTIONS,
        JSON.stringify(all.filter((a) => a.sessionId !== sessionId))
      );
    }

    const rawComms = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    if (rawComms) {
      const all: CardComment[] = JSON.parse(rawComms);
      localStorage.setItem(
        STORAGE_KEYS.COMMENTS,
        JSON.stringify(all.filter((c) => c.sessionId !== sessionId))
      );
    }

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

  // POST-CLOSE FEEDBACK
  async getSessionFeedback(sessionId: string): Promise<SessionFeedback[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.FEEDBACK);
    const all: SessionFeedback[] = raw ? JSON.parse(raw) : [];
    return all.filter((f) => f.sessionId === sessionId);
  }

  async submitSessionFeedback(sessionId: string, rating: number): Promise<SessionFeedback> {
    const raw = localStorage.getItem(STORAGE_KEYS.FEEDBACK);
    const all: SessionFeedback[] = raw ? JSON.parse(raw) : [];
    const entry: SessionFeedback = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sessionId,
      rating,
      submittedAt: new Date().toISOString(),
    };
    all.push(entry);
    localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(all));
    return entry;
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
  ): Promise<{ success: boolean; conflict?: SessionAssessment; saved?: SessionAssessment }> {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
    const map: Record<string, SessionAssessment> = raw ? JSON.parse(raw) : {};
    const key = `${assessment.sessionId}:${assessment.cardId}`;
    const existing = map[key];

    if (existing && existing.version > assessment.version) {
      return {
        success: false,
        conflict: existing,
      };
    }

    const updated: SessionAssessment = {
      ...assessment,
      version: (existing?.version || 0) + 1,
      lastEditedAt: new Date().toISOString(),
    };

    map[key] = updated;
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(map));

    return {
      success: true,
      saved: updated,
    };
  }

  async applyAssessmentSync(assessment: SessionAssessment): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
    const map: Record<string, SessionAssessment> = raw ? JSON.parse(raw) : {};
    const key = `${assessment.sessionId}:${assessment.cardId}`;
    const existing = map[key];

    if (existing && existing.version > assessment.version) return;

    map[key] = assessment;
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(map));
  }

  async applyCommentSync(comment: CardComment): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    const all: CardComment[] = raw ? JSON.parse(raw) : [];
    if (all.some((c) => c.id === comment.id)) return;
    all.push(comment);
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(all));
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
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(all.slice(0, 200)));
  }

  // APPLY AGREED TO PROJECT
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

      if (assessment.proposedPriority && assessment.proposedPriority !== 'Unprioritized') {
        if (cardCopy.currentPriority !== assessment.proposedPriority) {
          cardCopy.currentPriority = assessment.proposedPriority;
          changed = true;
        }
      }

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

  // Real-backend-only concepts: no-ops here so the dispatcher below can call
  // them unconditionally without a guest ever hitting a "not implemented".
  async getWorkspacePlan(): Promise<WorkspacePlanStatus | null> {
    return null;
  }

  async createSessionShareLink(_sessionId: string): Promise<{ token: string; url: string; expiresAt: string }> {
    throw new Error('Durable share links require a signed-in account.');
  }
}

// ---------------------------------------------------------------------------
// ApiPersistenceService — talks to the real /api/db backend (api.js /
// prisma/schema.prisma). Same-origin fetch calls carry the browser's Clerk
// session cookie automatically, so no auth header wiring is needed here.
// ---------------------------------------------------------------------------
async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/db${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const j = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });
const put = (body: unknown): RequestInit => ({ method: 'PUT', body: JSON.stringify(body) });

function groupByProjectId(cards: Card[]): Map<string, Card[]> {
  const groups = new Map<string, Card[]>();
  cards.forEach((c) => {
    const list = groups.get(c.projectId) || [];
    list.push(c);
    groups.set(c.projectId, list);
  });
  return groups;
}

class ApiPersistenceService implements IPersistenceService {
  async resetToDefaults(): Promise<void> {
    // No-op against the real backend — App.tsx's own "seed if empty" logic
    // (calling saveProject/saveCards/saveSession directly) already handles
    // first-run, and there's no browser-local cache here to reset.
  }

  // PROJECTS
  async getProjects(): Promise<Project[]> {
    return apiFetch('/projects');
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      return await apiFetch(`/projects/${id}`);
    } catch {
      return null;
    }
  }

  async saveProject(project: Project): Promise<void> {
    await apiFetch('/projects', j(project));
  }

  async deleteProject(id: string): Promise<void> {
    await apiFetch(`/projects/${id}`, { method: 'DELETE' });
  }

  // CARDS
  async getCards(projectId: string): Promise<Card[]> {
    return apiFetch(`/projects/${projectId}/cards`);
  }

  async getCard(id: string): Promise<Card | null> {
    try {
      return await apiFetch(`/cards/${id}`);
    } catch {
      return null;
    }
  }

  // Upserts (mirrors the localStorage version's semantics). Cards can belong
  // to different projects in one call (e.g. first-run seeding), and the bulk
  // endpoint is nested under one project, so group and call it once per
  // project represented in the batch.
  async saveCards(cards: Card[]): Promise<void> {
    const groups = groupByProjectId(cards);
    for (const [projectId, groupCards] of groups) {
      await apiFetch(`/projects/${projectId}/cards/bulk`, j(groupCards));
    }
  }

  async replaceCardsForProject(projectId: string, cards: Card[]): Promise<void> {
    await apiFetch(`/projects/${projectId}/cards/replace`, put(cards));
  }

  async clearCardsForProject(projectId: string): Promise<void> {
    await apiFetch(`/projects/${projectId}/cards`, { method: 'DELETE' });
  }

  async saveCard(card: Card): Promise<void> {
    await this.saveCards([card]);
  }

  async updateCard(card: Card): Promise<void> {
    await this.saveCards([card]);
  }

  async createCard(card: Card): Promise<Card> {
    return apiFetch(`/projects/${card.projectId}/cards`, j(card));
  }

  async deleteCard(id: string): Promise<void> {
    await apiFetch(`/cards/${id}`, { method: 'DELETE' });
  }

  // SESSIONS
  async getSessions(projectId?: string): Promise<PlanningSession[]> {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return apiFetch(`/sessions${qs}`);
  }

  async getSession(id: string): Promise<PlanningSession | null> {
    try {
      return await apiFetch(`/sessions/${id}`);
    } catch {
      return null;
    }
  }

  async saveSession(session: PlanningSession): Promise<void> {
    await apiFetch('/sessions', j(session));
  }

  async deleteSession(sessionId: string): Promise<void> {
    await apiFetch(`/sessions/${sessionId}`, { method: 'DELETE' });
  }

  async duplicateSession(sessionId: string): Promise<PlanningSession> {
    return apiFetch(`/sessions/${sessionId}/duplicate`, j({}));
  }

  async closeSession(sessionId: string, closedBy: string, summary: string): Promise<VersionSnapshot> {
    return apiFetch(`/sessions/${sessionId}/close`, j({ closedBy, summary }));
  }

  async reopenSession(sessionId: string): Promise<PlanningSession> {
    return apiFetch(`/sessions/${sessionId}/reopen`, j({}));
  }

  // POST-CLOSE FEEDBACK
  async getSessionFeedback(sessionId: string): Promise<SessionFeedback[]> {
    return apiFetch(`/sessions/${sessionId}/feedback`);
  }

  async submitSessionFeedback(sessionId: string, rating: number): Promise<SessionFeedback> {
    return apiFetch(`/sessions/${sessionId}/feedback`, j({ rating }));
  }

  // WORKSTREAMS
  async deleteWorkstream(projectId: string, workstreamId: string): Promise<void> {
    await apiFetch(`/projects/${projectId}/workstreams/${workstreamId}`, { method: 'DELETE' });
  }

  async updateWorkstream(projectId: string, workstream: Workstream): Promise<void> {
    await apiFetch(`/projects/${projectId}/workstreams/${workstream.id}`, put(workstream));
  }

  // ASSESSMENTS
  async getAssessments(sessionId: string): Promise<Record<string, SessionAssessment>> {
    return apiFetch(`/sessions/${sessionId}/assessments`);
  }

  async getAssessment(sessionId: string, cardId: string): Promise<SessionAssessment | null> {
    return apiFetch(`/sessions/${sessionId}/assessments/${cardId}`);
  }

  async saveAssessment(
    assessment: SessionAssessment
  ): Promise<{ success: boolean; conflict?: SessionAssessment; saved?: SessionAssessment }> {
    return apiFetch(
      `/sessions/${assessment.sessionId}/assessments/${assessment.cardId}`,
      put(assessment)
    );
  }

  async applyAssessmentSync(assessment: SessionAssessment): Promise<void> {
    await apiFetch(
      `/sessions/${assessment.sessionId}/assessments/${assessment.cardId}/sync`,
      j(assessment)
    );
  }

  // ACTIONS
  async getActions(sessionId: string): Promise<FollowUpAction[]> {
    return apiFetch(`/sessions/${sessionId}/actions`);
  }

  async saveAction(action: FollowUpAction): Promise<void> {
    await apiFetch(`/sessions/${action.sessionId}/actions`, j(action));
  }

  async deleteAction(id: string): Promise<void> {
    await apiFetch(`/actions/${id}`, { method: 'DELETE' });
  }

  // COMMENTS
  async getComments(sessionId: string, cardId: string): Promise<CardComment[]> {
    return apiFetch(`/sessions/${sessionId}/cards/${cardId}/comments`);
  }

  async getAllSessionComments(sessionId: string): Promise<CardComment[]> {
    return apiFetch(`/sessions/${sessionId}/comments`);
  }

  async addComment(commentData: Omit<CardComment, 'id' | 'createdAt'>): Promise<CardComment> {
    return apiFetch(`/sessions/${commentData.sessionId}/cards/${commentData.cardId}/comments`, j(commentData));
  }

  async applyCommentSync(comment: CardComment): Promise<void> {
    await apiFetch(`/sessions/${comment.sessionId}/comments/sync`, j(comment));
  }

  // LOGS
  async getActivityLogs(sessionId: string): Promise<ActivityLog[]> {
    return apiFetch(`/sessions/${sessionId}/activity`);
  }

  async logActivity(logData: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
    await apiFetch(`/sessions/${logData.sessionId}/activity`, j(logData));
  }

  // APPLY AGREED TO PROJECT
  async applyAgreedToProject(
    sessionId: string,
    appliedBy: string
  ): Promise<{ updatedCount: number; message: string }> {
    return apiFetch(`/sessions/${sessionId}/apply-agreed`, j({ appliedBy }));
  }

  // PLAN / TRIAL / INVITE LIMIT
  async getWorkspacePlan(): Promise<WorkspacePlanStatus | null> {
    try {
      return await apiFetch('/workspace/plan');
    } catch {
      return null;
    }
  }

  async createSessionShareLink(sessionId: string): Promise<{ token: string; url: string; expiresAt: string }> {
    return apiFetch(`/sessions/${sessionId}/share`, j({}));
  }
}

// ---------------------------------------------------------------------------
// PersistenceService — the public singleton every component imports.
//
// Dispatches between the two implementations above based on whether the
// browser currently has a real, signed-in Clerk session:
//   - Signed-in (facilitator / team member): real backend, with a fallback
//     to localStorage if the API call throws (network hiccup, or the DB
//     genuinely isn't configured yet on a fresh deploy).
//   - Not signed in (a session guest, joined via link): localStorage, same
//     as every browser did before this migration — see the comment on
//     LocalPersistenceService for why guests aren't switched over yet.
//
// IMPORTANT — this used to sniff `window.Clerk?.session` synchronously on
// every call. That was a race: Clerk's SDK initializes asynchronously (tens
// to hundreds of ms after mount, sometimes longer on a cold load), so any
// persistence call made before it finishes — most notably App.tsx's
// initApp(), which runs in a mount effect immediately — would see no
// session yet and silently read/write localStorage instead of the real
// backend, even for a fully signed-in user. Because different calls in the
// same page load could straddle that window differently (e.g. an early
// getProjects() reading Local while a later deleteProject() — issued after
// Clerk had loaded — hit the Api), the app would flip between two
// completely independent data stores within one session: a project "deleted"
// via the API would still exist in the Local seed data an earlier read had
// shown, reappearing after the next refresh landed back on the Local path.
// That produced exactly the symptoms reported after the first real-backend
// deploy (a deleted project "coming back", sessions/cards intermittently
// missing, Start Voting silently no-op'ing because the session's cards
// array came back empty).
//
// The fix: never guess. App.tsx explicitly reports the real auth mode via
// setPersistenceAuthMode() once Clerk's `useUser()` hook resolves
// `isLoaded` (or immediately, for a guest session restored from
// localStorage, which is known synchronously). Every dispatcher call awaits
// that mode instead of sampling `window.Clerk` mid-flight — so the very
// first call of a page load blocks (briefly) until the real answer is
// known, rather than racing ahead on a guess. A short safety timeout
// prevents an indefinite hang if something upstream never reports in.
// ---------------------------------------------------------------------------
export type PersistenceAuthMode = 'guest' | 'signed_in';

let authMode: PersistenceAuthMode | null = null;
let resolveAuthMode: ((mode: PersistenceAuthMode) => void) | null = null;
let authModeReady: Promise<PersistenceAuthMode> = new Promise((resolve) => {
  resolveAuthMode = resolve;
});

// Called from App.tsx as soon as the real answer is known: synchronously on
// mount for a restored guest session, or from an effect keyed on Clerk's
// `isLoaded` for everyone else. Safe to call repeatedly (e.g. when a guest
// signs in, or a signed-in user signs out) — later calls just update the
// live value; only the *first* call resolves the initial gate.
export function setPersistenceAuthMode(mode: PersistenceAuthMode): void {
  authMode = mode;
  if (resolveAuthMode) {
    resolveAuthMode(mode);
    resolveAuthMode = null;
  }
  if (mode === 'signed_in') {
    purgeStaleLocalCacheOnce();
  }
}

// This browser's localStorage was, for many months before the real backend
// existed, the ONLY place any data lived — including the two hardcoded demo
// projects ("Nova Platform Modernization 2027" / "Billing & Payments
// Modernization" in src/data/seedData.ts) that initApp() seeds whenever it
// sees an empty project list. A signed-in user's data now lives in Postgres
// and should never fall back to reading that old local cache — but
// PersistenceService.withFallback() *will* fall back to it if a real API
// call ever throws (network hiccup, a transient 5xx, a rate limit).
// Without this, that fallback can surface the old demo projects/cards as if
// they were real, indistinguishable from "my data came back" — exactly what
// was reported after the first real-backend deploy. Clearing it the first
// time a browser is confirmed signed-in removes that stale data from the
// equation entirely: a fallback during a real hiccup now shows "no data
// right now" instead of quietly substituting months-old demo content.
let localCachePurged = false;
function purgeStaleLocalCacheOnce(): void {
  if (localCachePurged) return;
  localCachePurged = true;
  try {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  } catch {
    // localStorage unavailable (private browsing, etc.) — nothing to purge.
  }
}

async function resolveSignedIn(): Promise<boolean> {
  if (authMode !== null) return authMode === 'signed_in';
  // Auth mode not reported yet (very first calls of a fresh page load,
  // racing App.tsx's own effects) — wait for the real answer instead of
  // guessing, with a safety timeout so a page that never calls
  // setPersistenceAuthMode (e.g. a stray import in a test) can't hang
  // forever.
  const mode = await Promise.race([
    authModeReady,
    new Promise<PersistenceAuthMode>((resolve) => setTimeout(() => resolve('guest'), 6000)),
  ]);
  return mode === 'signed_in';
}

// Exposed so App.tsx's first-run "seed demo data" convenience can skip
// itself entirely once a real backend is in play — see the comment on that
// call site for why writing fabricated demo rows into a signed-in user's
// real, shared Postgres workspace is a correctness bug, not a UX nicety.
export async function isRealBackendActive(): Promise<boolean> {
  return resolveSignedIn();
}

export class PersistenceService implements IPersistenceService {
  private local = new LocalPersistenceService();
  private api = new ApiPersistenceService();

  constructor() {
    // Unlike the old localStorage-only service, this no longer auto-seeds on
    // construction (there's no synchronous "is storage empty?" check that
    // makes sense against a network backend). App.tsx's initApp() already
    // seeds explicitly when getProjects() comes back empty.
  }

  private async withFallback<T>(
    op: (svc: IPersistenceService) => Promise<T>,
    label: string
  ): Promise<T> {
    if (!(await resolveSignedIn())) {
      return op(this.local);
    }
    try {
      return await op(this.api);
    } catch (err) {
      console.warn(`[PersistenceService] ${label} failed against the real backend, falling back to local storage:`, err);
      return op(this.local);
    }
  }

  async resetToDefaults(): Promise<void> {
    return this.withFallback((s) => s.resetToDefaults(), 'resetToDefaults');
  }

  // PROJECTS
  async getProjects(): Promise<Project[]> {
    return this.withFallback((s) => s.getProjects(), 'getProjects');
  }
  async getProject(id: string): Promise<Project | null> {
    return this.withFallback((s) => s.getProject(id), 'getProject');
  }
  async saveProject(project: Project): Promise<void> {
    return this.withFallback((s) => s.saveProject(project), 'saveProject');
  }
  async deleteProject(id: string): Promise<void> {
    return this.withFallback((s) => s.deleteProject(id), 'deleteProject');
  }

  // CARDS
  async getCards(projectId: string): Promise<Card[]> {
    return this.withFallback((s) => s.getCards(projectId), 'getCards');
  }
  async getCard(id: string): Promise<Card | null> {
    return this.withFallback((s) => s.getCard(id), 'getCard');
  }
  async saveCards(cards: Card[]): Promise<void> {
    return this.withFallback((s) => s.saveCards(cards), 'saveCards');
  }
  async replaceCardsForProject(projectId: string, cards: Card[]): Promise<void> {
    return this.withFallback((s) => s.replaceCardsForProject(projectId, cards), 'replaceCardsForProject');
  }
  async clearCardsForProject(projectId: string): Promise<void> {
    return this.withFallback((s) => s.clearCardsForProject(projectId), 'clearCardsForProject');
  }
  async saveCard(card: Card): Promise<void> {
    return this.withFallback((s) => s.saveCard(card), 'saveCard');
  }
  async updateCard(card: Card): Promise<void> {
    return this.withFallback((s) => s.updateCard(card), 'updateCard');
  }
  async createCard(card: Card): Promise<Card> {
    return this.withFallback((s) => s.createCard(card), 'createCard');
  }
  async deleteCard(id: string): Promise<void> {
    return this.withFallback((s) => s.deleteCard(id), 'deleteCard');
  }

  // SESSIONS
  async getSessions(projectId?: string): Promise<PlanningSession[]> {
    return this.withFallback((s) => s.getSessions(projectId), 'getSessions');
  }
  async getSession(id: string): Promise<PlanningSession | null> {
    return this.withFallback((s) => s.getSession(id), 'getSession');
  }
  async saveSession(session: PlanningSession): Promise<void> {
    return this.withFallback((s) => s.saveSession(session), 'saveSession');
  }
  async deleteSession(sessionId: string): Promise<void> {
    return this.withFallback((s) => s.deleteSession(sessionId), 'deleteSession');
  }
  async duplicateSession(sessionId: string): Promise<PlanningSession> {
    return this.withFallback((s) => s.duplicateSession(sessionId), 'duplicateSession');
  }
  async closeSession(sessionId: string, closedBy: string, summary: string): Promise<VersionSnapshot> {
    return this.withFallback((s) => s.closeSession(sessionId, closedBy, summary), 'closeSession');
  }
  async reopenSession(sessionId: string): Promise<PlanningSession> {
    return this.withFallback((s) => s.reopenSession(sessionId), 'reopenSession');
  }

  async getSessionFeedback(sessionId: string): Promise<SessionFeedback[]> {
    return this.withFallback((s) => s.getSessionFeedback(sessionId), 'getSessionFeedback');
  }

  // submitSessionFeedback is DELIBERATELY NOT routed through withFallback's
  // usual signed-in/guest split. Every other guest write (cards, votes,
  // comments) relies on the Socket.IO relay — a guest saves locally, then
  // broadcasts, and whichever signed-in client is currently live in the
  // room re-persists it for real. Feedback is collected specifically AFTER
  // a session closes, which is exactly when the facilitator is LEAST
  // likely to still be sitting in the room to catch that broadcast — so
  // relying on the same relay here would make feedback vanish silently
  // most of the time, not just occasionally. It doesn't need to: feedback
  // is anonymous by design (no identity to gate on), so it can hit a
  // public, unauthenticated endpoint directly (POST /api/sessions/:id/
  // feedback on api.js's joinRouter — same "no Clerk session needed"
  // tier as /api/join/:token and /api/sessions/:id/status) regardless of
  // whether the caller is a guest or a signed-in facilitator testing it
  // themselves. Falls back to local storage only if that network call
  // itself fails, purely so the submitter's own UI doesn't error out —
  // that fallback copy is never read back by anyone.
  async submitSessionFeedback(sessionId: string, rating: number): Promise<SessionFeedback> {
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) {
        throw new Error(`Feedback submission failed (${res.status})`);
      }
      return await res.json();
    } catch (err) {
      console.warn('[PersistenceService] submitSessionFeedback failed against the real backend, saving locally only:', err);
      return this.local.submitSessionFeedback(sessionId, rating);
    }
  }

  // WORKSTREAMS
  async deleteWorkstream(projectId: string, workstreamId: string): Promise<void> {
    return this.withFallback((s) => s.deleteWorkstream(projectId, workstreamId), 'deleteWorkstream');
  }
  async updateWorkstream(projectId: string, workstream: Workstream): Promise<void> {
    return this.withFallback((s) => s.updateWorkstream(projectId, workstream), 'updateWorkstream');
  }

  // ASSESSMENTS
  async getAssessments(sessionId: string): Promise<Record<string, SessionAssessment>> {
    return this.withFallback((s) => s.getAssessments(sessionId), 'getAssessments');
  }
  async getAssessment(sessionId: string, cardId: string): Promise<SessionAssessment | null> {
    return this.withFallback((s) => s.getAssessment(sessionId, cardId), 'getAssessment');
  }
  async saveAssessment(
    assessment: SessionAssessment
  ): Promise<{ success: boolean; conflict?: SessionAssessment; saved?: SessionAssessment }> {
    return this.withFallback((s) => s.saveAssessment(assessment), 'saveAssessment');
  }
  async applyAssessmentSync(assessment: SessionAssessment): Promise<void> {
    return this.withFallback((s) => s.applyAssessmentSync(assessment), 'applyAssessmentSync');
  }

  // ACTIONS
  async getActions(sessionId: string): Promise<FollowUpAction[]> {
    return this.withFallback((s) => s.getActions(sessionId), 'getActions');
  }
  async saveAction(action: FollowUpAction): Promise<void> {
    return this.withFallback((s) => s.saveAction(action), 'saveAction');
  }
  async deleteAction(id: string): Promise<void> {
    return this.withFallback((s) => s.deleteAction(id), 'deleteAction');
  }

  // COMMENTS
  async getComments(sessionId: string, cardId: string): Promise<CardComment[]> {
    return this.withFallback((s) => s.getComments(sessionId, cardId), 'getComments');
  }
  async getAllSessionComments(sessionId: string): Promise<CardComment[]> {
    return this.withFallback((s) => s.getAllSessionComments(sessionId), 'getAllSessionComments');
  }
  async addComment(commentData: Omit<CardComment, 'id' | 'createdAt'>): Promise<CardComment> {
    return this.withFallback((s) => s.addComment(commentData), 'addComment');
  }
  async applyCommentSync(comment: CardComment): Promise<void> {
    return this.withFallback((s) => s.applyCommentSync(comment), 'applyCommentSync');
  }

  // LOGS
  async getActivityLogs(sessionId: string): Promise<ActivityLog[]> {
    return this.withFallback((s) => s.getActivityLogs(sessionId), 'getActivityLogs');
  }
  async logActivity(logData: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
    return this.withFallback((s) => s.logActivity(logData), 'logActivity');
  }

  // APPLY AGREED TO PROJECT
  async applyAgreedToProject(
    sessionId: string,
    appliedBy: string
  ): Promise<{ updatedCount: number; message: string }> {
    return this.withFallback((s) => s.applyAgreedToProject(sessionId, appliedBy), 'applyAgreedToProject');
  }

  // PLAN / TRIAL / INVITE LIMIT — real-backend-only; guests simply get null
  // (no fallback to local, since the concept doesn't exist there).
  async getWorkspacePlan(): Promise<WorkspacePlanStatus | null> {
    if (!(await resolveSignedIn())) return null;
    try {
      return await this.api.getWorkspacePlan();
    } catch {
      return null;
    }
  }
  async createSessionShareLink(sessionId: string): Promise<{ token: string; url: string; expiresAt: string }> {
    if (!(await resolveSignedIn())) {
      throw new Error('Sign in to create a durable share link.');
    }
    return this.api.createSessionShareLink(sessionId);
  }
}

export const persistenceService = new PersistenceService();
