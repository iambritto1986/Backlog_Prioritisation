import React, { useState, useEffect } from 'react';
import {
  Project,
  Card,
  PlanningSession,
  Workstream,
  User,
  SessionAssessment,
  Priority,
  DeliveryStage,
  WorkshopDisposition,
} from '../../types';
import {
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Home,
  Radio,
  Kanban,
  UserCheck,
  AlertCircle,
  AlertTriangle,
  Tag,
  Search,
  Filter,
  Users,
  Sparkles,
  Share2,
  Check,
  ChevronRight,
  ExternalLink,
  Info,
  X,
  Copy,
  Edit2,
  Settings,
} from 'lucide-react';
import { persistenceService } from '../../services/PersistenceService';
import { ShareSessionModal } from '../session/ShareSessionModal';

interface ProjectOverviewProps {
  projectId?: string;
  project?: Project;
  cards?: Card[];
  sessions?: PlanningSession[];
  currentUser: User;
  onNavigateHome?: () => void;
  onDeleteProject?: (projectId: string) => void;
  onEnterSession: (sessionId: string) => void;
  onCreateSessionClick: () => void;
  onDeleteSession?: (sessionId: string) => void;
  onDuplicateSession?: (sessionId: string) => void;
  onOpenImport: () => void;
  onOpenBoard: () => void;
  onAddWorkstream: (name: string, lead: string, color: string) => void;
  onDeleteWorkstream?: (workstreamId: string) => void;
  onUpdateWorkstream?: (workstream: Workstream) => void;
  onAddCard?: (newCard: Card) => void;
  onDeleteCard?: (cardId: string) => void;
  onUpdateCard?: (card: Card) => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  projectId: propProjectId,
  project: initialProject,
  cards: initialCards,
  sessions: initialSessions,
  currentUser,
  onNavigateHome,
  onDeleteProject,
  onEnterSession,
  onCreateSessionClick,
  onDeleteSession,
  onDuplicateSession,
  onOpenImport,
  onOpenBoard,
  onAddWorkstream,
  onDeleteWorkstream,
  onUpdateWorkstream,
  onAddCard,
  onDeleteCard,
  onUpdateCard,
}) => {
  const [project, setProject] = useState<Project | null>(initialProject || null);
  const [cards, setCards] = useState<Card[]>(initialCards || []);
  const [sessions, setSessions] = useState<PlanningSession[]>(initialSessions || []);
  const [assessmentsMap, setAssessmentsMap] = useState<Record<string, SessionAssessment>>({});
  const [isLoading, setIsLoading] = useState(!initialProject && !!propProjectId);

  // Tab View Mode: board, backlog, sessions, workstreams
  const [activeTab, setActiveTab] = useState<'board' | 'backlog' | 'sessions' | 'workstreams'>('board');

  // Board grouping mode: priority, disposition, stage
  const [boardGroupBy, setBoardGroupBy] = useState<'priority' | 'disposition' | 'stage'>('priority');

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWsFilter, setSelectedWsFilter] = useState('all');

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [sessionToShare, setSessionToShare] = useState<PlanningSession | undefined>(undefined);

  // Modals
  const [selectedCardDetail, setSelectedCardDetail] = useState<Card | null>(null);
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<PlanningSession | null>(null);
  const [showAddWsModal, setShowAddWsModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Add Workstream form state
  const [wsName, setWsName] = useState('');
  const [wsLead, setWsLead] = useState('');
  const [wsColor, setWsColor] = useState('#2563eb');

  // Add Card form state
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');
  const [newCardWs, setNewCardWs] = useState('');
  const [newCardPriority, setNewCardPriority] = useState<Priority>('P1');
  const [newCardStage, setNewCardStage] = useState<DeliveryStage>('Requirements');
  const [newCardOwner, setNewCardOwner] = useState('');
  const [newCardEta, setNewCardEta] = useState('Q2 2027');

  // Sync if initial props change
  useEffect(() => {
    if (initialProject) setProject(initialProject);
    if (initialCards) setCards(initialCards);
    if (initialSessions) setSessions(initialSessions);
  }, [initialProject, initialCards, initialSessions]);

  // Load project by ID if not supplied directly
  useEffect(() => {
    async function loadProjectData() {
      const activeId = propProjectId || initialProject?.id;
      if (!activeId) return;

      if (!initialProject || !initialCards) {
        setIsLoading(true);
        const projects = await persistenceService.getProjects();
        const found = projects.find((p) => p.id === activeId) || projects[0];
        if (found) {
          setProject(found);
          const loadedCards = await persistenceService.getCards(found.id);
          setCards(loadedCards);
          const loadedSessions = await persistenceService.getSessions(found.id);
          setSessions(loadedSessions);
        }
        setIsLoading(false);
      }
    }
    loadProjectData();
  }, [propProjectId]);

  // Load workshop assessments
  useEffect(() => {
    async function loadAssessments() {
      const map: Record<string, SessionAssessment> = {};
      for (const sess of sessions) {
        const sessAssessments = await persistenceService.getAssessments(sess.id);
        Object.values(sessAssessments).forEach((a) => {
          map[a.cardId] = a;
        });
      }
      setAssessmentsMap(map);
    }
    if (sessions.length > 0) {
      loadAssessments();
    }
  }, [sessions]);

  if (isLoading || !project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center text-stone-400">
        <div className="w-8 h-8 mx-auto border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading project planner workspace...</p>
      </div>
    );
  }

  const deliveredCount = cards.filter((c) => c.currentStage === 'Delivered').length;
  const openCount = cards.length - deliveredCount;
  const p0Count = cards.filter((c) => c.currentPriority === 'P0').length;
  const p1Count = cards.filter((c) => c.currentPriority === 'P1').length;
  const tbdOwnerCount = cards.filter(
    (c) => !c.internalOwner || c.internalOwner.trim().toUpperCase() === 'TBD'
  ).length;

  const upcomingSession = sessions.find((s) => s.stage === 'live') || sessions[0];

  // Filtering cards for both Board & Table
  const filteredCards = cards.filter((card) => {
    const q = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !q ||
      card.title.toLowerCase().includes(q) ||
      card.description.toLowerCase().includes(q) ||
      card.id.toLowerCase().includes(q) ||
      (card.internalOwner && card.internalOwner.toLowerCase().includes(q));

    const matchesWs = selectedWsFilter === 'all' || card.workstreamId === selectedWsFilter;

    return matchesSearch && matchesWs;
  });

  const handleOpenShare = (session?: PlanningSession) => {
    setSessionToShare(session || upcomingSession);
    setShowShareModal(true);
  };

  const handleAddWs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    onAddWorkstream(wsName.trim(), wsLead.trim() || currentUser.name, wsColor);
    setWsName('');
    setWsLead('');
    setShowAddWsModal(false);
  };

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
        setCards((prev) => [...prev, cardObj]);
      });
    }

    setNewCardTitle('');
    setNewCardDesc('');
    setShowAddCardModal(false);
  };

  const renderPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'P0':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
            P0 Critical
          </span>
        );
      case 'P1':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            P1 High
          </span>
        );
      case 'P2':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            P2 Med
          </span>
        );
      case 'P3':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-300 dark:border-stone-700">
            P3 Low
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-stone-100 dark:bg-stone-800 text-stone-500">
            {priority}
          </span>
        );
    }
  };

  const renderProposedBadge = (card: Card, assessment?: SessionAssessment) => {
    const proposed = assessment?.proposedPriority;
    if (!proposed) return null;
    const hasShift = proposed !== card.currentPriority;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
        hasShift
          ? 'bg-[#d4af37]/25 text-[#fcd34d] border-[#d4af37]'
          : 'bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/40'
      }`}>
        <Sparkles className="w-2.5 h-2.5 text-[#d4af37]" />
        <span>Workshop: {proposed}</span>
      </span>
    );
  };

  const renderDispositionBadge = (assessment?: SessionAssessment) => {
    const disposition: WorkshopDisposition = assessment?.decision || 'Not Discussed';
    switch (disposition) {
      case 'Selected':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-600 text-white shadow-xs">Selected</span>;
      case 'Reserve':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#d4af37] text-neutral-950 shadow-xs">Reserve</span>;
      case 'Defer':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-600 text-stone-100">Defer</span>;
      case 'Drop':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold line-through text-rose-500 bg-rose-500/10 border border-rose-500/30">Drop</span>;
      case 'Needs Validation':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/40">
            <AlertTriangle className="w-2.5 h-2.5" />
            Needs Validation
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] text-stone-400 bg-stone-100 dark:bg-stone-800">
            Not Discussed
          </span>
        );
    }
  };

  const renderBoardCard = (card: Card) => {
    const ws = project.workstreams.find((w) => w.id === card.workstreamId);
    const assessment = assessmentsMap[card.id];
    const isTbd = !card.internalOwner || card.internalOwner.trim().toUpperCase() === 'TBD';

    return (
      <div
        key={card.id}
        onClick={() => setSelectedCardDetail(card)}
        className="bg-white dark:bg-[#20222a] hover:bg-stone-50 dark:hover:bg-[#252834] border border-stone-200 dark:border-[#2e303a] hover:border-[#d4af37]/60 rounded-xl p-3.5 shadow-xs transition-all cursor-pointer space-y-2.5 group"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold text-stone-400 group-hover:text-[#d4af37] transition-colors">
            {card.id}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 dark:bg-[#18191c] text-stone-700 dark:text-stone-300">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: ws?.color || '#d4af37' }}
            />
            {card.workstreamName || ws?.name || 'General'}
          </span>
        </div>

        <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2">
          {card.title}
        </h4>

        {card.description && (
          <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
            {card.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {renderPriorityBadge(card.currentPriority)}
          {renderProposedBadge(card, assessment)}
          {assessment?.decision && assessment.decision !== 'Not Discussed' && (
            renderDispositionBadge(assessment)
          )}
        </div>

        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px]">
          {isTbd ? (
            <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3 h-3" />
              TBD (Gap)
            </span>
          ) : (
            <span className="text-stone-600 dark:text-stone-300 font-medium truncate max-w-[130px]">
              {card.internalOwner}
            </span>
          )}

          <span className="text-[10px] text-stone-400 font-mono">
            {card.targetDateOrQuarter || card.currentStage}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Breadcrumb row */}
      {onNavigateHome && (
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Workspace</span>
          </button>

          {onDeleteProject && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2.5 py-1 rounded-md transition-colors"
              title="Delete this project"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Project</span>
            </button>
          )}
        </div>
      )}

      {/* Project Banner Card */}
      <div className="bg-[#181920] border border-stone-800 rounded-2xl p-5 sm:p-6 text-stone-100 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-[#d4af37]/20 text-[#fcd34d] border border-[#d4af37]/40">
                Target: {project.targetHorizon}
              </span>
              <span className="text-stone-400">
                Impact Metric: <strong>{project.impactLabelName}</strong>
              </span>
              <span className="text-stone-500 font-mono">
                {project.id}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {project.name}
            </h1>

            {upcomingSession && (
              <div className="inline-flex items-center gap-2 pt-1">
                <span className="text-xs text-stone-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Workshop Session: <strong>{upcomingSession.name}</strong> ({upcomingSession.date})</span>
                </span>
                <button
                  onClick={() => handleOpenShare(upcomingSession)}
                  className="text-[11px] font-bold text-[#fcd34d] hover:underline flex items-center gap-1 ml-1"
                >
                  <Share2 className="w-3 h-3" />
                  Share
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowAddCardModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#282a35] hover:bg-[#323540] text-xs font-semibold text-white border border-stone-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4 text-[#d4af37]" />
              Add Deliverable
            </button>

            <button
              onClick={() => handleOpenShare(upcomingSession)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#282a35] hover:bg-[#323540] text-xs font-semibold text-white border border-stone-700 transition-colors shadow-xs"
            >
              <Share2 className="w-4 h-4 text-[#d4af37]" />
              Share Session
            </button>

            {upcomingSession && (
              <button
                onClick={() => onEnterSession(upcomingSession.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold shadow-md transition-colors"
              >
                <Radio className="w-4 h-4" />
                Join Session Room
              </button>
            )}

            <button
              onClick={onOpenImport}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-transparent hover:bg-stone-800 text-stone-300 text-xs font-semibold border border-stone-700 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-stone-400" />
              Import Excel
            </button>
          </div>
        </div>

        {/* Overview Metric Strip */}
        <div className="mt-5 pt-4 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-300">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              Deliverables: <strong className="text-white">{cards.length}</strong>{' '}
              <span className="text-stone-400">({openCount} active, {deliveredCount} delivered)</span>
            </div>
            <div>
              Priority Focus: <strong className="text-red-400">{p0Count} P0</strong> &bull;{' '}
              <strong className="text-amber-400">{p1Count} P1</strong>
            </div>
            <div>
              Workstreams: <strong className="text-white">{project.workstreams.length}</strong>
            </div>
            <div>
              Ownership:{' '}
              {tbdOwnerCount > 0 ? (
                <strong className="text-amber-400">{tbdOwnerCount} TBD Gaps</strong>
              ) : (
                <strong className="text-emerald-400">All Assigned</strong>
              )}
            </div>
          </div>
          <span className="text-stone-500 text-[11px] font-mono">
            {sessions.length} Planning Session(s)
          </span>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-[#20222a] p-1 rounded-xl border border-stone-200 dark:border-stone-800 self-start">
          <button
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'board'
                ? 'bg-white dark:bg-[#2d303b] text-stone-900 dark:text-white shadow-xs border border-stone-200 dark:border-stone-700'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Kanban className="w-3.5 h-3.5 text-[#d4af37]" />
            Planning Board
          </button>

          <button
            onClick={() => setActiveTab('backlog')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'backlog'
                ? 'bg-white dark:bg-[#2d303b] text-stone-900 dark:text-white shadow-xs border border-stone-200 dark:border-stone-700'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-stone-400" />
            Deliverables Backlog
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {cards.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'sessions'
                ? 'bg-white dark:bg-[#2d303b] text-stone-900 dark:text-white shadow-xs border border-stone-200 dark:border-stone-700'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-stone-400" />
            Planning Sessions
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {sessions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('workstreams')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'workstreams'
                ? 'bg-white dark:bg-[#2d303b] text-stone-900 dark:text-white shadow-xs border border-stone-200 dark:border-stone-700'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-stone-400" />
            Workstreams
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 text-xs">
          <select
            value={selectedWsFilter}
            onChange={(e) => setSelectedWsFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] text-stone-800 dark:text-stone-200 text-xs focus:outline-none focus:border-[#d4af37]"
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
              placeholder="Search deliverables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] text-stone-800 dark:text-stone-200 text-xs focus:outline-none focus:border-[#d4af37] w-48 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: PLANNING BOARD */}
      {activeTab === 'board' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
              <span className="font-semibold">Group Board By:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setBoardGroupBy('priority')}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    boardGroupBy === 'priority'
                      ? 'bg-[#d4af37]/20 text-[#fcd34d] border border-[#d4af37]/50 font-bold'
                      : 'text-stone-500 hover:text-stone-200'
                  }`}
                >
                  Priority (P0 - P3)
                </button>
                <button
                  onClick={() => setBoardGroupBy('disposition')}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    boardGroupBy === 'disposition'
                      ? 'bg-[#d4af37]/20 text-[#fcd34d] border border-[#d4af37]/50 font-bold'
                      : 'text-stone-500 hover:text-stone-200'
                  }`}
                >
                  Workshop Disposition
                </button>
                <button
                  onClick={() => setBoardGroupBy('stage')}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    boardGroupBy === 'stage'
                      ? 'bg-[#d4af37]/20 text-[#fcd34d] border border-[#d4af37]/50 font-bold'
                      : 'text-stone-500 hover:text-stone-200'
                  }`}
                >
                  Delivery Stage
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddCardModal(true)}
                className="text-xs font-bold text-[#b45309] dark:text-[#fcd34d] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Card
              </button>
            </div>
          </div>

          {boardGroupBy === 'priority' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['P0', 'P1', 'P2', 'P3'] as Priority[]).map((p) => {
                const columnCards = filteredCards.filter((c) => c.currentPriority === p);
                const titleMap: Record<Priority, { label: string; dot: string; border: string }> = {
                  P0: { label: 'P0 Critical Priority', dot: 'bg-red-500', border: 'border-t-red-500' },
                  P1: { label: 'P1 High Priority', dot: 'bg-amber-500', border: 'border-t-amber-500' },
                  P2: { label: 'P2 Medium Priority', dot: 'bg-blue-500', border: 'border-t-blue-500' },
                  P3: { label: 'P3 Low Priority', dot: 'bg-stone-400', border: 'border-t-stone-500' },
                  Unprioritized: { label: 'Unprioritized', dot: 'bg-stone-600', border: 'border-t-stone-600' },
                };
                const config = titleMap[p];

                return (
                  <div
                    key={p}
                    className={`bg-stone-50/50 dark:bg-[#18191c]/80 border border-stone-200 dark:border-[#2e303a] border-t-4 ${config.border} rounded-xl p-3.5 flex flex-col min-h-[420px]`}
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200 dark:border-[#2e303a]">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                        <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                          {config.label}
                        </h3>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300">
                        {columnCards.length}
                      </span>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {columnCards.map(renderBoardCard)}
                      {columnCards.length === 0 && (
                        <div className="h-32 flex items-center justify-center text-xs text-stone-400 italic">
                          No deliverables in {p}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {boardGroupBy === 'disposition' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['Selected', 'Reserve', 'Needs Validation', 'Not Discussed'] as const).map((disp) => {
                const columnCards = filteredCards.filter((c) => {
                  const a = assessmentsMap[c.id];
                  const d = a?.decision || 'Not Discussed';
                  return d === disp;
                });

                return (
                  <div
                    key={disp}
                    className="bg-stone-50/50 dark:bg-[#18191c]/80 border border-stone-200 dark:border-[#2e303a] rounded-xl p-3.5 flex flex-col min-h-[420px]"
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200 dark:border-[#2e303a]">
                      <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                        {disp}
                      </h3>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300">
                        {columnCards.length}
                      </span>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {columnCards.map(renderBoardCard)}
                      {columnCards.length === 0 && (
                        <div className="h-32 flex items-center justify-center text-xs text-stone-400 italic">
                          No cards in {disp}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {boardGroupBy === 'stage' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['Requirements', 'Architecture & Design', 'Development', 'Testing'] as DeliveryStage[]).map((st) => {
                const columnCards = filteredCards.filter((c) => c.currentStage === st);

                return (
                  <div
                    key={st}
                    className="bg-stone-50/50 dark:bg-[#18191c]/80 border border-stone-200 dark:border-[#2e303a] rounded-xl p-3.5 flex flex-col min-h-[420px]"
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200 dark:border-[#2e303a]">
                      <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider truncate">
                        {st}
                      </h3>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300">
                        {columnCards.length}
                      </span>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {columnCards.map(renderBoardCard)}
                      {columnCards.length === 0 && (
                        <div className="h-32 flex items-center justify-center text-xs text-stone-400 italic">
                          No deliverables in {st}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DELIVERABLES BACKLOG */}
      {activeTab === 'backlog' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Project Backlog Items ({filteredCards.length})
            </h2>
            <button
              onClick={() => setShowAddCardModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Deliverable
            </button>
          </div>

          <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-[#2e303a] rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-100 dark:bg-[#18191c] text-stone-600 dark:text-stone-400 font-semibold border-b border-stone-200 dark:border-[#2e303a]">
                  <tr>
                    <th className="p-3 w-20">ID</th>
                    <th className="p-3 min-w-[220px]">Deliverable & Activities</th>
                    <th className="p-3">Workstream</th>
                    <th className="p-3">Current Priority</th>
                    <th className="p-3">Proposed Priority</th>
                    <th className="p-3">Delivery Stage</th>
                    <th className="p-3">Workshop Disposition</th>
                    <th className="p-3">Owner</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-[#2e303a] text-stone-800 dark:text-stone-200">
                  {filteredCards.map((card) => {
                    const assessment = assessmentsMap[card.id];
                    const ws = project.workstreams.find((w) => w.id === card.workstreamId);
                    const isTbdOwner = !card.internalOwner || card.internalOwner.trim().toUpperCase() === 'TBD';

                    return (
                      <tr
                        key={card.id}
                        onClick={() => setSelectedCardDetail(card)}
                        className="hover:bg-stone-50 dark:hover:bg-[#252835] transition-colors cursor-pointer"
                      >
                        <td className="p-3 font-mono font-bold text-stone-500">
                          {card.id}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-stone-900 dark:text-stone-100">
                            {card.title}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                            {card.description}
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-stone-100 dark:bg-[#282a35] text-stone-700 dark:text-stone-300 font-medium">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: ws?.color || '#d4af37' }}
                            />
                            {card.workstreamName || ws?.name || 'Workstream'}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {renderPriorityBadge(card.currentPriority)}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {renderProposedBadge(card, assessment) || <span className="text-stone-400">&mdash;</span>}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                            {card.currentStage}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {renderDispositionBadge(assessment)}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {isTbdOwner ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              <AlertCircle className="w-3 h-3" />
                              TBD
                            </span>
                          ) : (
                            <span className="font-medium">{card.internalOwner}</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCardToDelete(card);
                            }}
                            className="p-1 rounded text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Delete card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredCards.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-stone-400">
                        No deliverables match the search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PLANNING SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Scheduled Planning Sessions ({sessions.length})
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Facilitated meetings with custom agendas, Delphi planning poker, and workshop decisions.
              </p>
            </div>
            <button
              onClick={onCreateSessionClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Session
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((sess) => {
              const isLive = sess.stage === 'live';
              const isClosed = sess.stage === 'closed';

              return (
                <div
                  key={sess.id}
                  className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                    isLive
                      ? 'bg-amber-500/5 dark:bg-[#22242e] border-[#d4af37] shadow-sm'
                      : 'bg-white dark:bg-[#20222a] border-stone-200 dark:border-[#2e303a]'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isLive
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : isClosed
                          ? 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      }`}>
                        {isLive ? '● Live Working Session' : isClosed ? 'Closed Archive' : 'Preparation Stage'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-stone-500">Rev {sess.version}</span>
                        {onDuplicateSession && (
                          <button
                            type="button"
                            onClick={() => onDuplicateSession(sess.id)}
                            className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
                            title="Duplicate session"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteSession && (
                          <button
                            type="button"
                            onClick={() => setSessionToDelete(sess)}
                            className="p-1 rounded text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Delete session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                      {sess.name}
                    </h3>

                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                      {sess.objective || 'No session objective recorded.'}
                    </p>

                    <div className="pt-2 text-xs space-y-1 text-stone-600 dark:text-stone-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>Meeting Date: <strong>{sess.date}</strong> ({sess.timeZone})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>Target Horizon: <strong>{sess.deliveryHorizon}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                        <span>Facilitator: <strong>{sess.facilitatorName}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenShare(sess)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>Share</span>
                    </button>

                    <button
                      onClick={() => onEnterSession(sess.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#18191c] dark:bg-[#2a2c38] hover:bg-[#343746] text-white border border-stone-700 shadow-xs transition-colors"
                    >
                      <span>{isLive ? 'Join Workshop Room' : 'View Session Room'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#d4af37]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: WORKSTREAMS */}
      {activeTab === 'workstreams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Workstreams & Leads ({project.workstreams.length})
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Cross-functional tracks with designated leads and deliverable progress.
              </p>
            </div>
            <button
              onClick={() => setShowAddWsModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Workstream
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.workstreams.map((ws) => {
              const wsCards = cards.filter((c) => c.workstreamId === ws.id);
              const wsDelivered = wsCards.filter((c) => c.currentStage === 'Delivered').length;

              return (
                <div
                  key={ws.id}
                  className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-[#2e303a] rounded-xl p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ws.color || '#d4af37' }}
                      />
                      <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        {ws.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-[#282a35] text-stone-600 dark:text-stone-300">
                        {wsCards.length} cards
                      </span>
                      {onDeleteWorkstream && project.workstreams.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteWorkstream(ws.id)}
                          className="p-1 rounded text-stone-400 hover:text-rose-500 transition-colors"
                          title="Delete workstream"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-stone-500 dark:text-stone-400 space-y-1">
                    <div>
                      Lead: <strong className="text-stone-800 dark:text-stone-200">{ws.leadName}</strong>
                      {ws.leadEmail && <span className="text-[11px] text-stone-400 ml-1">({ws.leadEmail})</span>}
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span>Active: <strong>{wsCards.length - wsDelivered}</strong></span>
                      <span>Delivered: <strong>{wsDelivered}</strong></span>
                    </div>
                  </div>

                  <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{
                        width: wsCards.length ? `${(wsDelivered / wsCards.length) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {showShareModal && (
        <ShareSessionModal
          project={project}
          session={sessionToShare}
          sessions={sessions}
          currentUser={currentUser}
          deliverablesCount={cards.length}
          onClose={() => setShowShareModal(false)}
          onEnterSession={onEnterSession}
        />
      )}

      {/* MODAL: ADD DELIVERABLE */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Add New Deliverable Card
            </h3>
            <form onSubmit={handleCreateCardSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Deliverable Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Automated Webhook Dispatcher"
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
                    placeholder="e.g., Sarah Jenkins (or TBD)"
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

      {/* MODAL: CARD QUICK DETAIL */}
      {selectedCardDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-[#d4af37]">
                  {selectedCardDetail.id}
                </span>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {selectedCardDetail.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCardDetail(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <span className="font-semibold text-stone-500 block mb-1">Key Description & Activities</span>
                <p className="text-stone-700 dark:text-stone-300 leading-relaxed bg-stone-50 dark:bg-[#18191c] p-3 rounded-lg border border-stone-200 dark:border-stone-800">
                  {selectedCardDetail.description || 'No detailed description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="font-semibold text-stone-500 block">Current Priority</span>
                  <div className="mt-1">{renderPriorityBadge(selectedCardDetail.currentPriority)}</div>
                </div>
                <div>
                  <span className="font-semibold text-stone-500 block">Proposed Priority</span>
                  <div className="mt-1">
                    {renderProposedBadge(selectedCardDetail, assessmentsMap[selectedCardDetail.id]) || (
                      <span className="text-stone-400">Pending Workshop</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-stone-500 block">Internal Owner</span>
                  <span className="font-medium text-stone-800 dark:text-stone-200">
                    {selectedCardDetail.internalOwner || 'TBD (Gap)'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-stone-500 block">Delivery Stage</span>
                  <span className="font-medium text-stone-800 dark:text-stone-200">
                    {selectedCardDetail.currentStage}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const card = selectedCardDetail;
                  setSelectedCardDetail(null);
                  setCardToDelete(card);
                }}
                className="text-rose-500 hover:underline text-xs font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Deliverable
              </button>
              <button
                onClick={() => setSelectedCardDetail(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD WORKSTREAM */}
      {showAddWsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Add New Workstream</h3>
            <form onSubmit={handleAddWs} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Workstream Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Clinical Decision Support"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Workstream Lead Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Britto Thomas"
                  value={wsLead}
                  onChange={(e) => setWsLead(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Theme Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={wsColor}
                    onChange={(e) => setWsColor(e.target.value)}
                    className="w-10 h-8 rounded border border-stone-300 dark:border-stone-700 cursor-pointer"
                  />
                  <span className="font-mono text-xs text-stone-500">{wsColor}</span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddWsModal(false)}
                  className="px-4 py-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold shadow-md transition-colors"
                >
                  Save Workstream
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
                <p className="text-xs text-stone-500 dark:text-stone-400">Card: {cardToDelete.id}</p>
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
                    persistenceService.deleteCard(cardToDelete.id).then(() => {
                      setCards((prev) => prev.filter((c) => c.id !== cardToDelete.id));
                    });
                  }
                  setCardToDelete(null);
                }}
                className="px-4 py-2 rounded-lg text-sm bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE SESSION CONFIRMATION */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#20222a] rounded-2xl border border-stone-200 dark:border-stone-700 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Delete Planning Session</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">Irreversible Action</p>
              </div>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Are you sure you want to delete session <strong className="text-stone-900 dark:text-stone-100 font-semibold">"{sessionToDelete.name}"</strong>?
            </p>
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 rounded-lg text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSession) {
                    onDeleteSession(sessionToDelete.id);
                  }
                  setSessionToDelete(null);
                }}
                className="px-4 py-2 rounded-lg text-sm bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE PROJECT CONFIRMATION */}
      {showDeleteConfirm && project && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#20222a] rounded-2xl border border-stone-200 dark:border-stone-700 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Delete Project</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">Irreversible Action</p>
              </div>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-stone-900 dark:text-stone-100 font-semibold">"{project.name}"</strong>?
              This will permanently remove the project, all workstreams, {cards.length} deliverable cards, and {sessions.length} planning session(s).
            </p>
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProject) {
                    onDeleteProject(project.id);
                  }
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 rounded-lg text-sm bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
