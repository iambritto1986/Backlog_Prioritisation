import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  ChevronDown,
  Radio,
  FileSpreadsheet,
  Menu,
  X,
  ShieldCheck,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  Kanban,
  LayoutDashboard,
  Award,
} from 'lucide-react';
import { User, Role, Project, PlanningSession } from '../../types';
import { authService } from '../../services/AuthService';

export interface AppHeaderProps {
  currentUser: User;
  onUserChange?: (user: User) => void;
  onSwitchUser?: (user: User) => void;
  activeProject?: Project | null;
  currentProject?: Project | null;
  activeSession?: PlanningSession | null;
  currentSession?: PlanningSession | null;
  activeTab?: 'home' | 'project' | 'session' | 'board' | 'results' | 'import';
  activeView?: string;
  onTabChange?: (tab: 'home' | 'project' | 'session' | 'board' | 'results' | 'import') => void;
  onNavigateHome?: () => void;
  onNavigateOverview?: () => void;
  onNavigateBoard?: () => void;
  onNavigateSession?: () => void;
  onNavigateResults?: () => void;
  onOpenImport?: () => void;
  onOpenVerification?: () => void;
  onOpenChecklist?: () => void;
  onResetData?: () => void;
  isDark?: boolean;
  isDarkTheme?: boolean;
  onToggleTheme: () => void;
  connectionStatus?: 'saved' | 'saving' | 'offline' | 'conflict';
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser,
  onUserChange,
  onSwitchUser,
  activeProject,
  currentProject,
  activeSession,
  currentSession,
  activeTab,
  activeView,
  onTabChange,
  onNavigateHome,
  onNavigateOverview,
  onNavigateBoard,
  onNavigateSession,
  onNavigateResults,
  onOpenImport,
  onOpenVerification,
  onOpenChecklist,
  onResetData,
  connectionStatus = 'saved',
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const availableUsers = authService.getAvailableUsers();

  const project = activeProject || currentProject || null;
  const session = activeSession || currentSession || null;

  const currentTab: 'home' | 'project' | 'session' | 'board' | 'results' | 'import' =
    activeTab ||
    (activeView === 'home'
      ? 'home'
      : activeView === 'project_overview'
      ? 'project'
      : activeView === 'session_room'
      ? 'session'
      : activeView === 'project_board'
      ? 'board'
      : activeView === 'session_results'
      ? 'results'
      : activeView === 'import_wizard'
      ? 'import'
      : 'home');

  const handleNav = (target: 'home' | 'project' | 'session' | 'board' | 'results' | 'import') => {
    setShowMobileMenu(false);
    if (onTabChange) onTabChange(target);
    if (target === 'home' && onNavigateHome) onNavigateHome();
    else if (target === 'project' && onNavigateOverview) onNavigateOverview();
    else if (target === 'session' && onNavigateSession) onNavigateSession();
    else if (target === 'board' && onNavigateBoard) onNavigateBoard();
    else if (target === 'results' && onNavigateResults) onNavigateResults();
    else if (target === 'import' && onOpenImport) onOpenImport();
  };

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
    <header className="bg-[#0b0c10] text-stone-100 border-b border-[#1f222c] sticky top-0 z-50 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Left: Brand Identity (ClaimCoda style) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            onClick={() => handleNav('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#14161f] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] font-bold text-sm shadow-sm group-hover:border-[#d4af37] transition-all">
              AC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-[#e5e7eb] group-hover:text-[#fcd34d] transition-colors">
                  AlignCraft Workspace
                </span>
              </div>
              <div className="text-[11px] text-stone-400 font-medium">
                Product Planner & Workshop Studio
              </div>
            </div>
          </div>
        </div>

        {/* Center: Navigation Pills */}
        <nav className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => handleNav('home')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentTab === 'home'
                ? 'bg-[#d4af37] text-neutral-950 shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                : 'bg-[#14161f] text-stone-300 hover:text-white hover:bg-[#1c1f2b] border border-[#252836]'
            }`}
          >
            Workspace
          </button>

          <button
            onClick={() => handleNav('project')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentTab === 'project'
                ? 'bg-[#d4af37] text-neutral-950 shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                : 'bg-[#14161f] text-stone-300 hover:text-white hover:bg-[#1c1f2b] border border-[#252836]'
            }`}
          >
            Project
          </button>

          <button
            onClick={() => handleNav('board')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentTab === 'board'
                ? 'bg-[#d4af37] text-neutral-950 shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                : 'bg-[#14161f] text-stone-300 hover:text-white hover:bg-[#1c1f2b] border border-[#252836]'
            }`}
          >
            Board
          </button>

          <button
            onClick={() => handleNav('session')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'session'
                ? 'bg-[#d4af37] text-neutral-950 shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                : 'bg-[#14161f] text-stone-300 hover:text-white hover:bg-[#1c1f2b] border border-[#252836]'
            }`}
          >
            <Radio className="w-3 h-3 text-[#fcd34d]" />
            Session Room
            {session && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => handleNav('results')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentTab === 'results'
                ? 'bg-[#d4af37] text-neutral-950 shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                : 'bg-[#14161f] text-stone-300 hover:text-white hover:bg-[#1c1f2b] border border-[#252836]'
            }`}
          >
            Results
          </button>

          <button
            onClick={() => handleNav('import')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'import'
                ? 'bg-[#d4af37] text-neutral-950 shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                : 'bg-[#14161f] text-stone-300 hover:text-white hover:bg-[#1c1f2b] border border-[#252836]'
            }`}
          >
            <FileSpreadsheet className="w-3 h-3 text-[#d4af37]" />
            Import Excel
          </button>
        </nav>

        {/* Right: Persona Switcher & Actions */}
        <div className="flex items-center gap-2.5">
          {/* PRD Verification Pill */}
          <button
            onClick={() => {
              if (onOpenChecklist) onOpenChecklist();
              if (onOpenVerification) onOpenVerification();
            }}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#14161f] hover:bg-[#1c1f2b] border border-[#252836] hover:border-[#d4af37]/50 text-xs font-semibold text-stone-300 hover:text-white transition-all shadow-xs"
            title="Open PRD Verification & Acceptance Checklist"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>PRD Verification</span>
          </button>

          {/* Persona Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#14161f] hover:bg-[#1c1f2b] border border-[#252836] text-xs text-stone-200 transition-all shadow-xs"
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ backgroundColor: currentUser.avatarColor }}
              >
                {currentUser.name.charAt(0)}
              </div>
              <span className="font-semibold text-white max-w-[100px] truncate">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-[#d4af37] hidden sm:inline">
                ({currentUser.role})
              </span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-[#14161f] border border-[#252836] rounded-2xl shadow-2xl py-2 z-50 animate-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-[#252836]">
                  <div className="text-xs font-bold text-stone-200">Active Persona</div>
                  <div className="text-[11px] text-stone-400">
                    Switch user role to test permissions & collaborative voting.
                  </div>
                </div>
                <div className="py-1">
                  {availableUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleUserSelect(u)}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-[#1c1f2b] transition-colors ${
                        currentUser.id === u.id ? 'bg-[#1c1f2b] text-white' : 'text-stone-300'
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
                              <span className="text-[10px] text-emerald-400 font-mono">✓ Verified</span>
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
              className="p-2 rounded-full bg-[#14161f] hover:bg-[#1c1f2b] text-stone-400 hover:text-rose-400 border border-[#252836] transition-colors"
              title="Reset workspace demo data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {showMobileMenu && (
        <div className="md:hidden bg-[#111218] border-b border-[#252836] px-4 py-3 space-y-1.5 animate-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => handleNav('home')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${
              currentTab === 'home' ? 'bg-[#d4af37] text-neutral-950 font-bold' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            Workspace Dashboard
          </button>
          <button
            onClick={() => handleNav('project')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${
              currentTab === 'project' ? 'bg-[#d4af37] text-neutral-950 font-bold' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            Project Overview
          </button>
          <button
            onClick={() => handleNav('board')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${
              currentTab === 'board' ? 'bg-[#d4af37] text-neutral-950 font-bold' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            Working Board
          </button>
          <button
            onClick={() => handleNav('session')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between ${
              currentTab === 'session' ? 'bg-[#d4af37] text-neutral-950 font-bold' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <span>Session Room</span>
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
          </button>
          <button
            onClick={() => handleNav('results')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${
              currentTab === 'results' ? 'bg-[#d4af37] text-neutral-950 font-bold' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            Results & Exports
          </button>
          <button
            onClick={() => handleNav('import')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between ${
              currentTab === 'import' ? 'bg-[#d4af37] text-neutral-950 font-bold' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <span>Import Excel</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#d4af37]" />
          </button>
        </div>
      )}
    </header>
  );
};
