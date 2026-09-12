import React, { useState, useEffect } from 'react';
import {
  Project,
  PlanningSession,
  Card,
  SessionAssessment,
  FollowUpAction,
  ActivityLog,
  CardComment,
  User,
  WorkshopDisposition,
} from '../../types';
import { persistenceService } from '../../services/PersistenceService';
import {
  exportSessionToExcel,
  exportSessionToHtml,
  generateMeetingSummaryMarkdown,
  exportFilteredCsv,
} from '../../utils/excelExport';
import {
  FileSpreadsheet,
  FileCode,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Lock,
  History,
  Layers,
  Search,
  Filter,
  Users,
  Calendar,
  Sparkles,
  Tag,
  Copy,
  Check,
  MessageSquare,
  FileText,
  Share2,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';

interface SessionResultsProps {
  session: PlanningSession;
  project: Project;
  cards: Card[];
  currentUser: User;
  onBackToSession: () => void;
  onSessionUpdated: (updated: PlanningSession) => void;
}

export const SessionResults: React.FC<SessionResultsProps> = ({
  session,
  project,
  cards,
  currentUser,
  onBackToSession,
  onSessionUpdated,
}) => {
  const [assessments, setAssessments] = useState<Record<string, SessionAssessment>>({});
  const [actions, setActions] = useState<FollowUpAction[]>([]);
  const [comments, setComments] = useState<CardComment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [selectedDispositionFilter, setSelectedDispositionFilter] = useState<string>('all');
  const [selectedWsFilter, setSelectedWsFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [commentSearchQuery, setCommentSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [session.id]);

  const loadData = async () => {
    const [aMap, acts, logs, comms] = await Promise.all([
      persistenceService.getAssessments(session.id),
      persistenceService.getActions(session.id),
      persistenceService.getActivityLogs(session.id),
      persistenceService.getAllSessionComments(session.id),
    ]);
    setAssessments(aMap);
    setActions(acts);
    setActivityLogs(logs);
    setComments(comms);
  };

  const cardMap = new Map<string, Card>(cards.map((c) => [c.id, c]));

  // Decisions count breakdown
  const assessmentList = Object.values(assessments) as SessionAssessment[];
  const totalCards = cards.length;
  const selectedCount = assessmentList.filter((a) => a.decision === 'Selected').length;
  const reserveCount = assessmentList.filter((a) => a.decision === 'Reserve').length;
  const deferCount = assessmentList.filter((a) => a.decision === 'Defer').length;
  const dropCount = assessmentList.filter((a) => a.decision === 'Drop').length;
  const needsValCount = assessmentList.filter((a) => a.decision === 'Needs Validation').length;
  const notDiscussedCount = totalCards - (selectedCount + reserveCount + deferCount + dropCount + needsValCount);

  // Validation needs items
  const validationItems = assessmentList.filter((a) => a.validationNeeds && a.validationNeeds.trim());

  // Filtered table cards
  const filteredCards = cards.filter((card) => {
    if (selectedWsFilter !== 'all' && card.workstreamId !== selectedWsFilter) return false;
    const a = assessments[card.id];
    const decision = a?.decision || 'Not Discussed';
    if (selectedDispositionFilter !== 'all' && decision !== selectedDispositionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        card.title.toLowerCase().includes(q) ||
        card.id.toLowerCase().includes(q) ||
        card.internalOwner.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered comments
  const filteredComments = comments.filter((c) => {
    if (!commentSearchQuery.trim()) return true;
    const q = commentSearchQuery.toLowerCase();
    const card = cardMap.get(c.cardId);
    return (
      c.content.toLowerCase().includes(q) ||
      c.authorName.toLowerCase().includes(q) ||
      c.cardId.toLowerCase().includes(q) ||
      (card && card.title.toLowerCase().includes(q))
    );
  });

  // Handle Excel Export (with Assessments, Comments, Actions, Executive Summary)
  const handleExcelExport = () => {
    setIsExporting(true);
    try {
      exportSessionToExcel(session, project, cards, assessments, actions, comments);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle HTML Standalone Export (with Agenda, Cards, Actions, Comments)
  const handleHtmlExport = () => {
    setIsExporting(true);
    try {
      exportSessionToHtml(session, project, cards, assessments, actions, comments);
    } finally {
      setIsExporting(false);
    }
  };

  // Close Session / Lock against further edits
  const handleToggleClose = () => {
    const newStage = session.stage === 'closed' ? 'live' : 'closed';
    const updated: PlanningSession = {
      ...session,
      stage: newStage,
      version: session.version + 1,
      updatedAt: new Date().toISOString(),
    };
    persistenceService.saveSession(updated);
    onSessionUpdated(updated);
  };

  const handleCopyMarkdownSummary = () => {
    const md = generateMeetingSummaryMarkdown(session, project, cards, assessments, actions, comments);
    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const handleExportActionsCsv = () => {
    const headers = ['Action ID', 'Card ID', 'Deliverable Title', 'Workstream', 'Action', 'Owner', 'Due Date', 'Status'];
    const rows = actions.map((act) => {
      const c = cardMap.get(act.cardId);
      return [act.id, act.cardId, c?.title || '', c?.workstreamName || '', act.action, act.owner, act.dueDate, act.status];
    });
    exportFilteredCsv(`${session.name.replace(/\s+/g, '_')}_Action_Items`, headers, rows);
  };

  const handleExportCommentsCsv = () => {
    const headers = ['Comment ID', 'Card ID', 'Deliverable Title', 'Workstream', 'Author Name', 'Role', 'Comment', 'Timestamp'];
    const rows = comments.map((comm) => {
      const c = cardMap.get(comm.cardId);
      return [comm.id, comm.cardId, c?.title || '', c?.workstreamName || '', comm.authorName, comm.authorRole, comm.content, comm.createdAt];
    });
    exportFilteredCsv(`${session.name.replace(/\s+/g, '_')}_Comments`, headers, rows);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Results Header */}
      <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-[#2e303a] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToSession}
              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs uppercase font-bold tracking-widest text-[#d4af37]">
              Session Results & Backlog Alignment &bull; Rev {session.version}
            </span>
            {session.stage === 'closed' && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                <Lock className="w-3 h-3" /> Locked Archive
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            {session.name}
          </h1>

          <div className="text-xs text-stone-500 dark:text-stone-400 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Project: <strong>{project.name}</strong></span>
            <span>Meeting Date: <strong>{session.date}</strong> ({session.timeZone})</span>
            <span>Target Delivery Horizon: <strong className="text-[#b45309] dark:text-[#fcd34d]">{session.deliveryHorizon}</strong></span>
            <span>Facilitator: <strong>{session.facilitatorName}</strong></span>
          </div>
        </div>

        {/* Export & Lock actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowSummaryModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#d4af37]/20 hover:bg-[#d4af37]/30 text-xs font-bold text-[#fcd34d] border border-[#d4af37]/50 transition-colors shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>View Outcome Report</span>
          </button>

          <button
            onClick={handleCopyMarkdownSummary}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-semibold text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 transition-colors"
            title="Copy Slack/Email formatted meeting summary"
          >
            {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-[#d4af37]" />}
            <span>{copiedMarkdown ? 'Copied Summary!' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={handleHtmlExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-[#282a35] dark:hover:bg-[#323540] text-xs font-bold text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-700 transition-colors shadow-xs"
          >
            <FileCode className="w-4 h-4 text-[#d4af37]" />
            Export HTML
          </button>

          <button
            onClick={handleExcelExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold shadow-md transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Excel (.xlsx)
          </button>

          <button
            onClick={handleToggleClose}
            className="p-2 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 text-xs font-semibold"
            title={session.stage === 'closed' ? 'Re-open session' : 'Close and lock session'}
          >
            {session.stage === 'closed' ? 'Reopen Session' : 'Close Session'}
          </button>
        </div>
      </div>

      {/* Decisions KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white dark:bg-[#20222a] border border-emerald-500/30 p-4 rounded-xl shadow-xs text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{selectedCount}</div>
          <div className="text-xs font-bold text-stone-700 dark:text-stone-300 mt-1">Selected</div>
          <div className="text-[10px] text-stone-400 mt-0.5">Primary Scope</div>
        </div>

        <div className="bg-white dark:bg-[#20222a] border border-amber-500/30 p-4 rounded-xl shadow-xs text-center">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{reserveCount}</div>
          <div className="text-xs font-bold text-stone-700 dark:text-stone-300 mt-1">Reserve</div>
          <div className="text-[10px] text-stone-400 mt-0.5">Buffer Candidates</div>
        </div>

        <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-800 p-4 rounded-xl shadow-xs text-center">
          <div className="text-2xl font-bold text-stone-600 dark:text-stone-300">{deferCount}</div>
          <div className="text-xs font-bold text-stone-700 dark:text-stone-300 mt-1">Defer / Drop</div>
          <div className="text-[10px] text-stone-400 mt-0.5">Post-Horizon ({deferCount + dropCount})</div>
        </div>

        <div className="bg-white dark:bg-[#20222a] border border-orange-500/30 p-4 rounded-xl shadow-xs text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{needsValCount}</div>
          <div className="text-xs font-bold text-stone-700 dark:text-stone-300 mt-1">Needs Validation</div>
          <div className="text-[10px] text-stone-400 mt-0.5">Flagged Gaps</div>
        </div>

        <div className="bg-white dark:bg-[#20222a] border border-blue-500/30 p-4 rounded-xl shadow-xs text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{actions.length}</div>
          <div className="text-xs font-bold text-stone-700 dark:text-stone-300 mt-1">Action Items</div>
          <div className="text-[10px] text-stone-400 mt-0.5">Assigned Deliverables</div>
        </div>

        <div className="bg-white dark:bg-[#20222a] border border-purple-500/30 p-4 rounded-xl shadow-xs text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{comments.length}</div>
          <div className="text-xs font-bold text-stone-700 dark:text-stone-300 mt-1">Comments</div>
          <div className="text-[10px] text-stone-400 mt-0.5">Team Contributions</div>
        </div>

        <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-800 p-4 rounded-xl shadow-xs text-center">
          <div className="text-2xl font-bold text-stone-400">{notDiscussedCount}</div>
          <div className="text-xs font-bold text-stone-500 mt-1">Pending Review</div>
          <div className="text-[10px] text-stone-400 mt-0.5">Of {totalCards} Total</div>
        </div>
      </div>

      {/* Action Items, Validation Needs & Stakeholder Comments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action Items */}
        <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-[#2e303a] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#d4af37]" />
              Follow-Up Actions ({actions.length})
            </h3>
            <button
              onClick={handleExportActionsCsv}
              className="text-[11px] font-semibold text-[#d4af37] hover:underline"
              title="Export actions to CSV"
            >
              CSV Export
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {actions.length === 0 ? (
              <div className="text-center py-8 text-xs text-stone-400">
                No action items recorded during this workshop.
              </div>
            ) : (
              actions.map((act) => {
                const c = cardMap.get(act.cardId);
                return (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-[#18191c] border border-stone-200 dark:border-stone-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-stone-900 dark:text-stone-100 leading-snug">
                        {act.action}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase shrink-0 px-1.5 py-0.5 rounded bg-emerald-500/10">
                        {act.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-200 dark:border-stone-800/60">
                      <span>
                        Owner: <strong className="text-stone-700 dark:text-stone-300">{act.owner}</strong>
                      </span>
                      <span>
                        Due: <strong className="text-amber-600 dark:text-amber-400">{act.dueDate}</strong>
                      </span>
                    </div>
                    {c && (
                      <div className="text-[10px] text-stone-400 truncate">
                        Linked: <span className="font-mono font-medium">{c.id}</span> &bull; {c.title}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Validation Needs & Gaps */}
        <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-[#2e303a] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Validation Gaps ({validationItems.length})
            </h3>
            <span className="text-[11px] text-stone-400">Needs Resolution</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {validationItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-stone-400">
                No unresolved questions or validation gaps flagged.
              </div>
            ) : (
              validationItems.map((item) => {
                const card = cards.find((c) => c.id === item.cardId);
                return (
                  <div
                    key={item.cardId}
                    className="p-3 rounded-xl bg-amber-500/5 dark:bg-[#18191c] border border-amber-500/30 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 dark:text-stone-100 truncate max-w-[200px]">
                        {card?.title}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold">
                        {item.cardId}
                      </span>
                    </div>
                    <p className="text-stone-700 dark:text-stone-300 leading-relaxed text-[11px]">
                      {item.validationNeeds}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Stakeholder Comments & Discussion Log */}
        <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-[#2e303a] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#d4af37]" />
              Stakeholder Comments ({comments.length})
            </h3>
            <button
              onClick={handleExportCommentsCsv}
              className="text-[11px] font-semibold text-[#d4af37] hover:underline"
              title="Export comments to CSV"
            >
              CSV Export
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {filteredComments.length === 0 ? (
              <div className="text-center py-8 text-xs text-stone-400">
                No comments captured in this session yet.
              </div>
            ) : (
              filteredComments.map((comm) => {
                const c = cardMap.get(comm.cardId);
                return (
                  <div
                    key={comm.id}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-[#18191c] border border-stone-200 dark:border-stone-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#d4af37]" />
                        <span className="font-bold text-stone-900 dark:text-stone-100">{comm.authorName}</span>
                        <span className="text-[10px] text-stone-400 uppercase">({comm.authorRole})</span>
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-stone-700 dark:text-stone-300 leading-relaxed text-[11px]">
                      "{comm.content}"
                    </p>

                    {c && (
                      <div className="text-[10px] text-stone-400 truncate pt-1 border-t border-stone-200 dark:border-stone-800/60">
                        On <span className="font-mono text-[#d4af37]">{c.id}</span>: {c.title}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Complete Assessment Matrix Table */}
      <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-[#2e303a] rounded-2xl shadow-xs overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
              Complete Assessment Matrix (PRD Section 8)
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Showing {filteredCards.length} of {cards.length} deliverable records.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#18191c] text-xs w-36 sm:w-44"
              />
            </div>

            <select
              value={selectedWsFilter}
              onChange={(e) => setSelectedWsFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#18191c] text-xs font-medium"
            >
              <option value="all">All Workstreams</option>
              {project.workstreams.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>

            <select
              value={selectedDispositionFilter}
              onChange={(e) => setSelectedDispositionFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#18191c] text-xs font-medium"
            >
              <option value="all">All Dispositions</option>
              <option value="Selected">Selected</option>
              <option value="Reserve">Reserve</option>
              <option value="Defer">Defer</option>
              <option value="Drop">Drop</option>
              <option value="Needs Validation">Needs Validation</option>
              <option value="Not Discussed">Not Discussed</option>
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-stone-100 dark:bg-[#18191c] text-stone-600 dark:text-stone-400 font-semibold border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Workstream</th>
                <th className="p-3">Deliverable</th>
                <th className="p-3">Current Prio</th>
                <th className="p-3">Proposed Prio</th>
                <th className="p-3">Disposition</th>
                <th className="p-3">Rank</th>
                <th className="p-3">Owner</th>
                <th className="p-3">Milestone / Outcome</th>
                <th className="p-3">Team Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
              {filteredCards.map((card) => {
                const a = assessments[card.id];

                return (
                  <tr key={card.id} className="hover:bg-stone-50 dark:hover:bg-[#252835]">
                    <td className="p-3 font-mono font-bold text-stone-600 dark:text-stone-400">{card.id}</td>
                    <td className="p-3 font-medium whitespace-nowrap">{card.workstreamName}</td>
                    <td className="p-3 font-semibold text-stone-900 dark:text-stone-100 max-w-xs">{card.title}</td>
                    <td className="p-3 font-mono text-stone-400">{card.currentPriority}</td>
                    <td className="p-3 font-mono font-bold text-[#b45309] dark:text-[#fcd34d]">
                      {a?.proposedPriority || card.currentPriority}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                    </td>
                    <td className="p-3 font-bold text-center">
                      {a?.workstreamRank ? `#${a.workstreamRank}` : '-'}
                    </td>
                    <td className="p-3 whitespace-nowrap">{card.internalOwner || 'TBD (Gap)'}</td>
                    <td className="p-3 text-stone-600 dark:text-stone-300 max-w-xs truncate">
                      {a?.milestoneOutcome || card.targetDateOrQuarter}
                    </td>
                    <td className="p-3 text-stone-500 max-w-sm truncate">
                      {a?.teamRationale || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Meeting Outcome Report Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#18191c] border border-stone-200 dark:border-[#2e303a] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-[#2e303a] bg-stone-50 dark:bg-[#1f2128]">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#d4af37]" />
                <div>
                  <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                    Comprehensive Meeting Outcome Report
                  </h3>
                  <p className="text-xs text-stone-500">
                    {session.name} &bull; {session.date} &bull; Rev {session.version}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyMarkdownSummary}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-xs font-semibold text-stone-800 dark:text-stone-200 transition-colors"
                >
                  {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMarkdown ? 'Copied' : 'Copy Text'}</span>
                </button>
                <button
                  onClick={handleExcelExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Excel</span>
                </button>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-stone-700 dark:text-stone-300">
              {/* Executive Metrics Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{selectedCount}</div>
                  <div className="text-[11px] font-bold text-stone-700 dark:text-stone-300 mt-0.5">Selected Deliverables</div>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{reserveCount}</div>
                  <div className="text-[11px] font-bold text-stone-700 dark:text-stone-300 mt-0.5">Reserve Candidates</div>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{actions.length}</div>
                  <div className="text-[11px] font-bold text-stone-700 dark:text-stone-300 mt-0.5">Action Items</div>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{comments.length}</div>
                  <div className="text-[11px] font-bold text-stone-700 dark:text-stone-300 mt-0.5">Stakeholder Comments</div>
                </div>
              </div>

              {/* Agenda Review */}
              {session.agenda && session.agenda.length > 0 && (
                <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-4 bg-stone-50 dark:bg-[#20222a] space-y-2">
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
                    Agenda & Topic Coverage
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {session.agenda.map((ag) => (
                      <div key={ag.id} className="flex items-center gap-2 text-xs">
                        <span className={ag.completed ? 'text-emerald-500 font-bold' : 'text-stone-400'}>
                          {ag.completed ? '✓' : '○'}
                        </span>
                        <span className={ag.completed ? 'line-through text-stone-400' : 'font-medium'}>
                          {ag.title}
                        </span>
                        <span className="text-[10px] text-stone-400">({ag.allocatedMinutes || 15}m)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Accountability & Follow-Up Actions ({actions.length})
                  </h4>
                </div>
                {actions.length === 0 ? (
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-[#20222a] text-center text-stone-400">
                    No action items recorded.
                  </div>
                ) : (
                  <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-stone-100 dark:bg-[#20222a] text-[11px] font-bold text-stone-500 border-b border-stone-200 dark:border-stone-800">
                        <tr>
                          <th className="p-2.5">Action Item</th>
                          <th className="p-2.5">Owner</th>
                          <th className="p-2.5">Due Date</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Card ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                        {actions.map((act) => {
                          const c = cardMap.get(act.cardId);
                          return (
                            <tr key={act.id} className="hover:bg-stone-50 dark:hover:bg-[#20222a]/50">
                              <td className="p-2.5 font-medium text-stone-900 dark:text-stone-100">{act.action}</td>
                              <td className="p-2.5 font-bold">{act.owner}</td>
                              <td className="p-2.5 text-amber-600 dark:text-amber-400">{act.dueDate}</td>
                              <td className="p-2.5 uppercase font-bold text-[10px] text-emerald-600">{act.status}</td>
                              <td className="p-2.5 font-mono text-[11px] text-stone-400">{act.cardId}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Stakeholder Comments & Discussions */}
              <div className="space-y-3">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#d4af37]" />
                  Stakeholder Comments & Deliberations ({comments.length})
                </h4>
                {comments.length === 0 ? (
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-[#20222a] text-center text-stone-400">
                    No comments recorded during this session.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {comments.map((comm) => {
                      const c = cardMap.get(comm.cardId);
                      return (
                        <div
                          key={comm.id}
                          className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#20222a] space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-stone-900 dark:text-stone-100">
                              {comm.authorName} <span className="text-stone-400 font-normal uppercase">({comm.authorRole})</span>
                            </span>
                            <span className="text-stone-400">
                              {new Date(comm.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-stone-800 dark:text-stone-200 leading-relaxed text-xs">
                            "{comm.content}"
                          </p>
                          {c && (
                            <div className="text-[10px] text-stone-400 pt-1 border-t border-stone-200 dark:border-stone-800">
                              Deliverable: <span className="font-mono text-[#d4af37]">{c.id}</span> - {c.title}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-stone-200 dark:border-[#2e303a] bg-stone-50 dark:bg-[#1f2128] flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                Ready to share with leadership, product stakeholders, and team leads.
              </span>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-xs font-semibold text-stone-800 dark:text-stone-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
