import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Radio,
  RotateCcw,
  CheckCircle2,
  FolderKanban,
  Sparkles,
} from 'lucide-react';
import { User, Role, Project, PlanningSession } from '../../types';
import { authService } from '../../services/AuthService';
import { BananaLogo } from '../common/BananaLogo';

export interface AppHeaderProps {
  currentUser: User;
  onUserChange?: (user: User) => void;
  onSwitchUser?: (user: User) => void;
  activeProject?: Project | null;
  currentProject?: Project | null;
  activeSession?: PlanningSession | null;
  currentSession?: PlanningSession | null;
  activeView?: string;
  onNavigateHome?: () => void;
  onNavigateOverview?: () => void;
  onNavigateBoard?: () => void;
  onNavigateSession?: () => void;
  onNavigateResults?: () => void;
  onOpenImport?: () => void;
  onResetData?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser,
  onUserChange,
  onSwitchUser,
  activeProject,
  currentProject,
  activeSession,
  currentSession,
  activeView = 'home',
  onNavigateHome,
  onNavigateOverview,
  onNavigateSession,
  onResetData,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const availableUsers = authService.getAvailableUsers();

  const project = activeProject || currentProject || null;
  const session = activeSession || currentSession || null;
  const isInsideProject = activeView !== 'home' && !!project;

  const handleUserSelect = (user: User) => {
    if (onUserChange) onUserChange(user);
    if (onSwitchUser) onSwitchUser(user);
    setShowUserMenu(false);
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'workspace_admin':
        return 'Workspace Admin';
      case 'project_lead':
        return 'Project Lead';
      case 'facilitator':
        return 'Facilitator';
      case 'editor':
        return 'Editor';
      case 'contributor':
        return 'Contributor';
      case 'viewer':
        return 'Viewer (Read-only)';
    }
  };

  return (
    <header className="bg-[#0b0c10] text-[#e5e7eb] border-b border-[#1f222c] sticky top-0 z-50 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-15">
        {/* Left: Brand & Reactive Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
            title="Return to Banana OS Projects Hub"
          >
            <div className="w-8 h-8 rounded-xl bg-[#14161f] border border-[#d4af37]/40 flex items-center justify-center shadow-xs group-hover:border-[#d4af37] group-hover:shadow-[0_0_12px_rgba(212,175,55,0.25)] transition-all">
              <BananaLogo className="w-5 h-5" />
            </div>
            <span className="font-black text-base tracking-tight text-white group-hover:text-[#fcd34d] transition-colors">
              Banana OS
            </span>
          </div>

          {/* Breadcrumb Trail */}
          {isInsideProject && (
            <div className="flex items-center gap-2 text-xs font-semibold min-w-0 truncate pl-2 border-l border-[#1f222c]">
              <ChevronRight className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <button
                onClick={onNavigateOverview}
                className="text-stone-300 hover:text-white transition-colors truncate max-w-[200px] sm:max-w-[300px]"
                title={project.name}
              >
                {project.name}
              </button>

              {activeView === 'session_room' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <span className="text-[#fcd34d] flex items-center gap-1.5 shrink-0">
                    <Radio className="w-3 h-3 text-[#d4af37] animate-pulse" />
                    Facilitation Room
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions & Persona Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Context Action Button */}
          {isInsideProject && activeView !== 'session_room' && session && (
            <button
              onClick={onNavigateSession}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#161822] hover:bg-[#1e202e] text-[#fcd34d] border border-[#d4af37]/40 hover:border-[#d4af37] text-xs font-bold transition-all shadow-xs"
            >
              <Radio className="w-3.5 h-3.5 text-[#d4af37] animate-pulse" />
              <span>Enter Workshop Room</span>
            </button>
          )}

          {/* Persona Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121318] hover:bg-[#1a1b24] border border-[#1f222c] hover:border-[#d4af37]/40 text-xs text-stone-200 transition-all shadow-xs"
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-xs"
                style={{ backgroundColor: currentUser.avatarColor }}
              >
                {currentUser.name.charAt(0)}
              </div>
              <span className="font-semibold text-white max-w-[90px] sm:max-w-[120px] truncate">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-[#d4af37] hidden md:inline">
                ({currentUser.role})
              </span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-[#121318] border border-[#252836] rounded-2xl shadow-2xl py-2 z-50 animate-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-[#1f222c]">
                  <div className="text-xs font-bold text-white">Active Facilitator & Role</div>
                  <div className="text-[11px] text-stone-400">
                    Switch persona to test live voting permissions and views.
                  </div>
                </div>
                <div className="py-1">
                  {availableUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleUserSelect(u)}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-[#1a1b24] transition-colors ${
                        currentUser.id === u.id ? 'bg-[#1a1b24] text-white' : 'text-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                          style={{ backgroundColor: u.avatarColor }}
                        >
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            {u.name}
                            {u.isVerified && (
                              <span className="text-[10px] text-emerald-400 font-mono">✓</span>
                            )}
                          </div>
                          <div className="text-[10px] text-stone-400">{getRoleLabel(u.role)}</div>
                        </div>
                      </div>
                      {currentUser.id === u.id && (
                        <CheckCircle2 className="w-4 h-4 text-[#d4af37]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reset Demo Data Button */}
          {onResetData && (
            <button
              onClick={onResetData}
              className="p-2 rounded-full bg-[#121318] hover:bg-[#1a1b24] text-stone-400 hover:text-[#fcd34d] border border-[#1f222c] transition-colors"
              title="Reset sample projects & workshop data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
