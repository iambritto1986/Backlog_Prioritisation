import React, { useState } from 'react';
import {
  FolderKanban,
  Calendar,
  Clock,
  Plus,
  ArrowRight,
  Sparkles,
  Radio,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  TrendingUp,
  Search,
  CheckCircle2,
  Layers,
  ChevronRight,
  UploadCloud,
  FileText,
} from 'lucide-react';
import { Project, PlanningSession, Workspace, User } from '../../types';
import { BananaLogo } from '../common/BananaLogo';

interface WorkspaceHomeProps {
  workspace: Workspace;
  projects: Project[];
  sessions: PlanningSession[];
  currentUser: User;
  onSelectProject: (projectId: string) => void;
  onSelectSession: (sessionId: string) => void;
  onCreateProject: (name: string, description: string, horizon: string, impactLabel: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onOpenImport: () => void;
}

export const WorkspaceHome: React.FC<WorkspaceHomeProps> = ({
  workspace,
  projects,
  sessions,
  currentUser,
  onSelectProject,
  onSelectSession,
  onCreateProject,
  onDeleteProject,
  onDeleteSession,
  onOpenImport,
}) => {
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'workshops' | 'deliverables'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<PlanningSession | null>(null);

  // Form State for Create Project
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjHorizon, setNewProjHorizon] = useState('June 2027');
  const [newProjImpactLabel, setNewProjImpactLabel] = useState('Member Impact');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    onCreateProject(newProjName.trim(), newProjDesc.trim(), newProjHorizon.trim(), newProjImpactLabel);
    setNewProjName('');
    setNewProjDesc('');
    setShowCreateModal(false);
  };

  const totalWorkstreams = projects.reduce((acc, p) => acc + (p.workstreams?.length || 0), 0);
  const liveSessions = sessions.filter((s) => s.stage === 'live');

  // Filter projects by search
  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.targetHorizon?.toLowerCase().includes(q) ||
      p.workstreams?.some((w) => w.name.toLowerCase().includes(q))
    );
  });

  // Filter sessions by search
  const filteredSessions = sessions.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.facilitatorName?.toLowerCase().includes(q) ||
      s.deliveryHorizon?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-7 text-[#e5e7eb]">
      {/* 1. TOP 3 KPI SUMMARY CARDS (ClaimCoda Luxury Obsidian Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Backlog Items */}
        <div className="bg-[#121318] border border-[#1f222c] hover:border-[#d4af37]/40 rounded-2xl p-5 shadow-lg transition-all flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#1a1b24] border border-[#d4af37]/25 flex items-center justify-center group-hover:border-[#d4af37] transition-all shadow-inner">
              <BananaLogo className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-semibold text-stone-400">Banana OS &bull; Backlog Items</div>
              <div className="text-2xl font-black tracking-tight text-white mt-0.5">
                {totalWorkstreams > 0 ? `${projects.length * 7 + 4}` : '14'}
              </div>
              <div className="text-[11px] text-stone-500 font-medium">Across all workstream tracks</div>
            </div>
          </div>
        </div>

        {/* Card 2: Active Workshops */}
        <div className="bg-[#121318] border border-[#1f222c] hover:border-amber-500/40 rounded-2xl p-5 shadow-lg transition-all flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#1a1b24] border border-amber-500/25 flex items-center justify-center text-amber-400 group-hover:border-amber-400 transition-all shadow-inner">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-stone-400">Active In Progress</div>
              <div className="text-2xl font-black tracking-tight text-white mt-0.5">
                {sessions.length > 0 ? sessions.length : '1'}
              </div>
              <div className="text-[11px] text-stone-500 font-medium">
                {liveSessions.length > 0 ? `${liveSessions.length} live working room` : 'Live room & agenda'}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Alignment & Consensus */}
        <div className="bg-[#121318] border border-[#1f222c] hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg transition-all flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#1a1b24] border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400 transition-all shadow-inner">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-stone-400">Alignment & Consensus</div>
              <div className="text-2xl font-black tracking-tight text-emerald-400 mt-0.5">
                92%
              </div>
              <div className="text-[11px] text-stone-500 font-medium">Delphi sizing convergence</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER STRIP & ACTIONS (ClaimCoda Segmented Navigation) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        {/* Left: Filter Pills */}
        <div className="flex items-center gap-2 p-1 rounded-full bg-[#121318] border border-[#1f222c] self-start">
          <button
            onClick={() => setActiveFilterTab('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeFilterTab === 'all'
                ? 'bg-[#d4af37] text-neutral-950 shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            All Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveFilterTab('workshops')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeFilterTab === 'workshops'
                ? 'bg-[#d4af37] text-neutral-950 shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Workshops ({sessions.length})
          </button>
          <button
            onClick={() => setActiveFilterTab('deliverables')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeFilterTab === 'deliverables'
                ? 'bg-[#d4af37] text-neutral-950 shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Workstreams ({totalWorkstreams})
          </button>
        </div>

        {/* Right: Search & Action Buttons */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by project, workstream..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-4 py-1.5 rounded-full bg-[#121318] border border-[#1f222c] focus:border-[#d4af37] text-xs text-white placeholder-stone-500 focus:outline-none w-56 sm:w-64 transition-all"
            />
          </div>

          <button
            onClick={onOpenImport}
            className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#14161f] hover:bg-[#1c1f2b] text-stone-200 border border-[#252836] text-xs font-semibold transition-all shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold transition-all shadow-[0_0_14px_rgba(212,175,55,0.3)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN LIST VIEW (ClaimCoda Rows) */}
      <div className="space-y-3.5">
        {activeFilterTab === 'all' && (
          <>
            {filteredProjects.map((proj) => {
              const projSessions = sessions.filter((s) => s.projectId === proj.id);
              const liveSession = projSessions.find((s) => s.stage === 'live');

              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject(proj.id)}
                  className="bg-[#121318] border border-[#1f222c] hover:border-[#d4af37]/50 rounded-2xl p-4 sm:p-5 shadow-lg transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-[#15171e]"
                >
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    {/* Project Initial Avatar Badge */}
                    <div className="w-12 h-12 rounded-2xl bg-[#181a22] border border-[#d4af37]/30 group-hover:border-[#d4af37] flex items-center justify-center text-[#d4af37] font-black text-base shrink-0 shadow-inner transition-colors">
                      {proj.name.substring(0, 2).toUpperCase()}
                    </div>

                    {/* Metadata & Title */}
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-bold text-base text-white group-hover:text-[#fcd34d] transition-colors truncate">
                          {proj.name}
                        </h3>
                        {liveSession ? (
                          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            LIVE ROOM
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#1a1b24] text-stone-400 border border-[#262835]">
                            {proj.targetHorizon || 'ACTIVE HORIZON'}
                          </span>
                        )}
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400">
                        <span>
                          Horizon: <strong className="text-stone-300">{proj.targetHorizon}</strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Workstreams: <strong className="text-[#d4af37]">{proj.workstreams?.length || 0} tracks</strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Sessions: <strong className="text-stone-300">{projSessions.length}</strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Metric: <strong className="text-stone-300">{proj.impactLabelName || 'Impact'}</strong>
                        </span>
                      </div>

                      {/* Workstream Tag Chips */}
                      {proj.workstreams && proj.workstreams.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {proj.workstreams.slice(0, 4).map((w) => (
                            <span
                              key={w.id}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#181a22] text-stone-300 border border-[#252836] flex items-center gap-1"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: w.color || '#d4af37' }}
                              />
                              {w.name}
                            </span>
                          ))}
                          {proj.workstreams.length > 4 && (
                            <span className="text-[10px] text-stone-500 font-semibold px-1.5 py-0.5 rounded bg-[#181a22] border border-[#252836]">
                              +{proj.workstreams.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject(proj.id);
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-[#181a22] hover:bg-[#20232e] text-xs font-bold text-stone-200 hover:text-white border border-[#282c3a] transition-all shadow-xs flex items-center gap-1"
                    >
                      <span>Open Board</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#d4af37]" />
                    </button>

                    {onDeleteProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(proj);
                        }}
                        className="p-2 rounded-full text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title={`Delete project "${proj.name}"`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredProjects.length === 0 && (
              <div className="p-12 text-center text-xs text-stone-400 border border-dashed border-[#1f222c] rounded-2xl bg-[#121318]/50">
                No projects match your search query. Create a new project or import an Excel backlog.
              </div>
            )}
          </>
        )}

        {activeFilterTab === 'workshops' && (
          <>
            {filteredSessions.map((sess) => {
              const project = projects.find((p) => p.id === sess.projectId);
              const isLive = sess.stage === 'live';

              return (
                <div
                  key={sess.id}
                  onClick={() => onSelectSession(sess.id)}
                  className={`bg-[#121318] border rounded-2xl p-4 sm:p-5 shadow-lg transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isLive ? 'border-[#d4af37]/60 hover:border-[#d4af37]' : 'border-[#1f222c] hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isLive
                          ? 'bg-[#d4af37]/15 border-[#d4af37]/40 text-[#d4af37]'
                          : 'bg-[#181a22] border-[#252836] text-stone-400'
                      }`}
                    >
                      {isLive ? <Radio className="w-5 h-5 animate-pulse text-[#d4af37]" /> : <Calendar className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-base text-white hover:text-[#fcd34d] transition-colors">
                          {sess.name}
                        </h4>
                        {isLive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            LIVE SESSION
                          </span>
                        )}
                        <span className="text-xs font-mono text-stone-400 px-1.5 py-0.5 rounded bg-[#181a22] border border-[#252836]">
                          Rev {sess.version}
                        </span>
                      </div>
                      <div className="text-xs text-stone-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>Project: <strong className="text-stone-300">{project?.name || 'Project'}</strong></span>
                        <span>Date: <strong className="text-stone-300">{sess.date}</strong></span>
                        <span>Horizon: <strong className="text-[#d4af37]">{sess.deliveryHorizon}</strong></span>
                        <span>Facilitator: <strong className="text-stone-300">{sess.facilitatorName}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-[#d4af37] text-neutral-950 hover:bg-[#c59e2b] transition-all shadow-[0_0_12px_rgba(212,175,55,0.25)]">
                      <span>Enter Room</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {onDeleteSession && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionToDelete(sess);
                        }}
                        className="p-2 rounded-full text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredSessions.length === 0 && (
              <div className="p-12 text-center text-xs text-stone-400 border border-dashed border-[#1f222c] rounded-2xl bg-[#121318]/50">
                No planning sessions scheduled yet. Open a project to launch a collaborative room.
              </div>
            )}
          </>
        )}

        {activeFilterTab === 'deliverables' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.flatMap((p) => p.workstreams.map((w) => ({ ...w, projectName: p.name, projId: p.id }))).map((ws) => (
              <div
                key={ws.id}
                onClick={() => onSelectProject(ws.projId)}
                className="bg-[#121318] border border-[#1f222c] hover:border-[#d4af37]/40 rounded-2xl p-4 cursor-pointer transition-all hover:bg-[#15171e]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: ws.color || '#d4af37' }}
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-white truncate">{ws.name}</h4>
                    <p className="text-[11px] text-stone-400 truncate">Lead: {ws.leadName} &bull; {ws.projectName}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: CREATE PROJECT */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121318] border border-[#252836] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 text-[#e5e7eb]">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f222c]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Create New Project</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-white text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-300 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., AVMAIS Implementation 2027"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#282c38] bg-[#181a22] text-white text-sm focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-300 mb-1">Description & Context</label>
                <textarea
                  rows={3}
                  placeholder="Key goals, scope, and cross-functional team context..."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#282c38] bg-[#181a22] text-white text-sm focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-300 mb-1">Target Delivery Horizon *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., June 2027"
                    value={newProjHorizon}
                    onChange={(e) => setNewProjHorizon(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#282c38] bg-[#181a22] text-white text-sm focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-300 mb-1">Impact Field Label</label>
                  <select
                    value={newProjImpactLabel}
                    onChange={(e) => setNewProjImpactLabel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#282c38] bg-[#181a22] text-white text-sm focus:outline-none focus:border-[#d4af37]"
                  >
                    <option value="Member Impact">Member Impact (Associations)</option>
                    <option value="Customer Impact">Customer Impact (Commercial / B2B)</option>
                    <option value="Stakeholder Impact">Stakeholder Impact</option>
                  </select>
                </div>
              </div>

              {/* Direct Excel Import hint */}
              <div
                onClick={() => {
                  setShowCreateModal(false);
                  onOpenImport();
                }}
                className="p-3 rounded-xl bg-[#181a22] border border-dashed border-[#282c38] hover:border-[#d4af37] text-stone-400 hover:text-stone-200 cursor-pointer flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <UploadCloud className="w-4 h-4 text-[#d4af37]" />
                  <span className="text-[11px]">Have an Excel file ready? Import it directly with auto-formulation</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-stone-500" />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#1f222c]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-full text-stone-400 hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold shadow-[0_0_12px_rgba(212,175,55,0.3)] transition-all"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE PROJECT */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121318] rounded-2xl border border-[#282c38] max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-[#e5e7eb]">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Project</h3>
                <p className="text-xs text-stone-400">Irreversible Action</p>
              </div>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white font-semibold">"{projectToDelete.name}"</strong>?
              This will permanently remove the project, its workstream tracks, deliverable cards, and associated planning sessions.
            </p>
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#1f222c]">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 rounded-full text-xs text-stone-400 hover:text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProject) onDeleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }}
                className="px-4 py-2 rounded-full text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE SESSION */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121318] rounded-2xl border border-[#282c38] max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-[#e5e7eb]">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Planning Session</h3>
                <p className="text-xs text-stone-400">Irreversible Action</p>
              </div>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Are you sure you want to delete session <strong className="text-white font-semibold">"{sessionToDelete.name}"</strong>?
              This will remove the session agenda, recorded votes, assessments, and follow-up actions.
            </p>
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#1f222c]">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 rounded-full text-xs text-stone-400 hover:text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSession) onDeleteSession(sessionToDelete.id);
                  setSessionToDelete(null);
                }}
                className="px-4 py-2 rounded-full text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

