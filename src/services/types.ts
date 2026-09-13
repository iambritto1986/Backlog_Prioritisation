import {
  User,
  Project,
  Card,
  PlanningSession,
  SessionAssessment,
  FollowUpAction,
  CardComment,
  Invitation,
  ActivityLog,
  PresenceState,
  VersionSnapshot,
  Role,
  Workstream,
} from '../types';

export interface IAuthService {
  getCurrentUser(): User;
  setCurrentUser(user: User): void;
  getAvailableUsers(): User[];
  signInWithEmail(email: string, name?: string): Promise<{ token: string; requiresVerification: boolean }>;
  verifyEmailToken(token: string): Promise<User>;
  can(action: 'configure_project' | 'facilitate' | 'edit_cards' | 'vote_and_comment' | 'view'): boolean;
  createInvitation(projectId: string, sessionId: string | undefined, role: Role, invitedEmail?: string): Promise<Invitation>;
  getInvitations(projectId: string): Promise<Invitation[]>;
  revokeInvitation(inviteId: string): Promise<void>;
  joinWithInvite(code: string, name: string, email: string): Promise<User>;
}

export interface IPersistenceService {
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  saveProject(project: Project): Promise<void>;

  getCards(projectId: string): Promise<Card[]>;
  getCard(id: string): Promise<Card | null>;
  saveCards(cards: Card[]): Promise<void>;
  replaceCardsForProject(projectId: string, cards: Card[]): Promise<void>;
  clearCardsForProject(projectId: string): Promise<void>;
  saveCard(card: Card): Promise<void>;
  updateCard(card: Card): Promise<void>;
  deleteCard(id: string): Promise<void>;
  createCard(card: Card): Promise<Card>;

  getSessions(projectId?: string): Promise<PlanningSession[]>;
  getSession(id: string): Promise<PlanningSession | null>;
  saveSession(session: PlanningSession): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  duplicateSession(sessionId: string): Promise<PlanningSession>;
  closeSession(sessionId: string, closedBy: string, summary: string): Promise<VersionSnapshot>;
  reopenSession(sessionId: string): Promise<PlanningSession>;

  deleteWorkstream(projectId: string, workstreamId: string): Promise<void>;
  updateWorkstream(projectId: string, workstream: Workstream): Promise<void>;

  getAssessments(sessionId: string): Promise<Record<string, SessionAssessment>>;
  getAssessment(sessionId: string, cardId: string): Promise<SessionAssessment | null>;
  saveAssessment(assessment: SessionAssessment): Promise<{ success: boolean; conflict?: SessionAssessment; saved?: SessionAssessment }>;
  applyAssessmentSync(assessment: SessionAssessment): Promise<void>;

  getActions(sessionId: string): Promise<FollowUpAction[]>;
  saveAction(action: FollowUpAction): Promise<void>;
  deleteAction(id: string): Promise<void>;

  getComments(sessionId: string, cardId: string): Promise<CardComment[]>;
  addComment(comment: Omit<CardComment, 'id' | 'createdAt'>): Promise<CardComment>;
  applyCommentSync(comment: CardComment): Promise<void>;

  getActivityLogs(sessionId: string): Promise<ActivityLog[]>;
  logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void>;

  applyAgreedToProject(sessionId: string, appliedBy: string): Promise<{ updatedCount: number; message: string }>;
  resetToDefaults(): Promise<void>;
}

export interface IPresenceService {
  subscribe(
    sessionId: string,
    onPresenceUpdate: (peers: PresenceState[]) => void,
    onFacilitatorCommand: (cmd: { type: 'bring_everyone' | 'jump'; cardId: string; workstreamId?: string }) => void,
    onVotingUpdate: (votingState: any) => void,
    onEntitySync?: (entityType: string, data: any) => void
  ): () => void;
  updateCursor(x: number, y: number): void;
  setActiveCard(cardId?: string, workstreamId?: string): void;
  setFollowingFacilitator(following: boolean): void;
  broadcastBringEveryone(cardId: string, workstreamId?: string): void;
  broadcastVotingState(voting: any): void;
  broadcastEntitySync(entityType: string, data: any): void;
  getConnectedPeers(): PresenceState[];
}
