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
  onOpenImport,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Architecture & Local Persistence Notice */}
      <div className="bg-[#1f2128] border border-[#d4af37]/40 rounded-xl p-4 sm:p-5 text-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
            <span className="font-bold text-sm text-white tracking-tight">
              Local-Only Persistence Foundation
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#d4af37]/20 text-[#fcd34d] border border-[#d4af37]/40 font-semibold">
              Client-Side Local Storage
            </span>
          </div>
          <p className="text-xs text-stone-300 max-w-3xl leading-relaxed">
            All projects, deliverable backlogs, and planning sessions are stored locally in browser storage using the{' '}
            <code className="text-[#fcd34d] font-mono">IPersistenceService</code> abstraction. Cross-tab synchronization uses BroadcastChannel, and service interfaces are architected for direct plug-in to Firestore or Cloud SQL backends.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenImport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#282a35] hover:bg-[#323540] text-xs font-semibold text-white border border-stone-700 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#d4af37]" />
            Import Excel Workbook
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>
      </div>

      {/* Hero / Organization Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="text-xs uppercase font-bold tracking-widest text-[#d4af37] mb-1">
            {workspace.organization} &bull; Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Collaborative Planning Hub
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
            Turn complex project spreadsheets into facilitated, structured working sessions with real-time alignment.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          Create New Project
        </button>
      </div>

      {/* Projects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#d4af37]" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">Projects You Have Access To</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
              {projects.length}
            </span>
          </div>

          <span className="text-xs text-stone-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#d4af37]" />
            Local persistence active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => {
            const projSessions = sessions.filter((s) => s.projectId === proj.id);
            const liveSession = projSessions.find((s) => s.stage === 'live');

            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className="group relative bg-white dark:bg-[#20222a] border border-stone-200 dark:border-[#2e303a] hover:border-[#d4af37] dark:hover:border-[#d4af37] rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-[#d4af37] font-bold text-base">
                      {proj.name.charAt(0)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 border border-stone-200 dark:border-stone-700">
                        Local Persistence
                      </span>
                      {liveSession ? (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Workshop
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
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
                    <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 group-hover:text-[#c59e2b] dark:group-hover:text-[#fcd34d] transition-colors">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>
                  </div>

                  {/* Workstreams tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {proj.workstreams.slice(0, 3).map((w) => (
                      <span
                        key={w.id}
                        className="text-[11px] font-medium px-2 py-0.5 rounded bg-stone-100 dark:bg-[#282a35] text-stone-600 dark:text-stone-300"
                      >
                        {w.name}
                      </span>
                    ))}
                    {proj.workstreams.length > 3 && (
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-stone-100 dark:bg-[#282a35] text-stone-500">
                        +{proj.workstreams.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span>{projSessions.length} session(s) configured</span>
                  <div className="flex items-center gap-1 font-semibold text-[#d4af37] group-hover:translate-x-1 transition-transform">
                    <span>Open Overview</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Prominent Create Project Card in Grid */}
          <div
            onClick={() => setShowCreateModal(true)}
            className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-[#d4af37] dark:hover:border-[#d4af37] rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-stone-50/50 dark:bg-[#18191c]/50 hover:bg-[#d4af37]/5 min-h-[190px]"
          >
            <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-[#d4af37] mb-3 shadow-xs">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
              Create New Project
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-xs">
              Define target delivery horizon, workstreams, impact metric, and deliverables.
            </p>
            <span className="mt-3 text-xs font-bold text-[#b45309] dark:text-[#fcd34d]">
              + Start Project Flow
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming & Active Planning Sessions */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#d4af37]" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">Planning Sessions</h2>
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
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isLive
                    ? 'bg-amber-500/5 dark:bg-[#20222a] border-[#d4af37] shadow-sm'
                    : 'bg-white dark:bg-[#20222a] border-stone-200 dark:border-[#2e303a] hover:border-stone-400'
                }`}
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div className={`p-3 rounded-lg flex items-center justify-center ${
                    isLive ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                  }`}>
                    {isLive ? <Radio className="w-5 h-5 animate-pulse text-[#d4af37]" /> : <Calendar className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
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
                      <span>Horizon: <strong className="text-[#c59e2b] dark:text-[#fcd34d]">{sess.deliveryHorizon}</strong></span>
                      <span>Facilitator: <strong>{sess.facilitatorName}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#18191c] dark:bg-[#282a35] hover:bg-[#2c2e39] text-white border border-stone-700 shadow-sm transition-colors">
                    <span>Enter Session Room</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#d4af37]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Create New Project */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
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
                  <p className="text-[10px] text-stone-400 mt-1">Separate from individual meeting dates.</p>
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

      {/* Delete Project Confirmation Modal */}
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
              This will permanently remove the project, its workstreams, all deliverable cards, and associated planning sessions from local persistence.
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
    </div>
  );
};
