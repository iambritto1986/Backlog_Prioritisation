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
  Search,
  ArrowLeft,
  ArrowRight,
  Plus,
  Edit2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Tag,
  Check,
  X,
  MessageSquare,
  Send,
  Flame,
  Trash2,
} from 'lucide-react';
import { persistenceService } from '../../services/PersistenceService';

interface ProjectBoardProps {
  project: Project;
  cards: Card[];
  currentUser?: User;
  onBackToOverview: () => void;
  onNavigateHome?: () => void;
  onUpdateCard: (updated: Card) => void;
  onDeleteCard?: (cardId: string) => void;
  onAddCard?: (newCard: Card) => void;
}

const PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3', 'Unprioritized'];
const DISPOSITIONS: WorkshopDisposition[] = [
  'Selected',
  'Reserve',
  'Defer',
  'Drop',
  'Needs Validation',
  'Not Discussed',
  'Parking Lot',
];

function formatRelativeTime(iso?: string): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  if (diffMs < 0) return 'just now';

  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(mo / 12);
  return `${yr}y ago`;
}

function formatAbsoluteDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const ProjectBoard: React.FC<ProjectBoardProps> = ({
  project,
  cards,
  currentUser,
  onBackToOverview,
  onNavigateHome,
  onUpdateCard,
  onDeleteCard,
  onAddCard,
}) => {
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

  // Modals
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);

  // New Card Form
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');
  const [newCardWs, setNewCardWs] = useState('');
  const [newCardPriority, setNewCardPriority] = useState<Priority>('P1');
  const [newCardStage, setNewCardStage] = useState<DeliveryStage>('Requirements');
  const [newCardOwner, setNewCardOwner] = useState('');
  const [newCardEta, setNewCardEta] = useState('Q2 2027');

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
        (c.internalOwner && c.internalOwner.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Create Card submit
  const handleCreateCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim() || !project) return;

    const ws = project.workstreams.find((w) => w.id === newCardWs) || project.workstreams[0];
    const wsPrefix = (ws?.name || 'ITM').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    const newId = `${wsPrefix}-${Math.floor(100 + Math.random() * 900)}`;

    const cardObj: Card = {
      id: newId,
      projectId: project.id,
      workstreamId: ws?.id || 'ws-general',
      workstreamName: ws?.name || 'General',
      title: newCardTitle.trim(),
      description: newCardDesc.trim(),
      currentPriority: newCardPriority,
      currentStage: newCardStage,
      internalOwner: newCardOwner.trim() || 'TBD',
      deliveryPartnerOwner: 'TBD',
      targetDateOrQuarter: newCardEta.trim() || project.targetHorizon,
      dependencies: '',
      customFields: {},
      sourceMeta: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onAddCard) {
      onAddCard(cardObj);
    } else {
      persistenceService.saveCard(cardObj).then(() => {
        onUpdateCard(cardObj);
      });
    }

    setNewCardTitle('');
    setNewCardDesc('');
    setShowAddCardModal(false);
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

          {card.storyPoints !== undefined && card.storyPoints > 0 && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
              {card.storyPoints} pts
            </span>
          )}
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
                  : a.decision === 'Parking Lot'
                  ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30'
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
                <AlertCircle className="w-3 h-3" /> TBD
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

        {formatRelativeTime(card.updatedAt) && (
          <div
            className="flex items-center gap-1 text-[10px] text-stone-400 dark:text-stone-500"
            title={`Updated ${formatAbsoluteDate(card.updatedAt) || ''}`}
          >
            <Clock className="w-2.5 h-2.5" />
            <span>Updated {formatRelativeTime(card.updatedAt)}</span>
          </div>
        )}
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
            <div className="text-xs uppercase font-bold tracking-widest text-[#d4af37] flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              {project.name} &bull; Priority Board
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              What are we actually shipping first?
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Click any deliverable to record assessments, story points, discussion notes, and action items — updates sync live to everyone in the workshop.
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAddCardModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold text-xs shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Deliverable
          </button>

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

      <div className="text-[11px] text-stone-400 -mt-2">
        Showing {filteredCards.length} of {cards.length} deliverables
      </div>

      {/* PRIORITY BOARD — the one working view. Columns for P0–P3 always
          show; an "Unprioritized" column only appears when imported/legacy
          data actually has cards sitting in it, so the common case stays a
          clean 4-column board. (Previously this screen had 5 switchable
          board "modes" — Priority, Disposition, Value/Effort Matrix,
          Workstream Tracks, Delivery Stages — which is what made it feel
          overwhelming. Per the v1 scope doc, we're consolidating down to
          this single view; the other lenses may come back later as
          filters/sort on top of this board rather than separate full
          re-layouts.) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(
          [
            { p: 'P0' as Priority, label: 'Must ship', accent: 'border-t-rose-500', pill: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
            { p: 'P1' as Priority, label: 'High priority', accent: 'border-t-amber-500', pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
            { p: 'P2' as Priority, label: 'Planned', accent: 'border-t-blue-500', pill: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
            { p: 'P3' as Priority, label: 'Nice to have', accent: 'border-t-stone-500', pill: 'bg-stone-500/10 text-stone-500 dark:text-stone-400' },
            ...(filteredCards.some((c) => c.currentPriority === 'Unprioritized')
              ? [{ p: 'Unprioritized' as Priority, label: 'Not yet sized', accent: 'border-t-stone-600', pill: 'bg-stone-500/10 text-stone-500 dark:text-stone-400' }]
              : []),
          ]
        ).map(({ p, label, accent, pill }) => {
          const colCards = filteredCards.filter((c) => c.currentPriority === p);

          return (
            <div
              key={p}
              className={`bg-stone-50/60 dark:bg-[#18191c] border border-stone-200 dark:border-[#2e303a] border-t-4 ${accent} rounded-2xl p-4 flex flex-col min-h-[480px] space-y-3`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
                <div>
                  <div className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono font-bold text-[11px] ${pill}`}>
                    {p}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold mt-0.5">
                    {label}
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 h-fit">
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
                {(formatAbsoluteDate(selectedCardForDrawer.createdAt) ||
                  formatRelativeTime(selectedCardForDrawer.updatedAt)) && (
                  <div className="flex items-center gap-1 text-[10px] text-stone-400 pt-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    <span>
                      {formatAbsoluteDate(selectedCardForDrawer.createdAt) &&
                        `Created ${formatAbsoluteDate(selectedCardForDrawer.createdAt)}`}
                      {formatAbsoluteDate(selectedCardForDrawer.createdAt) &&
                        formatRelativeTime(selectedCardForDrawer.updatedAt) &&
                        ' • '}
                      {formatRelativeTime(selectedCardForDrawer.updatedAt) &&
                        `Updated ${formatRelativeTime(selectedCardForDrawer.updatedAt)}`}
                    </span>
                  </div>
                )}
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
                Working Session & Sizing
              </button>
              <button
                onClick={() => setActiveDrawerTab('actions')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeDrawerTab === 'actions'
                    ? 'bg-[#d4af37] text-neutral-950 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Actions ({cardActions.length})
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

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-stone-800 dark:text-stone-200">
              {/* TAB 1: ASSESSMENT */}
              {activeDrawerTab === 'assessment' && (
                <div className="space-y-4">
                  {/* Disposition & Proposed Priority */}
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

                  {/* 2x2 Matrix Dimensions */}
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
                        Effort Sizing
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

                  {/* Story Points & Rank */}
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

                  {/* Discussion Notes */}
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

              {/* TAB 2: ACTIONS */}
              {activeDrawerTab === 'actions' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {cardActions.length === 0 ? (
                      <div className="p-6 text-center text-stone-400">
                        No follow-up action items recorded for this deliverable yet.
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

              {/* TAB 3: DISCUSSION */}
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
                      placeholder="Add discussion note..."
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
              <button
                type="button"
                onClick={() => {
                  const card = selectedCardForDrawer;
                  setSelectedCardForDrawer(null);
                  setCardToDelete(card);
                }}
                className="text-rose-500 hover:underline text-xs font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Deliverable
              </button>

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

      {/* MODAL: ADD DELIVERABLE */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Add Deliverable Card
            </h3>
            <form onSubmit={handleCreateCardSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Deliverable Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Clinical Telemetry Kafka Stream"
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Workstream
                </label>
                <select
                  value={newCardWs || project.workstreams[0]?.id}
                  onChange={(e) => setNewCardWs(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-xs"
                >
                  {project.workstreams.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Description & Key Initiatives
                </label>
                <textarea
                  rows={2}
                  placeholder="Scope, technical requirements, or dependencies..."
                  value={newCardDesc}
                  onChange={(e) => setNewCardDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Initial Priority
                  </label>
                  <select
                    value={newCardPriority}
                    onChange={(e) => setNewCardPriority(e.target.value as Priority)}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-xs"
                  >
                    <option value="P0">P0 (Critical)</option>
                    <option value="P1">P1 (High)</option>
                    <option value="P2">P2 (Medium)</option>
                    <option value="P3">P3 (Low)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Internal Owner
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Britto Thomas (or TBD)"
                    value={newCardOwner}
                    onChange={(e) => setNewCardOwner(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="px-4 py-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold shadow-md transition-colors"
                >
                  Create Deliverable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CARD CONFIRMATION */}
      {cardToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#20222a] rounded-2xl border border-stone-200 dark:border-stone-700 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Delete Deliverable</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">Card ID: {cardToDelete.id}</p>
              </div>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-stone-900 dark:text-stone-100 font-semibold">"{cardToDelete.title}"</strong>?
            </p>
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setCardToDelete(null)}
                className="px-4 py-2 rounded-lg text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteCard) {
                    onDeleteCard(cardToDelete.id);
                  } else {
                    persistenceService.deleteCard(cardToDelete.id);
                  }
                  setCardToDelete(null);
                }}
                className="px-4 py-2 rounded-lg text-sm bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Delete Deliverable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
