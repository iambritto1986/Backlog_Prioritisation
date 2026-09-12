import React, { useState, useEffect, useRef } from 'react';
import {
  Project,
  Card,
  PlanningSession,
  SessionAssessment,
  FollowUpAction,
  CardComment,
  ActivityLog,
  PresenceState,
  User,
  Priority,
  WorkshopDisposition,
  BusinessValue,
  Impact,
  Urgency,
  Effort,
  VotingRound,
  VotingType,
} from '../../types';
import { persistenceService } from '../../services/PersistenceService';
import { presenceService } from '../../services/PresenceService';
import { authService } from '../../services/AuthService';
import {
  Radio,
  Users,
  Compass,
  Vote,
  SkipForward,
  UserPlus,
  Send,
  MessageSquare,
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Layers,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Home,
  Hash,
  Sparkles,
  Plus,
  Trash2,
  Lock,
  Edit3,
  Flame,
  HelpCircle,
  FolderDown,
  Share2,
} from 'lucide-react';
import { InviteModal } from '../invite/InviteModal';
import { ShareSessionModal } from './ShareSessionModal';
import { LiveVotingModal } from './LiveVotingModal';
import { StartVotingLauncherModal } from './StartVotingLauncherModal';

interface SessionRoomProps {
  session: PlanningSession;
  project: Project;
  cards: Card[];
  currentUser: User;
  onNavigateHome?: () => void;
  onNavigateOverview?: () => void;
  onSessionUpdated: (updated: PlanningSession) => void;
  onCardsUpdated: (cards: Card[]) => void;
  onNavigateToResults: () => void;
}

export const SessionRoom: React.FC<SessionRoomProps> = ({
  session,
  project,
  cards,
  currentUser,
  onNavigateHome,
  onNavigateOverview,
  onSessionUpdated,
  onCardsUpdated,
  onNavigateToResults,
}) => {
  // State
  const [selectedWorkstreamId, setSelectedWorkstreamId] = useState<string>(
    session.activeWorkstreamId || project.workstreams[0]?.id || ''
  );
  const [selectedCardId, setSelectedCardId] = useState<string>(
    session.activeCardId || cards[0]?.id || ''
  );
  const [assessments, setAssessments] = useState<Record<string, SessionAssessment>>({});
  const [actions, setActions] = useState<FollowUpAction[]>([]);
  const [comments, setComments] = useState<CardComment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [peers, setPeers] = useState<PresenceState[]>([]);
  const [followingFacilitator, setFollowingFacilitator] = useState<boolean>(
    currentUser.id !== session.facilitatorId
  );
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [filterDisposition, setFilterDisposition] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRightTab, setActiveRightTab] = useState<'working' | 'details' | 'comments' | 'history'>('working');

  // New comment input
  const [newCommentText, setNewCommentText] = useState('');

  // Follow-up action inputs
  const [newActionText, setNewActionText] = useState('');
  const [newActionOwner, setNewActionOwner] = useState('');
  const [newActionDue, setNewActionDue] = useState('2026-09-30');

  // Voting state
  const [activeVoting, setActiveVoting] = useState<VotingRound | null>(session.activeVotingRound || null);
  const [myVote, setMyVote] = useState<string>('');
  const [showVotingLauncher, setShowVotingLauncher] = useState(false);

  // Conflict state
  const [conflictAssessment, setConflictAssessment] = useState<SessionAssessment | null>(null);

  // Connection indicator
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'conflict'>('saved');

  // Draft dirty tracking
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  // Agenda topic management state
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicMinutes, setNewTopicMinutes] = useState(15);
  const [showAgendaGuide, setShowAgendaGuide] = useState(false);

  // Mouse move ref for cursor broadcasting
  const centerContainerRef = useRef<HTMLDivElement>(null);

  const handleAddAgendaTopic = () => {
    if (!newTopicTitle.trim()) return;
    const newItem = {
      id: `ag-${Date.now()}`,
      title: newTopicTitle.trim(),
      allocatedMinutes: Number(newTopicMinutes) || 15,
      completed: false,
    };
    const updatedSess: PlanningSession = {
      ...session,
      agenda: [...(session.agenda || []), newItem],
      updatedAt: new Date().toISOString(),
    };
    persistenceService.saveSession(updatedSess);
    onSessionUpdated(updatedSess);
    setNewTopicTitle('');
    setIsAddingTopic(false);
  };

  const handleDeleteAgendaTopic = (itemId: string) => {
    const updatedSess: PlanningSession = {
      ...session,
      agenda: session.agenda.filter((a) => a.id !== itemId),
      updatedAt: new Date().toISOString(),
    };
    persistenceService.saveSession(updatedSess);
    onSessionUpdated(updatedSess);
  };

  const isFacilitator =
    currentUser.id === session.facilitatorId ||
    currentUser.role === 'facilitator' ||
    currentUser.role === 'project_lead' ||
    currentUser.role === 'workspace_admin';

  // Load initial session data
  useEffect(() => {
    loadSessionData();
  }, [session.id]);

  const loadSessionData = async () => {
    const [assessMap, acts, logs] = await Promise.all([
      persistenceService.getAssessments(session.id),
      persistenceService.getActions(session.id),
      persistenceService.getActivityLogs(session.id),
    ]);
    setAssessments(assessMap);
    setActions(acts);
    setActivityLogs(logs);

    if (selectedCardId) {
      const comms = await persistenceService.getComments(session.id, selectedCardId);
      setComments(comms);
    }
  };

  // Subscribe to Presence & Facilitator Commands
  useEffect(() => {
    const unsubscribe = presenceService.subscribe(
      session.id,
      (updatedPeers) => {
        setPeers(updatedPeers);
      },
      (cmd) => {
        // Facilitator command received!
        if (followingFacilitator && !isEditingDraft) {
          if (cmd.workstreamId) setSelectedWorkstreamId(cmd.workstreamId);
          if (cmd.cardId) setSelectedCardId(cmd.cardId);
        }
      },
      (votingState) => {
        setActiveVoting(votingState);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [session.id, followingFacilitator, isEditingDraft]);

  // Update active card in presence
  useEffect(() => {
    presenceService.setActiveCard(selectedCardId, selectedWorkstreamId);
    if (selectedCardId) {
      persistenceService.getComments(session.id, selectedCardId).then(setComments);
    }
  }, [selectedCardId, selectedWorkstreamId]);

  // Track cursor movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (centerContainerRef.current) {
      const rect = centerContainerRef.current.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      presenceService.updateCursor(x, y);
    }
  };

  // Active card and assessment helpers
  const selectedCard = cards.find((c) => c.id === selectedCardId) || cards[0];

  const currentAssessment: SessionAssessment = assessments[selectedCard?.id] || {
    sessionId: session.id,
    cardId: selectedCard?.id || '',
    proposedPriority: selectedCard?.currentPriority || 'Unprioritized',
    businessValue: 'Unknown',
    memberImpact: 'Unknown',
    urgency: 'Unknown',
    effort: 'Unknown',
    workstreamRank: null,
    decision: 'Not Discussed',
    milestoneOutcome: selectedCard?.targetDateOrQuarter || '',
    teamRationale: '',
    validationNeeds: '',
    lastEditedBy: currentUser.name,
    lastEditedAt: new Date().toISOString(),
    version: 1,
  };

  // Save assessment field with conflict detection
  const updateAssessmentField = async <K extends keyof SessionAssessment>(
    field: K,
    value: SessionAssessment[K]
  ) => {
    if (!selectedCard) return;
    setSaveStatus('saving');
    setIsEditingDraft(true);

    const updated: SessionAssessment = {
      ...currentAssessment,
      [field]: value,
      lastEditedBy: currentUser.name,
      lastEditedAt: new Date().toISOString(),
    };

    const res = await persistenceService.saveAssessment(updated);

    if (!res.success && res.conflict) {
      setSaveStatus('conflict');
      setConflictAssessment(res.conflict);
    } else {
      setAssessments((prev) => ({
        ...prev,
        [selectedCard.id]: {
          ...updated,
          version: (currentAssessment.version || 0) + 1,
        },
      }));
      setSaveStatus('saved');
      setIsEditingDraft(false);

      // Log activity
      await persistenceService.logActivity({
        sessionId: session.id,
        cardId: selectedCard.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: `Updated ${String(field)} on ${selectedCard.id}`,
        field: String(field),
        newValue: String(value),
      });
      loadSessionData();
    }
  };

  // Rank auto-reorder & duplicate resolution (PRD Section 7)
  const handleRankChange = (newRankVal: number | null) => {
    if (!newRankVal) {
      updateAssessmentField('workstreamRank', null);
      return;
    }

    // Check if duplicate rank exists in this workstream
    const wsCardIds = cards.filter((c) => c.workstreamId === selectedCard?.workstreamId).map((c) => c.id);
    const assessmentList = Object.values(assessments) as SessionAssessment[];
    const duplicate = assessmentList.find(
      (a) => wsCardIds.includes(a.cardId) && a.cardId !== selectedCard?.id && a.workstreamRank === newRankVal
    );

    if (duplicate) {
      // Reorder duplicate item down by 1
      const dupUpdated: SessionAssessment = {
        ...duplicate,
        workstreamRank: newRankVal + 1,
        lastEditedBy: 'System Auto-reorder',
      };
      persistenceService.saveAssessment(dupUpdated);
    }

    updateAssessmentField('workstreamRank', newRankVal);
  };

  // Facilitator: Bring Everyone Here
  const handleBringEveryone = () => {
    if (!selectedCard) return;
    presenceService.broadcastBringEveryone(selectedCard.id, selectedWorkstreamId);

    // Save active state to session
    const updatedSess: PlanningSession = {
      ...session,
      activeCardId: selectedCard.id,
      activeWorkstreamId: selectedWorkstreamId,
      updatedAt: new Date().toISOString(),
    };
    persistenceService.saveSession(updatedSess);
    onSessionUpdated(updatedSess);
  };

  // Facilitator: Next Item
  const handleNextItem = () => {
    const currentWsCards = cards.filter((c) => c.workstreamId === selectedWorkstreamId);
    const currentIdx = currentWsCards.findIndex((c) => c.id === selectedCardId);
    if (currentIdx < currentWsCards.length - 1) {
      const nextCard = currentWsCards[currentIdx + 1];
      setSelectedCardId(nextCard.id);
      if (isFacilitator) {
        presenceService.broadcastBringEveryone(nextCard.id, selectedWorkstreamId);
      }
    }
  };

  // Facilitator: Voting Controls & Scope Selection
  const handleOpenVotingLauncher = () => {
    setShowVotingLauncher(true);
  };

  const handleLaunchVotingRound = (type: VotingType, customPrompt?: string) => {
    if (!selectedCard) return;
    const defaultPrompt =
      type === 'story_points'
        ? `Estimate Story Points / Complexity for ${selectedCard.id}`
        : type === 'disposition'
        ? `Consensus on Workshop Disposition for ${selectedCard.id}`
        : type === 'effort'
        ? `Estimate Effort sizing for ${selectedCard.id}`
        : `Agree on proposed priority for ${selectedCard.id}`;

    const round: VotingRound = {
      id: `vote-${Date.now()}`,
      sessionId: session.id,
      cardId: selectedCard.id,
      cardTitle: selectedCard.title,
      prompt: customPrompt || defaultPrompt,
      type: type,
      status: 'open',
      startedAt: new Date().toISOString(),
      votes: {},
    };
    setMyVote('');
    setActiveVoting(round);
    presenceService.broadcastVotingState(round);
  };

  const handleCastVote = (voteVal: string) => {
    if (!activeVoting) return;
    setMyVote(voteVal);
    const updated: VotingRound = {
      ...activeVoting,
      votes: {
        ...activeVoting.votes,
        [currentUser.id]: {
          userId: currentUser.id,
          userName: currentUser.name,
          vote: voteVal,
          timestamp: new Date().toISOString(),
        },
      },
    };
    setActiveVoting(updated);
    presenceService.broadcastVotingState(updated);
  };

  const handleRevealVotes = () => {
    if (!activeVoting) return;
    const revealed: VotingRound = {
      ...activeVoting,
      status: 'revealed',
    };
    setActiveVoting(revealed);
    presenceService.broadcastVotingState(revealed);
  };

  const handleConfirmDecision = async (resultValue: string, points?: number) => {
    if (!activeVoting || !selectedCard) return;

    if (activeVoting.type === 'story_points') {
      const numPoints = points !== undefined ? points : (parseFloat(resultValue) || 0);
      await updateAssessmentField('storyPoints', numPoints);
      const updatedCards = cards.map((c) =>
        c.id === selectedCard.id ? { ...c, storyPoints: numPoints } : c
      );
      onCardsUpdated(updatedCards);
      await persistenceService.saveCard({ ...selectedCard, storyPoints: numPoints });
      await persistenceService.logActivity({
        sessionId: session.id,
        cardId: selectedCard.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: `Voted & confirmed Story Points: ${numPoints} pts`,
        field: 'storyPoints',
        newValue: `${numPoints}`,
      });
    } else if (activeVoting.type === 'proposed_priority') {
      await updateAssessmentField('proposedPriority', resultValue as Priority);
      await persistenceService.logActivity({
        sessionId: session.id,
        cardId: selectedCard.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: `Voted & confirmed Proposed Priority: ${resultValue}`,
        field: 'proposedPriority',
        newValue: resultValue,
      });
    } else if (activeVoting.type === 'disposition') {
      await updateAssessmentField('decision', resultValue as WorkshopDisposition);
      await persistenceService.logActivity({
        sessionId: session.id,
        cardId: selectedCard.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: `Voted & confirmed Disposition: ${resultValue}`,
        field: 'decision',
        newValue: resultValue,
      });
    } else if (activeVoting.type === 'effort') {
      await updateAssessmentField('effort', resultValue as Effort);
      await persistenceService.logActivity({
        sessionId: session.id,
        cardId: selectedCard.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: `Voted & confirmed Effort: ${resultValue}`,
        field: 'effort',
        newValue: resultValue,
      });
    }

    setActiveVoting(null);
    presenceService.broadcastVotingState(null);
  };

  const handleCancelVoting = () => {
    setActiveVoting(null);
    presenceService.broadcastVotingState(null);
  };

  // Peer simulation for active voting round
  useEffect(() => {
    if (!activeVoting || activeVoting.status !== 'open') return;
    const missingPeers = peers.filter((p) => !activeVoting.votes[p.userId]);
    if (missingPeers.length === 0) return;

    const timer = setTimeout(() => {
      const peerToVote = missingPeers[0];
      if (!peerToVote) return;

      let simulatedVal = 'P1';
      if (activeVoting.type === 'story_points') {
        const sampleOpts = ['3', '5', '5', '8'];
        simulatedVal = sampleOpts[Math.floor(Math.random() * sampleOpts.length)];
      } else if (activeVoting.type === 'proposed_priority') {
        const sampleOpts = ['P0', 'P1', 'P1', 'P2'];
        simulatedVal = sampleOpts[Math.floor(Math.random() * sampleOpts.length)];
      } else if (activeVoting.type === 'disposition') {
        simulatedVal = 'Selected';
      }

      setActiveVoting((prev) => {
        if (!prev || prev.status !== 'open') return prev;
        const updated: VotingRound = {
          ...prev,
          votes: {
            ...prev.votes,
            [peerToVote.userId]: {
              userId: peerToVote.userId,
              userName: peerToVote.userName,
              vote: simulatedVal,
              timestamp: new Date().toISOString(),
            },
          },
        };
        presenceService.broadcastVotingState(updated);
        return updated;
      });
    }, 1800);

    return () => clearTimeout(timer);
  }, [activeVoting, peers]);

  // Add comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedCard) return;
    const newComm = await persistenceService.addComment({
      sessionId: session.id,
      cardId: selectedCard.id,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      content: newCommentText.trim(),
    });
    setComments((prev) => [...prev, newComm]);
    setNewCommentText('');
  };

  // Add follow-up action
  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionText.trim() || !selectedCard) return;
    const newAct: FollowUpAction = {
      id: `act-${Date.now()}`,
      sessionId: session.id,
      cardId: selectedCard.id,
      action: newActionText.trim(),
      owner: newActionOwner.trim() || selectedCard.internalOwner || currentUser.name,
      dueDate: newActionDue,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    await persistenceService.saveAction(newAct);
    setActions((prev) => [...prev, newAct]);
    setNewActionText('');
  };

  // Filtered center cards
  const filteredCards = cards.filter((c) => {
    if (c.workstreamId !== selectedWorkstreamId) return false;
    const a = assessments[c.id];
    if (filterDisposition !== 'all') {
      if ((a?.decision || 'Not Discussed') !== filterDisposition) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.internalOwner.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Current workstream object
  const currentWorkstream = project.workstreams.find((w) => w.id === selectedWorkstreamId);

  // Viewers currently on active card
  const activeCardViewers = peers.filter((p) => p.activeCardId === selectedCardId);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-[#faf9f5] dark:bg-[#18191c] text-stone-900 dark:text-stone-100">
      {/* Top Workshop Header Shell */}
      <div className="bg-[#18191c] text-white border-b border-stone-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md">
        {/* Left: Navigation Breadcrumbs, Session Title & Badges */}
        <div className="flex items-center gap-3">
          {/* Quick Breadcrumbs */}
          <div className="flex items-center gap-1 text-xs text-stone-400 border-r border-stone-800 pr-3 mr-1">
            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="hover:text-white flex items-center gap-1 transition-colors px-1.5 py-1 rounded hover:bg-stone-800"
                title="Return to Workspace Home"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Dashboard</span>
              </button>
            )}
            {onNavigateOverview && (
              <>
                <span className="text-stone-600">/</span>
                <button
                  type="button"
                  onClick={onNavigateOverview}
                  className="hover:text-white flex items-center gap-1 transition-colors px-1.5 py-1 rounded hover:bg-stone-800"
                  title="Return to Project Overview"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Overview</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-white truncate max-w-[200px] sm:max-w-[320px]">
              {session.name}
            </h2>
          </div>

          <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
            {session.date}
          </span>
          <span className="hidden md:inline-block text-[11px] font-semibold px-2 py-0.5 rounded bg-[#d4af37]/15 text-[#fcd34d] border border-[#d4af37]/30">
            {session.deliveryHorizon}
          </span>

          {/* Follow Facilitator Toggle */}
          <button
            onClick={() => {
              const next = !followingFacilitator;
              setFollowingFacilitator(next);
              presenceService.setFollowingFacilitator(next);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              followingFacilitator
                ? 'bg-[#d4af37] text-neutral-950 shadow-xs'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
            title="When active, your view automatically follows the facilitator's selected card"
          >
            <Compass className={`w-3.5 h-3.5 ${followingFacilitator ? 'animate-spin' : ''}`} />
            <span>{followingFacilitator ? 'Following Facilitator' : 'Free Explore'}</span>
          </button>
        </div>

        {/* Right: Facilitator Controls & Attendees */}
        <div className="flex items-center gap-3">
          {/* Active attendee avatars */}
          <div className="flex items-center -space-x-2">
            {peers.map((peer) => (
              <div
                key={peer.userId}
                title={`${peer.userName} (${peer.role}) ${peer.activeCardId ? `• Viewing ${peer.activeCardId}` : ''}`}
                className="w-7 h-7 rounded-full border-2 border-[#18191c] flex items-center justify-center text-[10px] font-bold text-white shadow-sm relative group cursor-pointer"
                style={{ backgroundColor: peer.avatarColor }}
              >
                {peer.userName.charAt(0)}
                <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -bottom-0.5 -right-0.5 border border-[#18191c]" />
              </div>
            ))}
          </div>

          {/* Facilitator Controls (Bring Everyone, Voting, Next) */}
          {isFacilitator && (
            <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 p-1 rounded-lg">
              <button
                onClick={handleBringEveryone}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
                title="Navigate all connected attendees to this card"
              >
                <Users className="w-3.5 h-3.5 text-[#d4af37]" />
                <span className="hidden lg:inline">Bring Everyone Here</span>
              </button>

              <button
                onClick={handleOpenVotingLauncher}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                  activeVoting
                    ? 'bg-[#d4af37] text-neutral-950 shadow-md animate-pulse'
                    : 'bg-stone-800 hover:bg-stone-700 text-[#fcd34d]'
                }`}
                title="Launch a voting round (Priority, Story Points, Disposition)"
              >
                <Vote className="w-3.5 h-3.5" />
                <span>{activeVoting ? 'Voting Active' : 'Start Voting'}</span>
              </button>

              <button
                onClick={handleNextItem}
                className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                title="Go to next item"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Share Session & Workspace Modal */}
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-[#d4af37]/20 hover:bg-[#d4af37]/30 text-[#fcd34d] border border-[#d4af37]/50 transition-colors shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Share Session</span>
          </button>

          {/* Review Results */}
          <button
            onClick={onNavigateToResults}
            className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 transition-colors shadow-xs"
          >
            <span>Results & Export</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {conflictAssessment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#20222a] border border-rose-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Simultaneous Edit Conflict (PRD Section 9)
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Another participant updated this item while you were working.
                </p>
              </div>
            </div>

            <div className="bg-stone-50 dark:bg-[#18191c] p-4 rounded-xl border border-stone-200 dark:border-stone-800 text-xs space-y-2">
              <div className="font-semibold text-stone-700 dark:text-stone-300">
                Latest incoming change by <strong>{conflictAssessment.lastEditedBy}</strong>:
              </div>
              <div className="grid grid-cols-2 gap-2 text-stone-600 dark:text-stone-400">
                <div>Proposed Priority: <strong className="text-stone-900 dark:text-stone-100">{conflictAssessment.proposedPriority}</strong></div>
                <div>Disposition: <strong className="text-stone-900 dark:text-stone-100">{conflictAssessment.decision}</strong></div>
                <div>Rank: <strong className="text-stone-900 dark:text-stone-100">#{conflictAssessment.workstreamRank || 'None'}</strong></div>
                <div>Effort: <strong className="text-stone-900 dark:text-stone-100">{conflictAssessment.effort}</strong></div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAssessments((prev) => ({
                    ...prev,
                    [conflictAssessment.cardId]: conflictAssessment,
                  }));
                  setConflictAssessment(null);
                  setSaveStatus('saved');
                }}
                className="px-4 py-2 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 text-xs font-bold text-stone-800 dark:text-stone-200"
              >
                Accept Incoming Values
              </button>
              <button
                type="button"
                onClick={() => {
                  // Force save local version with higher revision
                  persistenceService.saveAssessment({
                    ...currentAssessment,
                    version: conflictAssessment.version + 1,
                  });
                  setConflictAssessment(null);
                  setSaveStatus('saved');
                }}
                className="px-4 py-2 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold shadow-md"
              >
                Keep My Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-Column Workspace Layout */}
      <div
        ref={centerContainerRef}
        onMouseMove={handleMouseMove}
        className="flex-1 flex flex-col md:flex-row overflow-hidden relative"
      >
        {/* Labeled Live Peer Cursors Rendering (PRD Section 9) */}
        {peers.map((peer) => {
          if (peer.userId === currentUser.id || !peer.cursor) return null;
          return (
            <div
              key={peer.userId}
              className="absolute pointer-events-none z-30 transition-all duration-300 flex items-center gap-1.5"
              style={{
                left: `${peer.cursor.x}px`,
                top: `${peer.cursor.y}px`,
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill={peer.avatarColor}>
                <path d="M4 0l16 12-7 2-4 9z" />
              </svg>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md text-white whitespace-nowrap"
                style={{ backgroundColor: peer.avatarColor }}
              >
                {peer.userName}
              </span>
            </div>
          );
        })}

        {/* LEFT PANEL: AGENDA, WORKSTREAMS, PARKING LOT */}
        <div className="w-full md:w-64 lg:w-72 bg-white dark:bg-[#20222a] border-r border-stone-200 dark:border-[#2e303a] flex flex-col shrink-0 overflow-y-auto">
          {/* Agenda Section */}
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Agenda & Topics
                </span>
                <button
                  type="button"
                  onClick={() => setShowAgendaGuide(!showAgendaGuide)}
                  className="p-0.5 text-stone-400 hover:text-[#d4af37] transition-colors"
                  title="How agenda topics work"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {session.agenda.filter((a) => a.completed).length}/{session.agenda.length}
                </span>
                {isFacilitator && (
                  <button
                    type="button"
                    onClick={() => setIsAddingTopic(!isAddingTopic)}
                    className="p-1 rounded bg-stone-100 dark:bg-[#282a35] hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 text-[10px] font-bold flex items-center gap-0.5 transition-colors"
                    title="Add a custom agenda topic"
                  >
                    <Plus className="w-3 h-3 text-[#d4af37]" />
                    <span>Topic</span>
                  </button>
                )}
              </div>
            </div>

            {/* Agenda Guide Explainer Banner */}
            {showAgendaGuide && (
              <div className="p-2.5 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-[11px] text-stone-700 dark:text-stone-300 space-y-1 animate-in fade-in">
                <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center justify-between">
                  <span>How Agenda & Topics Work:</span>
                  <button
                    onClick={() => setShowAgendaGuide(false)}
                    className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[10px] leading-relaxed text-stone-600 dark:text-stone-400">
                  Agenda topics are the time-boxed phases of your planning session (e.g., Scope Review, Priority Delphi, Capacity Buffer).
                  As you progress, the Workstreams below hold the concrete deliverable cards being evaluated.
                </p>
              </div>
            )}

            {/* Add New Topic Inline Form */}
            {isAddingTopic && (
              <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-[#18191c] border border-stone-300 dark:border-stone-700 space-y-2 animate-in fade-in">
                <input
                  type="text"
                  placeholder="Topic title (e.g. Architecture Alignment)..."
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddAgendaTopic();
                    if (e.key === 'Escape') setIsAddingTopic(false);
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[11px] text-stone-500">
                    <span>Mins:</span>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      step={5}
                      value={newTopicMinutes}
                      onChange={(e) => setNewTopicMinutes(Number(e.target.value))}
                      className="w-14 px-1.5 py-0.5 rounded bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 text-xs text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsAddingTopic(false)}
                      className="px-2 py-1 rounded text-[11px] text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddAgendaTopic}
                      disabled={!newTopicTitle.trim()}
                      className="px-2.5 py-1 rounded bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold text-[11px] disabled:opacity-50"
                    >
                      Save Topic
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {session.agenda.map((item) => (
                <div
                  key={item.id}
                  className={`group flex items-start gap-2 p-2 rounded-lg text-xs transition-colors ${
                    item.completed ? 'bg-stone-50 dark:bg-[#18191c] opacity-60' : 'bg-stone-100 dark:bg-[#282a35]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => {
                      const updatedAgenda = session.agenda.map((a) =>
                        a.id === item.id ? { ...a, completed: !a.completed } : a
                      );
                      const updatedSess = { ...session, agenda: updatedAgenda };
                      persistenceService.saveSession(updatedSess);
                      onSessionUpdated(updatedSess);
                    }}
                    className="mt-0.5 rounded text-[#d4af37] accent-[#d4af37]"
                  />
                  <div className="flex-1 leading-snug">
                    <span className={`font-medium ${item.completed ? 'line-through text-stone-400' : 'text-stone-800 dark:text-stone-200'}`}>
                      {item.title}
                    </span>
                    {item.allocatedMinutes && (
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        {item.allocatedMinutes} mins
                      </span>
                    )}
                  </div>
                  {isFacilitator && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAgendaTopic(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-stone-400 hover:text-rose-500 transition-opacity"
                      title="Delete topic"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Workstreams List with Discussed Counts */}
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Workstreams ({project.workstreams.length})
            </span>

            <div className="space-y-1.5">
              {project.workstreams.map((ws) => {
                const wsCards = cards.filter((c) => c.workstreamId === ws.id);
                const discussedCards = wsCards.filter(
                  (c) => assessments[c.id] && assessments[c.id].decision !== 'Not Discussed'
                );
                const isSelected = ws.id === selectedWorkstreamId;

                return (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setSelectedWorkstreamId(ws.id);
                      const firstCard = wsCards[0];
                      if (firstCard) setSelectedCardId(firstCard.id);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex flex-col gap-1.5 border ${
                      isSelected
                        ? 'bg-amber-500/10 dark:bg-[#282a35] border-[#d4af37] text-stone-900 dark:text-stone-100 font-bold shadow-xs'
                        : 'border-transparent hover:bg-stone-100 dark:hover:bg-stone-800/50 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ws.color || '#d4af37' }}
                        />
                        <span className="truncate">{ws.name}</span>
                      </div>
                      <span className="text-[11px] font-mono shrink-0 ml-1">
                        {discussedCards.length}/{wsCards.length}
                      </span>
                    </div>

                    {/* Progress indicator */}
                    <div className="w-full bg-stone-200 dark:bg-stone-700 h-1 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#d4af37] transition-all"
                        style={{
                          width: wsCards.length ? `${(discussedCards.length / wsCards.length) * 100}%` : '0%',
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parking Lot for Unresolved / Deferred Items */}
          <div className="p-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Parking Lot
            </span>
            <div className="space-y-1.5">
              {cards
                .filter((c) => {
                  const a = assessments[c.id];
                  return a && (a.decision === 'Needs Validation' || a.decision === 'Defer');
                })
                .slice(0, 4)
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedWorkstreamId(c.workstreamId);
                      setSelectedCardId(c.id);
                    }}
                    className="w-full text-left p-2 rounded bg-stone-50 dark:bg-[#18191c] border border-stone-200 dark:border-stone-800 text-[11px] text-stone-700 dark:text-stone-300 hover:border-amber-400 truncate"
                  >
                    <div className="font-semibold truncate">{c.title}</div>
                    <div className="text-[10px] text-amber-600 dark:text-amber-400">
                      {assessments[c.id]?.decision}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* CENTER PANEL: CARDS FOR SELECTED WORKSTREAM */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#fbfaf6] dark:bg-[#1c1e24]">
          {/* Workstream header & search bar */}
          <div className="p-4 bg-white dark:bg-[#20222a] border-b border-stone-200 dark:border-[#2e303a] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: currentWorkstream?.color || '#d4af37' }}
                />
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                  {currentWorkstream?.name}
                </h3>
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Workstream Lead: <strong>{currentWorkstream?.leadName}</strong> &bull; {filteredCards.length} deliverables
              </div>
            </div>

            {/* Filter tabs & Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Filter cards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#18191c] text-xs w-36 sm:w-48 text-stone-900 dark:text-stone-100"
                />
              </div>

              <select
                value={filterDisposition}
                onChange={(e) => setFilterDisposition(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#18191c] text-xs font-semibold text-stone-800 dark:text-stone-200"
              >
                <option value="all">All Dispositions</option>
                <option value="Selected">Selected</option>
                <option value="Reserve">Reserve</option>
                <option value="Defer">Defer</option>
                <option value="Needs Validation">Needs Validation</option>
                <option value="Not Discussed">Not Discussed</option>
              </select>
            </div>
          </div>

          {/* Cards List (High-contrast, readable, keyboard navigatable) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {filteredCards.length === 0 ? (
              <div className="text-center py-16 text-stone-400 text-xs">
                No deliverable cards match the current filter in this workstream.
              </div>
            ) : (
              filteredCards.map((card) => {
                const a = assessments[card.id];
                const isSelected = card.id === selectedCardId;
                const cardViewers = peers.filter((p) => p.activeCardId === card.id);

                return (
                  <div
                    key={card.id}
                    onClick={() => setSelectedCardId(card.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-white dark:bg-[#252834] border-[#d4af37] shadow-md ring-1 ring-[#d4af37]/40'
                        : 'bg-white dark:bg-[#20222a] border-stone-200 dark:border-[#2e303a] hover:border-stone-400'
                    }`}
                  >
                    {/* Viewers presence badge */}
                    {cardViewers.length > 0 && (
                      <div className="absolute top-2 right-3 flex items-center gap-1 text-[10px] text-stone-400">
                        <div className="flex -space-x-1">
                          {cardViewers.map((v) => (
                            <span
                              key={v.userId}
                              className="w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-white dark:border-[#20222a]"
                              style={{ backgroundColor: v.avatarColor }}
                            >
                              {v.userName.charAt(0)}
                            </span>
                          ))}
                        </div>
                        <span className="hidden sm:inline font-medium">viewing</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-stone-600 dark:text-stone-400">
                          {card.id}
                        </span>

                        {/* Stage pill */}
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {card.currentStage}
                        </span>

                        {/* Current vs Proposed Priority */}
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-stone-400 line-through text-[11px] font-mono">
                            {card.currentPriority}
                          </span>
                          <span className="font-bold text-stone-900 dark:text-stone-100 font-mono">
                            &rarr; {a?.proposedPriority || card.currentPriority}
                          </span>
                        </div>

                        {/* Workshop Disposition Badge */}
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          a?.decision === 'Selected'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : a?.decision === 'Reserve'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : a?.decision === 'Defer'
                            ? 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                            : a?.decision === 'Needs Validation'
                            ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
                        }`}>
                          {a?.decision || 'Not Discussed'}
                        </span>

                        {/* Rank Badge */}
                        {a?.workstreamRank && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                            Rank #{a.workstreamRank}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        {card.title}
                      </h4>

                      <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                        {card.description}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-stone-500 border-t border-stone-100 dark:border-stone-800">
                        <div className="flex items-center gap-3">
                          <span>Owner: <strong className="text-stone-700 dark:text-stone-300">{card.internalOwner || 'TBD (Gap)'}</strong></span>
                          <span>Target: <strong className="text-[#b45309] dark:text-[#fcd34d]">{card.targetDateOrQuarter}</strong></span>
                        </div>
                        {a?.milestoneOutcome && (
                          <span className="text-[#047857] dark:text-emerald-400 font-medium truncate max-w-xs">
                            Milestone: {a.milestoneOutcome}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: SELECTED CARD WORKSPACE (DETAILS, WORKING SESSION, COMMENTS, HISTORY) */}
        <div className="w-full md:w-96 lg:w-[460px] bg-white dark:bg-[#20222a] border-l border-stone-200 dark:border-[#2e303a] flex flex-col shrink-0 overflow-y-auto">
          {/* Card Title & Top Tabs */}
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 space-y-3 bg-[#18191c] text-white">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#d4af37]">
                {selectedCard?.id}
              </span>
              <span className="text-[11px] text-stone-400">
                Rev {currentAssessment.version} &bull; {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
              </span>
            </div>

            <h3 className="font-bold text-sm leading-snug text-stone-100">
              {selectedCard?.title}
            </h3>

            {/* Sub-tabs */}
            <div className="flex items-center gap-1 pt-1">
              <button
                onClick={() => setActiveRightTab('working')}
                className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                  activeRightTab === 'working'
                    ? 'bg-[#d4af37] text-neutral-950'
                    : 'bg-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                Working Session
              </button>
              <button
                onClick={() => setActiveRightTab('details')}
                className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                  activeRightTab === 'details'
                    ? 'bg-[#d4af37] text-neutral-950'
                    : 'bg-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveRightTab('comments')}
                className={`flex-1 py-1.5 rounded text-xs font-bold transition-all relative ${
                  activeRightTab === 'comments'
                    ? 'bg-[#d4af37] text-neutral-950'
                    : 'bg-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                Comments ({comments.length})
              </button>
              <button
                onClick={() => setActiveRightTab('history')}
                className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                  activeRightTab === 'history'
                    ? 'bg-[#d4af37] text-neutral-950'
                    : 'bg-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                Audit Log
              </button>
            </div>
          </div>

          {/* TAB 1: WORKING SESSION (PRD Section 7) */}
          {activeRightTab === 'working' && (
            <div className="p-5 space-y-5 text-xs">
              {/* Workshop Disposition & Proposed Priority */}
              <div className="grid grid-cols-2 gap-3 bg-stone-50 dark:bg-[#18191c] p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                <div>
                  <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                    Workshop Disposition *
                  </label>
                  <select
                    value={currentAssessment.decision}
                    onChange={(e) => updateAssessmentField('decision', e.target.value as WorkshopDisposition)}
                    className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] font-bold text-stone-900 dark:text-stone-100"
                  >
                    <option value="Selected">Selected</option>
                    <option value="Reserve">Reserve</option>
                    <option value="Defer">Defer</option>
                    <option value="Drop">Drop</option>
                    <option value="Needs Validation">Needs Validation</option>
                    <option value="Not Discussed">Not Discussed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                    Proposed Priority *
                  </label>
                  <select
                    value={currentAssessment.proposedPriority}
                    onChange={(e) => updateAssessmentField('proposedPriority', e.target.value as Priority)}
                    className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] font-bold text-stone-900 dark:text-stone-100"
                  >
                    <option value="P0">P0 - Highest</option>
                    <option value="P1">P1 - High</option>
                    <option value="P2">P2 - Medium</option>
                    <option value="P3">P3 - Low</option>
                    <option value="Unprioritized">Unprioritized</option>
                  </select>
                </div>
              </div>

              {/* Assessment Quad: Business Value, Impact, Urgency, Effort */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    Business Value
                  </label>
                  <select
                    value={currentAssessment.businessValue}
                    onChange={(e) => updateAssessmentField('businessValue', e.target.value as BusinessValue)}
                    className="w-full px-2 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    {project.impactLabelName}
                  </label>
                  <select
                    value={currentAssessment.memberImpact}
                    onChange={(e) => updateAssessmentField('memberImpact', e.target.value as Impact)}
                    className="w-full px-2 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    Urgency
                  </label>
                  <select
                    value={currentAssessment.urgency}
                    onChange={(e) => updateAssessmentField('urgency', e.target.value as Urgency)}
                    className="w-full px-2 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    Effort
                  </label>
                  <select
                    value={currentAssessment.effort}
                    onChange={(e) => updateAssessmentField('effort', e.target.value as Effort)}
                    className="w-full px-2 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100"
                  >
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>

              {/* Story Points & Workstream Rank */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Story Points (Complexity)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={currentAssessment.storyPoints ?? selectedCard?.storyPoints ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : undefined;
                        updateAssessmentField('storyPoints', val);
                        if (selectedCard) {
                          const updatedCards = cards.map((c) =>
                            c.id === selectedCard.id ? { ...c, storyPoints: val } : c
                          );
                          onCardsUpdated(updatedCards);
                          persistenceService.saveCard({ ...selectedCard, storyPoints: val });
                        }
                      }}
                      placeholder="e.g. 5"
                      className="w-full px-3 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 font-bold font-mono"
                    />
                    <span className="text-[11px] font-mono text-stone-400">pts</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Workstream Rank
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={currentAssessment.workstreamRank || ''}
                    onChange={(e) => handleRankChange(e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g. 1"
                    className="w-full px-3 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 font-bold"
                  />
                </div>
              </div>

              {/* Milestone / Outcome */}
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Milestone / Outcome (Intended result & timing)
                </label>
                <input
                  type="text"
                  value={currentAssessment.milestoneOutcome}
                  onChange={(e) => updateAssessmentField('milestoneOutcome', e.target.value)}
                  placeholder="e.g., Clearance by March 2027 to unblock contract..."
                  className="w-full px-3 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-xs"
                />
              </div>

              {/* Team Rationale / Shared Discussion Notes */}
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Team Rationale & Discussion Notes
                </label>
                <textarea
                  rows={3}
                  value={currentAssessment.teamRationale}
                  onChange={(e) => updateAssessmentField('teamRationale', e.target.value)}
                  placeholder="Record shared reasoning and consensus..."
                  className="w-full px-3 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-xs"
                />
              </div>

              {/* Validation Needs / Unresolved Questions */}
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Validation Needs & Unresolved Questions
                </label>
                <textarea
                  rows={2}
                  value={currentAssessment.validationNeeds}
                  onChange={(e) => updateAssessmentField('validationNeeds', e.target.value)}
                  placeholder="Missing information, legal checks, or ownership gaps..."
                  className="w-full px-3 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-xs"
                />
              </div>

              {/* Follow-up Action Items */}
              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Follow-Up Action Items ({actions.filter((a) => a.cardId === selectedCard?.id).length})
                </span>

                <div className="space-y-2">
                  {actions
                    .filter((a) => a.cardId === selectedCard?.id)
                    .map((act) => (
                      <div
                        key={act.id}
                        className="p-2.5 rounded bg-stone-50 dark:bg-[#18191c] border border-stone-200 dark:border-stone-800 space-y-1 text-xs"
                      >
                        <div className="font-medium text-stone-900 dark:text-stone-100">
                          {act.action}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-stone-500">
                          <span>Owner: <strong>{act.owner}</strong></span>
                          <span>Due: <strong>{act.dueDate}</strong></span>
                          <span className="text-emerald-600 font-semibold uppercase">{act.status}</span>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Add action form */}
                <form onSubmit={handleAddAction} className="space-y-2 pt-1">
                  <input
                    type="text"
                    placeholder="New action item description..."
                    value={newActionText}
                    onChange={(e) => setNewActionText(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-xs text-stone-900 dark:text-stone-100"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Owner name"
                      value={newActionOwner}
                      onChange={(e) => setNewActionOwner(e.target.value)}
                      className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-xs"
                    />
                    <input
                      type="date"
                      value={newActionDue}
                      onChange={(e) => setNewActionDue(e.target.value)}
                      className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 rounded bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 font-semibold text-xs text-stone-800 dark:text-stone-200"
                  >
                    Add Action Item
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILS */}
          {activeRightTab === 'details' && selectedCard && (
            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-stone-500 block">Deliverable Title</span>
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {selectedCard.title}
                </span>
              </div>

              <div>
                <span className="font-semibold text-stone-500 block">Initiatives / Scope</span>
                <p className="text-stone-700 dark:text-stone-300 leading-relaxed mt-0.5">
                  {selectedCard.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-stone-50 dark:bg-[#18191c] p-3 rounded-lg">
                <div>
                  <span className="font-semibold text-stone-500 block">Internal Owner</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {selectedCard.internalOwner || 'TBD (Gap)'}
                  </span>
                  <span className="text-[10px] text-stone-400 block">Display Verified</span>
                </div>
                <div>
                  <span className="font-semibold text-stone-500 block">Partner Owner</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {selectedCard.deliveryPartnerOwner || 'None'}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-stone-500 block">Dependencies & Blockers</span>
                <p className="text-stone-700 dark:text-stone-300 mt-0.5">
                  {selectedCard.dependencies || 'None documented'}
                </p>
              </div>

              <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
                <span className="font-semibold text-stone-500 block">Source Metadata (PRD Preserved)</span>
                <div className="text-[11px] font-mono text-stone-600 dark:text-stone-400 mt-1 space-y-0.5">
                  <div>Sheet: {selectedCard.sourceMeta.sheetName || 'N/A'}</div>
                  <div>Row Reference: {selectedCard.sourceMeta.rowNumber || 'N/A'}</div>
                  <div>Raw Spreadsheet Status: {selectedCard.sourceMeta.rawStatus || 'N/A'}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMMENTS */}
          {activeRightTab === 'comments' && (
            <div className="flex-1 flex flex-col p-4 space-y-4">
              <div className="flex-1 overflow-y-auto space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center py-10 text-stone-400 text-xs">
                    No comments recorded for this card yet.
                  </div>
                ) : (
                  comments.map((comm) => (
                    <div
                      key={comm.id}
                      className="p-3 rounded-xl bg-stone-50 dark:bg-[#18191c] border border-stone-200 dark:border-stone-800 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-stone-900 dark:text-stone-100">{comm.authorName}</strong>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                            {comm.authorRole}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-400">
                          {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                        {comm.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="pt-2 border-t border-stone-200 dark:border-stone-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Add discussion comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-[#18191c] text-xs text-stone-900 dark:text-stone-100"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold text-xs shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: AUDIT LOG */}
          {activeRightTab === 'history' && (
            <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto text-xs">
              {activityLogs.length === 0 ? (
                <div className="text-center py-10 text-stone-400">No activity recorded yet.</div>
              ) : (
                activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded bg-stone-50 dark:bg-[#18191c] border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>{log.userName}</span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">{log.action}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Share Session & Workspace Modal */}
      {showInviteModal && (
        <ShareSessionModal
          project={project}
          session={session}
          sessions={[session]}
          currentUser={currentUser}
          deliverablesCount={cards.length}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Start Voting Launcher Modal (Facilitator defines scope) */}
      {selectedCard && (
        <StartVotingLauncherModal
          card={selectedCard}
          isOpen={showVotingLauncher}
          onClose={() => setShowVotingLauncher(false)}
          onStartVoting={handleLaunchVotingRound}
        />
      )}

      {/* Live Floating Voting Window (Consolidated votes, participants, reveal & average) */}
      {activeVoting && (
        <LiveVotingModal
          activeVoting={activeVoting}
          currentUser={currentUser}
          peers={peers}
          isFacilitator={isFacilitator}
          onCastVote={handleCastVote}
          onRevealVotes={handleRevealVotes}
          onConfirmDecision={handleConfirmDecision}
          onCancelVoting={handleCancelVoting}
        />
      )}
    </div>
  );
};
