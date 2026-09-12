import React, { useState } from 'react';
import {
  FolderKanban,
  Calendar,
  Clock,
  Plus,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  CheckCircle,
  Database,
  Radio,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  Users,
  Compass,
  TrendingUp,
  Share2,
} from 'lucide-react';
import { Project, PlanningSession, Workspace, User } from '../../types';

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<PlanningSession | null>(null);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* SaaS Workspace Hero Header */}
      <div className="bg-gradient-to-br from-stone-900 to-[#181920] border border-stone-800 rounded-2xl p-6 sm:p-8 text-stone-100 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#fcd34d] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>{workspace.organization} &bull; Strategic Planning Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Collaborative Planning Hub
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 max-w-2xl leading-relaxed">
              Transform unstructured spreadsheets and delivery backlogs into live, facilitated working sessions with real-time Delphi poker estimation and multi-dimensional alignment.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={onOpenImport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#22242e] hover:bg-[#2c2e3a] text-xs font-semibold text-stone-200 border border-stone-700 transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#d4af37]" />
              Import Excel
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold transition-colors shadow-md"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          </div>
        </div>

        {/* Minimal Metric Strip */}
        <div className="mt-6 pt-5 border-t border-stone-800 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-400">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              Active Projects: <strong className="text-white font-semibold">{projects.length}</strong>
            </div>
            <div>
              Workstream Tracks: <strong className="text-white font-semibold">{totalWorkstreams}</strong>
            </div>
            <div>
              Planning Sessions: <strong className="text-white font-semibold">{sessions.length}</strong>
              {liveSessions.length > 0 && (
                <span className="ml-1.5 text-emerald-400 font-bold">({liveSessions.length} live)</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-stone-500 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Workspace Sync Ready</span>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#d4af37]" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Projects & Roadmaps
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
              {projects.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => {
            const projSessions = sessions.filter((s) => s.projectId === proj.id);
            const liveSession = projSessions.find((s) => s.stage === 'live');

            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className="group relative bg-white dark:bg-[#20222a] border border-stone-200 dark:border-[#2e303a] hover:border-[#d4af37] dark:hover:border-[#d4af37] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 dark:from-[#282a35] dark:to-[#1c1e24] border border-stone-200 dark:border-stone-700 flex items-center justify-center text-[#d4af37] font-bold text-base shadow-xs">
                      {proj.name.charAt(0)}
                    </div>
                    <div className="flex items-center gap-2">
                      {liveSession ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Room
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-[#18191c] px-2.5 py-0.5 rounded-md border border-stone-200 dark:border-stone-800">
                          {proj.targetHorizon}
                        </span>
                      )}

                      {onDeleteProject && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToDelete(proj);
                          }}
                          className="p-1 rounded-md text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title={`Delete project "${proj.name}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 group-hover:text-[#c59e2b] dark:group-hover:text-[#fcd34d] transition-colors leading-snug">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                      {proj.description || 'No project description provided.'}
                    </p>
                  </div>

                  {/* Workstream Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {proj.workstreams?.slice(0, 3).map((w) => (
                      <span
                        key={w.id}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-stone-100 dark:bg-[#18191c] text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 flex items-center gap-1"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: w.color || '#d4af37' }}
                        />
                        {w.name}
                      </span>
                    ))}
                    {(proj.workstreams?.length || 0) > 3 && (
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-[#18191c] text-stone-400">
                        +{proj.workstreams.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span>{projSessions.length} session(s)</span>
                  <div className="flex items-center gap-1 font-semibold text-[#d4af37] group-hover:translate-x-1 transition-transform">
                    <span>Open Overview</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Create Project Card */}
          <div
            onClick={() => setShowCreateModal(true)}
            className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-[#d4af37] dark:hover:border-[#d4af37] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-stone-50/40 dark:bg-[#18191c]/40 hover:bg-[#d4af37]/5 min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-[#d4af37] mb-3 shadow-xs">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
              Create New Project
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-xs">
              Define target delivery horizon, workstreams, impact metric, and deliverables.
            </p>
            <span className="mt-3 text-xs font-bold text-[#b45309] dark:text-[#fcd34d]">
              + Start Project Setup
            </span>
          </div>
        </div>
      </div>

      {/* Planning Sessions Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#d4af37]" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Planning Sessions
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
              {sessions.length}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {sessions.map((sess) => {
            const project = projects.find((p) => p.id === sess.projectId);
            const isLive = sess.stage === 'live';

            return (
              <div
                key={sess.id}
                onClick={() => onSelectSession(sess.id)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isLive
                    ? 'bg-amber-500/5 dark:bg-[#20222a] border-[#d4af37] shadow-xs'
                    : 'bg-white dark:bg-[#20222a] border-stone-200 dark:border-[#2e303a] hover:border-stone-400'
                }`}
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div
                    className={`p-3 rounded-xl flex items-center justify-center shrink-0 ${
                      isLive ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                    }`}
                  >
                    {isLive ? <Radio className="w-5 h-5 animate-pulse text-[#d4af37]" /> : <Calendar className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                        {sess.name}
                      </h4>
                      {isLive && (
                        <span className="text-[11px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Active Room
                        </span>
                      )}
                      <span className="text-xs font-mono text-stone-500 px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800">
                        Rev {sess.version}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Project: <strong className="text-stone-700 dark:text-stone-300">{project?.name || 'Project'}</strong></span>
                      <span>Meeting: <strong>{sess.date}</strong> ({sess.timeZone})</span>
                      <span>Target Horizon: <strong className="text-[#c59e2b] dark:text-[#fcd34d]">{sess.deliveryHorizon}</strong></span>
                      <span>Facilitator: <strong>{sess.facilitatorName}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                  {onDeleteSession && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(sess);
                      }}
                      className="p-2 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title={`Delete session "${sess.name}"`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#18191c] dark:bg-[#282a35] hover:bg-[#323540] text-white border border-stone-700 shadow-xs transition-colors">
                    <span>Enter Room</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#d4af37]" />
                  </button>
                </div>
              </div>
            );
          })}

          {sessions.length === 0 && (
            <div className="p-12 text-center text-xs text-stone-400 border border-dashed border-stone-300 dark:border-stone-800 rounded-2xl">
              No planning sessions scheduled yet. Open a project to launch a working session.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create New Project */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Create New Project</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Pearl Platform Rollout 2027"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Description & Context
                </label>
                <textarea
                  rows={3}
                  placeholder="Key goals, scope, and cross-functional team context..."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Target Delivery Horizon *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., June 2027"
                    value={newProjHorizon}
                    onChange={(e) => setNewProjHorizon(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Impact Field Label
                  </label>
                  <select
                    value={newProjImpactLabel}
                    onChange={(e) => setNewProjImpactLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:border-[#d4af37]"
                  >
                    <option value="Member Impact">Member Impact (Associations)</option>
                    <option value="Customer Impact">Customer Impact (Commercial / B2B)</option>
                    <option value="Stakeholder Impact">Stakeholder Impact</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold shadow-md transition-colors"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Project Confirmation */}
      {projectToDelete && (
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
              Are you sure you want to delete <strong className="text-stone-900 dark:text-stone-100 font-semibold">"{projectToDelete.name}"</strong>?
              This will permanently remove the project, its workstreams, all deliverable cards, and associated planning sessions.
            </p>
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 rounded-lg text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProject) {
                    onDeleteProject(projectToDelete.id);
                  }
                  setProjectToDelete(null);
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

      {/* Modal: Delete Session Confirmation */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#20222a] rounded-2xl border border-stone-200 dark:border-stone-700 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Delete Planning Session</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">Irreversible Action</p>
              </div>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Are you sure you want to delete session <strong className="text-stone-900 dark:text-stone-100 font-semibold">"{sessionToDelete.name}"</strong>?
              This will remove the session agenda, recorded votes, assessments, and follow-up actions.
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
    </div>
  );
};
