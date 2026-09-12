import React, { useState, useEffect } from 'react';
import {
  Project,
  Card,
  DeliveryStage,
  Priority,
  WorkshopDisposition,
  BusinessValue,
  Effort,
  Impact,
  Urgency,
  SessionAssessment,
  FollowUpAction,
  CardComment,
  User,
} from '../../types';
import {
  Kanban,
  Filter,
  Search,
  ArrowLeft,
  ArrowRight,
  Plus,
  Edit2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Tag,
  Check,
  X,
  MessageSquare,
  Send,
  Grid,
  TrendingUp,
  Flame,
  LayoutGrid,
} from 'lucide-react';
import { persistenceService } from '../../services/PersistenceService';

interface ProjectBoardProps {
  project: Project;
  cards: Card[];
  currentUser?: User;
  onBackToOverview: () => void;
  onNavigateHome?: () => void;
  onUpdateCard: (updated: Card) => void;
}

const STAGES: DeliveryStage[] = [
  'Requirements',
  'Architecture & Design',
  'Development & Integration',
  'Testing & Validation',
  'Delivered',
];

const PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3', 'Unprioritized'];
const DISPOSITIONS: WorkshopDisposition[] = [
  'Selected',
  'Reserve',
  'Defer',
  'Drop',
  'Needs Validation',
  'Not Discussed',
];

export const ProjectBoard: React.FC<ProjectBoardProps> = ({
  project,
  cards,
  currentUser,
  onBackToOverview,
  onNavigateHome,
  onUpdateCard,
}) => {
  const [boardMode, setBoardMode] = useState<
    'priority' | 'disposition' | 'matrix' | 'stage' | 'workstream'
  >('priority');
  const [selectedWsId, setSelectedWsId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardForDrawer, setSelectedCardForDrawer] = useState<Card | null>(null);
  const [assessmentsMap, setAssessmentsMap] = useState<Record<string, SessionAssessment>>({});
  const [activeDrawerTab, setActiveDrawerTab] = useState<'assessment' | 'actions' | 'comments'>('assessment');

  // Drawer state for comments & actions
  const [cardComments, setCardComments] = useState<CardComment[]>([]);
  const [cardActions, setCardActions] = useState<FollowUpAction[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [newActionText, setNewActionText] = useState('');
  const [newActionOwner, setNewActionOwner] = useState('');
  const [newActionDue, setNewActionDue] = useState('2026-09-30');

  // Load latest assessments for cards in this project
  useEffect(() => {
    loadAssessments();
  }, [project.id, cards]);

  const loadAssessments = async () => {
    const sessions = await persistenceService.getSessions(project.id);
    const map: Record<string, SessionAssessment> = {};
    for (const s of sessions) {
      const sessAssess = await persistenceService.getAssessments(s.id);
      Object.values(sessAssess).forEach((a) => {
        map[a.cardId] = a;
      });
    }
    setAssessmentsMap(map);
  };

  // When a card is selected in drawer, load comments and actions
  useEffect(() => {
    if (selectedCardForDrawer) {
      loadCardDrawerData(selectedCardForDrawer.id);
    }
  }, [selectedCardForDrawer]);

  const loadCardDrawerData = async (cardId: string) => {
    const sessions = await persistenceService.getSessions(project.id);
    const primarySess = sessions[0];
    if (primarySess) {
      const comms = await persistenceService.getComments(primarySess.id, cardId);
      const acts = await persistenceService.getActions(primarySess.id);
      setCardComments(comms);
      setCardActions(acts.filter((a) => a.cardId === cardId));
    }
  };

  // Filter cards
  const filteredCards = cards.filter((c) => {
    if (selectedWsId !== 'all' && c.workstreamId !== selectedWsId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.internalOwner.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Move card priority
  const handleUpdatePriority = (card: Card, newPrio: Priority) => {
    const updated: Card = {
      ...card,
      currentPriority: newPrio,
      updatedAt: new Date().toISOString(),
    };
    onUpdateCard(updated);
  };

  // Move card stage
  const handleMoveStage = (card: Card, direction: 'prev' | 'next') => {
    const currentIndex = STAGES.indexOf(card.currentStage);
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < STAGES.length) {
      onUpdateCard({
        ...card,
        currentStage: STAGES[newIndex],
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Save updated assessment from drawer
  const handleUpdateAssessmentField = async <K extends keyof SessionAssessment>(
    cardId: string,
    field: K,
    value: SessionAssessment[K]
  ) => {
    const sessions = await persistenceService.getSessions(project.id);
    const primarySess = sessions[0];
    if (!primarySess) return;

    const current = assessmentsMap[cardId] || {
      sessionId: primarySess.id,
      cardId,
      proposedPriority: selectedCardForDrawer?.currentPriority || 'Unprioritized',
      businessValue: 'Unknown',
      memberImpact: 'Unknown',
      urgency: 'Unknown',
      effort: 'Unknown',
      workstreamRank: null,
      decision: 'Not Discussed',
      milestoneOutcome: selectedCardForDrawer?.targetDateOrQuarter || '',
      teamRationale: '',
      validationNeeds: '',
      lastEditedBy: currentUser?.name || 'Collaborator',
      lastEditedAt: new Date().toISOString(),
      version: 1,
    };

    const updated: SessionAssessment = {
      ...current,
      [field]: value,
      lastEditedBy: currentUser?.name || 'Collaborator',
      lastEditedAt: new Date().toISOString(),
    };

    await persistenceService.saveAssessment(updated);
    setAssessmentsMap((prev) => ({
      ...prev,
      [cardId]: updated,
    }));
  };

  // Add Comment from drawer
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedCardForDrawer) return;
    const sessions = await persistenceService.getSessions(project.id);
    const sessId = sessions[0]?.id || `sess-${Date.now()}`;

    const newComm = await persistenceService.addComment({
      sessionId: sessId,
      cardId: selectedCardForDrawer.id,
      authorId: currentUser?.id || 'user-1',
      authorName: currentUser?.name || 'Facilitator',
      authorRole: currentUser?.role || 'editor',
      content: newCommentText.trim(),
    });

    setCardComments((prev) => [...prev, newComm]);
    setNewCommentText('');
  };

  // Add Action from drawer
  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionText.trim() || !selectedCardForDrawer) return;
    const sessions = await persistenceService.getSessions(project.id);
    const sessId = sessions[0]?.id || `sess-${Date.now()}`;

    const newAct: FollowUpAction = {
      id: `act-${Date.now()}`,
      sessionId: sessId,
      cardId: selectedCardForDrawer.id,
      action: newActionText.trim(),
      owner: newActionOwner.trim() || selectedCardForDrawer.internalOwner || 'Unassigned',
      dueDate: newActionDue,
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    await persistenceService.saveAction(newAct);
    setCardActions((prev) => [...prev, newAct]);
    setNewActionText('');
  };

  // Render Card Component
  const renderCardItem = (card: Card) => {
    const ws = project.workstreams.find((w) => w.id === card.workstreamId);
    const a = assessmentsMap[card.id];
    const isTbdOwner = !card.internalOwner || card.internalOwner.trim().toUpperCase() === 'TBD';

    return (
      <div
        key={card.id}
        onClick={() => setSelectedCardForDrawer(card)}
        className="bg-white dark:bg-[#20222a] hover:bg-stone-50 dark:hover:bg-[#252834] border border-stone-200 dark:border-[#2e303a] hover:border-[#d4af37] rounded-xl p-3.5 shadow-2xs space-y-2.5 transition-all cursor-pointer group relative"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: ws?.color || '#d4af37' }}
            />
            <span className="text-[11px] font-mono font-bold text-stone-500 dark:text-stone-400 group-hover:text-[#d4af37] transition-colors">
              {card.id}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {card.storyPoints !== undefined && card.storyPoints > 0 && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                {card.storyPoints} pts
              </span>
            )}
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-stone-100 dark:bg-[#18191c] text-stone-700 dark:text-stone-300">
              {card.currentPriority}
            </span>
          </div>
        </div>

        <h4 className="font-bold text-xs text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
          {card.title}
        </h4>

        {card.description && (
          <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
            {card.description}
          </p>
        )}

        {/* Badges strip: Stage, Proposed, Disposition */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
          <span className="px-1.5 py-0.2 rounded font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            {card.currentStage}
          </span>

          {a?.proposedPriority && a.proposedPriority !== card.currentPriority && (
            <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-[#d4af37]/20 text-[#fcd34d] border border-[#d4af37]/40">
              &rarr; {a.proposedPriority}
            </span>
          )}

          {a?.decision && a.decision !== 'Not Discussed' && (
            <span
              className={`px-1.5 py-0.2 rounded-full font-bold ${
                a.decision === 'Selected'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : a.decision === 'Reserve'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : a.decision === 'Needs Validation'
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
              }`}
            >
              {a.decision}
            </span>
          )}
        </div>

        {/* Bottom meta row */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
          <div>
            {isTbdOwner ? (
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> TBD (Gap)
              </span>
            ) : (
              <span className="truncate max-w-[120px] font-medium text-stone-700 dark:text-stone-300">
                {card.internalOwner}
              </span>
            )}
          </div>
          <span className="text-[10px] text-stone-400 font-mono">
            {card.targetDateOrQuarter}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Board Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToOverview}
            className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-[#20222a] dark:hover:bg-[#282a35] text-stone-700 dark:text-stone-300 transition-colors"
            title="Back to Project Overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-xs uppercase font-bold tracking-widest text-[#d4af37]">
              {project.name} &bull; Working Board
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Interactive Prioritization & Backlog Board
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Live collaboration workspace. Click any deliverable to record assessments, story points, discussion notes, and action items.
            </p>
          </div>
        </div>

        {/* Filters & View Mode Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Workstream selector */}
          <select
            value={selectedWsId}
            onChange={(e) => setSelectedWsId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] text-xs font-semibold text-stone-800 dark:text-stone-200"
          >
            <option value="all">All Workstreams</option>
            {project.workstreams.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] text-xs w-36 sm:w-44 text-stone-900 dark:text-stone-100"
            />
          </div>
        </div>
      </div>

      {/* Board Mode Switcher Bar */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 text-xs">
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-[#20222a] p-1 rounded-xl border border-stone-200 dark:border-stone-800">
          <button
            onClick={() => setBoardMode('priority')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              boardMode === 'priority'
                ? 'bg-white dark:bg-[#2a2c38] text-stone-900 dark:text-white shadow-xs border border-stone-200 dark:border-stone-700'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Priority (P0–P3)</span>
          </button>

          <button
            onClick={() => setBoardMode('disposition')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              boardMode === 'disposition'
                ? 'bg-white dark:bg-[#2a2c38] text-stone-900 dark:text-white shadow-xs border border-stone-200 dark:border-stone-700'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-emerald-500" />
            <span>Workshop Disposition</span>
          </button>

          <button
            onClick={() => setBoardMode('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              boardMode === 'matrix'
                ? 'bg-white dark:bg-[#2a2c38] text-stone-900 dark:text-white shadow-xs border border-stone-200 dark:border-stone-700'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-amber-500" />
            <span>Value vs Effort 2x2 Matrix</span>
          </button>

          <button
            onClick={() => setBoardMode('workstream')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              boardMode === 'workstream'
                ? 'bg-white dark:bg-[#2a2c38] text-stone-900 dark:text-white shadow-xs border border-stone-200 dark:border-stone-700'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Workstream Tracks</span>
          </button>

          <button
            onClick={() => setBoardMode('stage')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              boardMode === 'stage'
                ? 'bg-white dark:bg-[#2a2c38] text-stone-900 dark:text-white shadow-xs border border-stone-200 dark:border-stone-700'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Kanban className="w-3.5 h-3.5 text-purple-500" />
            <span>Delivery Stage Kanban</span>
          </button>
        </div>

        <span className="text-[11px] text-stone-400 hidden lg:inline">
          Showing {filteredCards.length} of {cards.length} deliverables
        </span>
      </div>

      {/* MODE 1: PRIORITY BOARD */}
      {boardMode === 'priority' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['P0', 'P1', 'P2', 'P3'] as Priority[]).map((p) => {
            const colCards = filteredCards.filter((c) => c.currentPriority === p);
            const borderColors = {
              P0: 'border-t-rose-500',
              P1: 'border-t-amber-500',
              P2: 'border-t-blue-500',
              P3: 'border-t-stone-500',
              Unprioritized: 'border-t-stone-600',
            };

            return (
              <div
                key={p}
                className={`bg-stone-50/60 dark:bg-[#18191c] border border-stone-200 dark:border-[#2e303a] border-t-4 ${borderColors[p]} rounded-2xl p-4 flex flex-col min-h-[480px] space-y-3`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                      Priority {p}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300">
                    {colCards.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                  {colCards.map(renderCardItem)}
                  {colCards.length === 0 && (
                    <div className="h-40 flex items-center justify-center text-xs text-stone-400 italic">
                      No deliverables in {p}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODE 2: DISPOSITION BOARD */}
      {boardMode === 'disposition' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['Selected', 'Reserve', 'Needs Validation', 'Not Discussed'] as const).map((disp) => {
            const colCards = filteredCards.filter((c) => {
              const a = assessmentsMap[c.id];
              const d = a?.decision || 'Not Discussed';
              return d === disp;
            });

            const topBorders = {
              Selected: 'border-t-emerald-500',
              Reserve: 'border-t-[#d4af37]',
              'Needs Validation': 'border-t-orange-500',
              'Not Discussed': 'border-t-stone-500',
            };

            return (
              <div
                key={disp}
                className={`bg-stone-50/60 dark:bg-[#18191c] border border-stone-200 dark:border-[#2e303a] border-t-4 ${topBorders[disp]} rounded-2xl p-4 flex flex-col min-h-[480px] space-y-3`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
                  <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider truncate">
                    {disp}
                  </h3>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300">
                    {colCards.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                  {colCards.map(renderCardItem)}
                  {colCards.length === 0 && (
                    <div className="h-40 flex items-center justify-center text-xs text-stone-400 italic">
                      No cards in {disp}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODE 3: VALUE VS EFFORT 2x2 MATRIX QUAD */}
      {boardMode === 'matrix' && (
        <div className="space-y-4">
          <div className="p-3 bg-stone-100 dark:bg-[#18191c] rounded-xl border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300 flex items-center justify-between">
            <span>
              <strong>Strategic Prioritization Matrix</strong>: Evaluates Business Value against Delivery Effort sizing.
            </span>
            <span className="text-[11px] text-[#d4af37] font-semibold">
              Quad Focus: Quick Wins & Strategic Bets
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quad 1: Quick Wins (High Value, Small/Medium Effort) */}
            <div className="bg-emerald-500/5 dark:bg-[#1a231f] border-2 border-emerald-500/40 rounded-2xl p-4 space-y-3 min-h-[300px]">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                <div>
                  <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> 1. Quick Wins (High Value &bull; Small Effort)
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Do first: immediate ROI with minimal friction</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold font-mono text-xs">
                  {
                    filteredCards.filter((c) => {
                      const a = assessmentsMap[c.id];
                      return a && a.businessValue === 'High' && (a.effort === 'Small' || a.effort === 'Medium');
                    }).length
                  }
                </span>
              </div>
              <div className="space-y-2.5">
                {filteredCards
                  .filter((c) => {
                    const a = assessmentsMap[c.id];
                    return a && a.businessValue === 'High' && (a.effort === 'Small' || a.effort === 'Medium');
                  })
                  .map(renderCardItem)}
              </div>
            </div>

            {/* Quad 2: Strategic Bets (High Value, Large Effort) */}
            <div className="bg-amber-500/5 dark:bg-[#25221b] border-2 border-amber-500/40 rounded-2xl p-4 space-y-3 min-h-[300px]">
              <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                <div>
                  <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> 2. Strategic Bets (High Value &bull; Large Effort)
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Plan carefully: core transformational deliverables</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold font-mono text-xs">
                  {
                    filteredCards.filter((c) => {
                      const a = assessmentsMap[c.id];
                      return a && a.businessValue === 'High' && a.effort === 'Large';
                    }).length
                  }
                </span>
              </div>
              <div className="space-y-2.5">
                {filteredCards
                  .filter((c) => {
                    const a = assessmentsMap[c.id];
                    return a && a.businessValue === 'High' && a.effort === 'Large';
                  })
                  .map(renderCardItem)}
              </div>
            </div>

            {/* Quad 3: Fill-ins / Incremental (Medium/Low Value, Small Effort) */}
            <div className="bg-blue-500/5 dark:bg-[#1b2028] border-2 border-blue-500/40 rounded-2xl p-4 space-y-3 min-h-[300px]">
              <div className="flex items-center justify-between pb-2 border-b border-blue-500/20">
                <div>
                  <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400">
                    3. Fill-ins / Incremental (Low/Med Value &bull; Small Effort)
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Fill buffer time or delegate</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold font-mono text-xs">
                  {
                    filteredCards.filter((c) => {
                      const a = assessmentsMap[c.id];
                      return a && a.businessValue !== 'High' && a.effort === 'Small';
                    }).length
                  }
                </span>
              </div>
              <div className="space-y-2.5">
                {filteredCards
                  .filter((c) => {
                    const a = assessmentsMap[c.id];
                    return a && a.businessValue !== 'High' && a.effort === 'Small';
                  })
                  .map(renderCardItem)}
              </div>
            </div>

            {/* Quad 4: Thankless Tasks (Low Value, Large Effort) */}
            <div className="bg-stone-500/5 dark:bg-[#202022] border-2 border-stone-500/40 rounded-2xl p-4 space-y-3 min-h-[300px]">
              <div className="flex items-center justify-between pb-2 border-b border-stone-500/20">
                <div>
                  <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
                    4. Reconsider / Drop (Low Value &bull; Large Effort)
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Candidates to defer or de-scope</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-stone-500/20 text-stone-700 dark:text-stone-300 font-bold font-mono text-xs">
                  {
                    filteredCards.filter((c) => {
                      const a = assessmentsMap[c.id];
                      return a && a.businessValue === 'Low' && a.effort === 'Large';
                    }).length
                  }
                </span>
              </div>
              <div className="space-y-2.5">
                {filteredCards
                  .filter((c) => {
                    const a = assessmentsMap[c.id];
                    return a && a.businessValue === 'Low' && a.effort === 'Large';
                  })
                  .map(renderCardItem)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 4: WORKSTREAM TRACKS */}
      {boardMode === 'workstream' && (
        <div className="space-y-6">
          {project.workstreams.map((ws) => {
            const wsCards = filteredCards.filter((c) => c.workstreamId === ws.id);

            return (
              <div
                key={ws.id}
                className="bg-stone-50/60 dark:bg-[#18191c] border border-stone-200 dark:border-[#2e303a] rounded-2xl p-5 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: ws.color || '#d4af37' }}
                    />
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {ws.name}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Track Lead: <strong>{ws.leadName}</strong>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300">
                    {wsCards.length} deliverables
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {wsCards.map(renderCardItem)}
                  {wsCards.length === 0 && (
                    <div className="col-span-full py-6 text-center text-xs text-stone-400">
                      No cards found in this workstream matching the search query.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODE 5: DELIVERY STAGE KANBAN */}
      {boardMode === 'stage' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage, sIdx) => {
            const stageCards = filteredCards.filter((c) => c.currentStage === stage);

            return (
              <div
                key={stage}
                className="bg-stone-50/60 dark:bg-[#18191c] border border-stone-200 dark:border-[#2e303a] rounded-2xl p-3.5 flex flex-col min-w-[240px] min-h-[480px] space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
                  <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                    {stage}
                  </h3>
                  <span className="text-xs font-mono font-bold px-2 py-0.2 rounded-full bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300">
                    {stageCards.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                  {stageCards.map(renderCardItem)}
                  {stageCards.length === 0 && (
                    <div className="h-40 flex items-center justify-center text-xs text-stone-400 italic">
                      No cards in {stage}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SLIDE-OVER WORKING SESSION DRAWER */}
      {selectedCardForDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white dark:bg-[#1e2028] border-l border-stone-200 dark:border-[#2e303a] h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 bg-[#18191c] text-white border-b border-stone-800 flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#d4af37]">
                    {selectedCardForDrawer.id}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold uppercase">
                    {selectedCardForDrawer.currentStage}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white leading-snug">
                  {selectedCardForDrawer.title}
                </h3>
              </div>

              <button
                onClick={() => setSelectedCardForDrawer(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs Header */}
            <div className="flex items-center border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#22242e] px-5 py-2 gap-2 text-xs shrink-0">
              <button
                onClick={() => setActiveDrawerTab('assessment')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeDrawerTab === 'assessment'
                    ? 'bg-[#d4af37] text-neutral-950 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Working Session & Prioritization
              </button>
              <button
                onClick={() => setActiveDrawerTab('actions')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeDrawerTab === 'actions'
                    ? 'bg-[#d4af37] text-neutral-950 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Action Items ({cardActions.length})
              </button>
              <button
                onClick={() => setActiveDrawerTab('comments')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeDrawerTab === 'comments'
                    ? 'bg-[#d4af37] text-neutral-950 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Discussion ({cardComments.length})
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-stone-800 dark:text-stone-200">
              {/* TAB 1: WORKING SESSION & PRIORITIZATION */}
              {activeDrawerTab === 'assessment' && (
                <div className="space-y-4">
                  {/* Priority & Disposition Grid */}
                  <div className="grid grid-cols-2 gap-3 bg-stone-50 dark:bg-[#18191c] p-3.5 rounded-xl border border-stone-200 dark:border-stone-800">
                    <div>
                      <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                        Workshop Disposition
                      </label>
                      <select
                        value={assessmentsMap[selectedCardForDrawer.id]?.decision || 'Not Discussed'}
                        onChange={(e) =>
                          handleUpdateAssessmentField(
                            selectedCardForDrawer.id,
                            'decision',
                            e.target.value as WorkshopDisposition
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] font-bold"
                      >
                        {DISPOSITIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                        Proposed Priority
                      </label>
                      <select
                        value={
                          assessmentsMap[selectedCardForDrawer.id]?.proposedPriority ||
                          selectedCardForDrawer.currentPriority
                        }
                        onChange={(e) =>
                          handleUpdateAssessmentField(
                            selectedCardForDrawer.id,
                            'proposedPriority',
                            e.target.value as Priority
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] font-bold"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quad Sizing Attributes */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block font-semibold text-stone-600 dark:text-stone-400 mb-1">
                        Business Value
                      </label>
                      <select
                        value={assessmentsMap[selectedCardForDrawer.id]?.businessValue || 'Unknown'}
                        onChange={(e) =>
                          handleUpdateAssessmentField(
                            selectedCardForDrawer.id,
                            'businessValue',
                            e.target.value as BusinessValue
                          )
                        }
                        className="w-full px-2 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c]"
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
                        value={assessmentsMap[selectedCardForDrawer.id]?.memberImpact || 'Unknown'}
                        onChange={(e) =>
                          handleUpdateAssessmentField(
                            selectedCardForDrawer.id,
                            'memberImpact',
                            e.target.value as Impact
                          )
                        }
                        className="w-full px-2 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c]"
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
                        value={assessmentsMap[selectedCardForDrawer.id]?.urgency || 'Unknown'}
                        onChange={(e) =>
                          handleUpdateAssessmentField(
                            selectedCardForDrawer.id,
                            'urgency',
                            e.target.value as Urgency
                          )
                        }
                        className="w-full px-2 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c]"
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
                        value={assessmentsMap[selectedCardForDrawer.id]?.effort || 'Unknown'}
                        onChange={(e) =>
                          handleUpdateAssessmentField(
                            selectedCardForDrawer.id,
                            'effort',
                            e.target.value as Effort
                          )
                        }
                        className="w-full px-2 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c]"
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
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={selectedCardForDrawer.storyPoints ?? ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : undefined;
                          onUpdateCard({ ...selectedCardForDrawer, storyPoints: val });
                        }}
                        placeholder="e.g., 5"
                        className="w-full px-3 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] font-bold font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Workstream Rank
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={assessmentsMap[selectedCardForDrawer.id]?.workstreamRank || ''}
                        onChange={(e) =>
                          handleUpdateAssessmentField(
                            selectedCardForDrawer.id,
                            'workstreamRank',
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 1"
                        className="w-full px-3 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] font-bold"
                      />
                    </div>
                  </div>

                  {/* Milestone Outcome */}
                  <div>
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Milestone / Target Horizon
                    </label>
                    <input
                      type="text"
                      value={
                        assessmentsMap[selectedCardForDrawer.id]?.milestoneOutcome ||
                        selectedCardForDrawer.targetDateOrQuarter
                      }
                      onChange={(e) =>
                        handleUpdateAssessmentField(selectedCardForDrawer.id, 'milestoneOutcome', e.target.value)
                      }
                      placeholder="e.g., Q2 2027 Beta Release"
                      className="w-full px-3 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c]"
                    />
                  </div>

                  {/* Team Rationale / Discussion Notes */}
                  <div>
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Team Rationale & Discussion Notes
                    </label>
                    <textarea
                      rows={3}
                      value={assessmentsMap[selectedCardForDrawer.id]?.teamRationale || ''}
                      onChange={(e) =>
                        handleUpdateAssessmentField(selectedCardForDrawer.id, 'teamRationale', e.target.value)
                      }
                      placeholder="Record consensus reasoning, strategic dependencies, or trade-offs..."
                      className="w-full px-3 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c]"
                    />
                  </div>

                  {/* Validation Needs */}
                  <div>
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Validation Needs & Gaps
                    </label>
                    <textarea
                      rows={2}
                      value={assessmentsMap[selectedCardForDrawer.id]?.validationNeeds || ''}
                      onChange={(e) =>
                        handleUpdateAssessmentField(selectedCardForDrawer.id, 'validationNeeds', e.target.value)
                      }
                      placeholder="Pending architecture review, security checks, or customer confirmation..."
                      className="w-full px-3 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c]"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: ACTION ITEMS */}
              {activeDrawerTab === 'actions' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {cardActions.length === 0 ? (
                      <div className="p-6 text-center text-stone-400">
                        No follow-up action items created for this deliverable yet.
                      </div>
                    ) : (
                      cardActions.map((act) => (
                        <div
                          key={act.id}
                          className="p-3 rounded-xl bg-stone-50 dark:bg-[#18191c] border border-stone-200 dark:border-stone-800 space-y-1"
                        >
                          <div className="font-semibold text-stone-900 dark:text-stone-100">
                            {act.action}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-stone-500">
                            <span>Owner: <strong>{act.owner}</strong></span>
                            <span>Due: <strong>{act.dueDate}</strong></span>
                            <span className="text-emerald-600 font-bold uppercase">{act.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add action form */}
                  <form onSubmit={handleAddAction} className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
                    <input
                      type="text"
                      placeholder="New action item description..."
                      value={newActionText}
                      onChange={(e) => setNewActionText(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Owner name"
                        value={newActionOwner}
                        onChange={(e) => setNewActionOwner(e.target.value)}
                        className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c]"
                      />
                      <input
                        type="date"
                        value={newActionDue}
                        onChange={(e) => setNewActionDue(e.target.value)}
                        className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 rounded bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold shadow-xs"
                    >
                      Add Action Item
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 3: DISCUSSION & COMMENTS */}
              {activeDrawerTab === 'comments' && (
                <div className="space-y-4">
                  <div className="space-y-2.5 max-h-72 overflow-y-auto">
                    {cardComments.length === 0 ? (
                      <div className="p-6 text-center text-stone-400">
                        No comments recorded for this deliverable yet.
                      </div>
                    ) : (
                      cardComments.map((comm) => (
                        <div
                          key={comm.id}
                          className="p-3 rounded-xl bg-stone-50 dark:bg-[#18191c] border border-stone-200 dark:border-stone-800 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-900 dark:text-stone-100">
                              {comm.authorName} <span className="text-stone-400 font-normal">({comm.authorRole})</span>
                            </span>
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

                  {/* Add comment form */}
                  <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                    <input
                      type="text"
                      placeholder="Add discussion note or comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c]"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-stone-50 dark:bg-[#18191c] border-t border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-stone-400">
                All changes automatically saved to local persistence.
              </span>
              <button
                onClick={() => setSelectedCardForDrawer(null)}
                className="px-4 py-1.5 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold text-xs shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
