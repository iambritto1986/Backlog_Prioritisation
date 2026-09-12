/**
 * Product Planner - Core Data Schema & Types
 * Defined in accordance with Collaborative Planning Workspace PRD
 */

export type Role =
  | 'workspace_admin'
  | 'project_lead'
  | 'facilitator'
  | 'editor'
  | 'contributor'
  | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  role: Role;
  isVerified: boolean;
  isSimulated?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  organization: string;
  accessSettings: {
    allowGuestInvites: boolean;
    requireEmailVerification: boolean;
    defaultRole: Role;
  };
  createdAt: string;
}

export type DeliveryStage =
  | 'Requirements'
  | 'Architecture & Design'
  | 'Development'
  | 'Development & Integration'
  | 'Testing'
  | 'Testing & Validation'
  | 'Delivered';

export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'Unprioritized';

export type BusinessValue = 'High' | 'Medium' | 'Low' | 'Unknown';

export type Impact = 'High' | 'Medium' | 'Low' | 'Unknown';

export type Urgency = 'High' | 'Medium' | 'Low' | 'Unknown';

export type Effort = 'Small' | 'Medium' | 'Large' | 'Unknown';

export type WorkshopDisposition =
  | 'Selected'
  | 'Reserve'
  | 'Defer'
  | 'Drop'
  | 'Needs Validation'
  | 'Not Discussed';

export interface Workstream {
  id: string;
  projectId: string;
  name: string;
  leadName: string;
  leadEmail?: string;
  displayOrder: number;
  color?: string;
}

export interface Card {
  id: string; // Stable card ID (e.g. REC-101, AVMAIS-042)
  projectId: string;
  workstreamId: string;
  workstreamName: string;
  title: string;
  description: string;
  currentPriority: Priority;
  currentStage: DeliveryStage;
  internalOwner: string; // Imported display name, accounts not linked automatically
  internalOwnerEmail?: string;
  isInternalOwnerLinked?: boolean;
  deliveryPartnerOwner: string; // e.g. Pearl Owner
  deliveryPartnerOwnerEmail?: string;
  isDeliveryPartnerOwnerLinked?: boolean;
  targetDateOrQuarter: string; // Preserves "Ongoing", "TBD", "June 2027", "Q4 2026"
  dependencies: string;
  storyPoints?: number;
  customFields: Record<string, string>;
  sourceMeta: {
    sheetName?: string;
    rowNumber?: number;
    rawStatus?: string;
    importedAt?: string;
    isHistorical?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SessionAssessment {
  sessionId: string;
  cardId: string;
  proposedPriority: Priority;
  businessValue: BusinessValue;
  memberImpact: Impact; // Configurable label (e.g. "Customer Impact")
  urgency: Urgency;
  effort: Effort;
  storyPoints?: number;
  workstreamRank: number | null;
  decision: WorkshopDisposition;
  milestoneOutcome: string; // Intended result and proposed timing
  teamRationale: string; // Shared discussion record
  validationNeeds: string; // Missing info or unresolved questions
  lastEditedBy: string;
  lastEditedAt: string;
  version: number;
}

export interface FollowUpAction {
  id: string;
  sessionId: string;
  cardId: string;
  action: string;
  owner: string;
  dueDate: string;
  status: 'open' | 'in_progress' | 'completed';
  createdAt: string;
}

export interface CardComment {
  id: string;
  sessionId: string;
  cardId: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  content: string;
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
  isImported?: boolean;
}

export type VotingType = 'proposed_priority' | 'story_points' | 'disposition' | 'effort' | 'tshirt';

export interface VotingRound {
  id: string;
  sessionId: string;
  cardId: string;
  cardTitle: string;
  prompt: string;
  type: VotingType;
  options?: string[];
  status: 'open' | 'revealed' | 'closed';
  startedAt: string;
  closedAt?: string;
  votes: Record<string, { userId: string; userName: string; vote: string; timestamp: string }>;
  consolidatedResult?: string;
  averagePoints?: number;
}

export interface SessionAgendaItem {
  id: string;
  title: string;
  completed: boolean;
  workstreamId?: string;
  allocatedMinutes?: number;
}

export type SessionStage = 'preparation' | 'live' | 'review' | 'closed' | 'reopened';

export interface VersionSnapshot {
  version: number;
  closedAt: string;
  closedBy: string;
  summary: string;
  assessmentsCount: number;
  selectedCount: number;
  actionsCount: number;
  dataSnapshot: {
    assessments: SessionAssessment[];
    actions: FollowUpAction[];
  };
}

export interface PlanningSession {
  id: string;
  projectId: string;
  name: string;
  date: string; // Meeting date (separate from target delivery horizon)
  timeZone: string;
  objective: string;
  deliveryHorizon: string; // Separate target horizon
  agenda: SessionAgendaItem[];
  stage: SessionStage;
  closedAt?: string;
  facilitatorId: string;
  facilitatorName: string;
  activeCardId?: string;
  activeWorkstreamId?: string;
  activeVotingRound?: VotingRound;
  isVotingActive?: boolean;
  version: number;
  versionSnapshots?: VersionSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  targetHorizon: string;
  impactLabelName: string; // e.g. "Member Impact" or "Customer Impact"
  workstreams: Workstream[];
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  projectId: string;
  sessionId?: string;
  role: Role;
  code: string;
  expiresAt: string;
  isRevoked: boolean;
  invitedEmail?: string;
  createdAt: string;
  createdBy: string;
}

export interface ActivityLog {
  id: string;
  sessionId: string;
  cardId?: string;
  userId: string;
  userName: string;
  action: string;
  field?: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface PresenceState {
  userId: string;
  userName: string;
  role: Role;
  avatarColor: string;
  activeCardId?: string;
  activeWorkstreamId?: string;
  cursor?: { x: number; y: number };
  isOnline: boolean;
  lastSeen: number;
  followingFacilitator: boolean;
  currentDraftField?: string;
}
