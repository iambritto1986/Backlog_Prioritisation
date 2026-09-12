import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Moon,
  Sun,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  ExternalLink,
  Layers,
  Radio,
  FileSpreadsheet,
  Menu,
  X,
  FolderKanban,
  Kanban,
  CheckSquare,
  Sparkles,
  SlidersHorizontal,
  HelpCircle,
  Keyboard,
  Database,
  ChevronRight,
  Compass,
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
  isDark,
  isDarkTheme,
  onToggleTheme,
  connectionStatus = 'saved',
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const availableUsers = authService.getAvailableUsers();

  const project = activeProject || currentProject || null;
  const session = activeSession || currentSession || null;
  const darkActive = isDark ?? isDarkTheme ?? true;

  // Resolve current active tab
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
    if (onTabChange) {
      try {
        onTabChange(target);
      } catch (e) {
        console.error('Error in onTabChange:', e);
      }
    }
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

  const handleChecklistClick = () => {
    setShowToolsMenu(false);
    if (onOpenChecklist) onOpenChecklist();
    if (onOpenVerification) onOpenVerification();
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'saving':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Saving...
          </span>
        );
      case 'conflict':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Conflict
          </span>
        );
      case 'offline':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-800 text-stone-300 border border-stone-700">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
            Offline
          </span>
        );
      case 'saved':
      default:
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Saved
          </span>
        );
    }
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
    <header className="bg-[#121316] text-stone-100 border-b border-[#24262f] sticky top-0 z-50 select-none shadow-md">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Left: AlignCraft Brand & Breadcrumbs */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo & Product Name */}
          <div
            onClick={() => handleNav('home')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2a2c38] to-[#1c1d24] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] font-black tracking-wider text-sm shadow-sm group-hover:border-[#d4af37] group-hover:shadow-[#d4af37]/20 transition-all">
              <Sparkles className="w-4 h-4 text-[#d4af37]" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white group-hover:text-[#fcd34d] transition-colors">
                  AlignCraft
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.2 rounded bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30">
                  Studio
                </span>
              </div>
              <div className="text-[10px] text-stone-400 leading-none">
                Product Planner & Backlog Prioritization
              </div>
            </div>
          </div>

          {/* Smart Breadcrumb Trail */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-stone-400 border-l border-stone-800 pl-4">
            <button
              onClick={() => handleNav('home')}
              className="hover:text-stone-200 transition-colors truncate max-w-[120px]"
            >
              Workspace
            </button>
            {project && (
              <>
                <ChevronRight className="w-3 h-3 text-stone-600 shrink-0" />
                <button
                  onClick={() => handleNav('project')}
                  className={`hover:text-stone-200 transition-colors truncate max-w-[180px] font-medium ${
                    currentTab === 'project' ? 'text-white font-semibold' : ''
                  }`}
                >
                  {project.name}
                </button>
              </>
            )}
            {session && (currentTab === 'session' || currentTab === 'results') && (
              <>
                <ChevronRight className="w-3 h-3 text-stone-600 shrink-0" />
                <span className="text-[#fcd34d] font-semibold truncate max-w-[190px]">
                  {session.name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Center/Right: Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => handleNav('home')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'home'
                ? 'bg-[#22242e] text-white shadow-xs border border-stone-700'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            Workspace
          </button>
          <button
            onClick={() => handleNav('project')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'project'
                ? 'bg-[#22242e] text-white shadow-xs border border-stone-700'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            Project Overview
          </button>
          <button
            onClick={() => handleNav('board')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'board'
                ? 'bg-[#22242e] text-white shadow-xs border border-stone-700'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            Working Board
          </button>
          <button
            onClick={() => handleNav('session')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              currentTab === 'session'
                ? 'bg-[#22242e] text-[#fcd34d] shadow-xs border border-[#d4af37]/40'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-[#d4af37]" />
            Session Room
            {session && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => handleNav('results')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'results'
                ? 'bg-[#22242e] text-white shadow-xs border border-stone-700'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            Results & Exports
          </button>
          <button
            onClick={() => handleNav('import')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              currentTab === 'import'
                ? 'bg-[#22242e] text-white shadow-xs border border-stone-700'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#d4af37]" />
            Import Excel
          </button>
        </nav>

        {/* Far Right: Tools, Persona Switcher & Theme */}
        <div className="flex items-center gap-2.5">
          {/* Status Badge */}
          <div className="hidden sm:block">{getStatusBadge()}</div>

          {/* Settings & Diagnostics Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 border border-stone-800 transition-colors"
              title="Settings, Diagnostics & PRD Verification"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {showToolsMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-[#1c1e26] border border-stone-700 rounded-xl shadow-2xl py-2 z-50 text-xs animate-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-stone-800 text-stone-400 font-semibold uppercase tracking-wider text-[10px]">
                  Workspace Utilities & Diagnostics
                </div>

                <div className="py-1">
                  <button
                    onClick={handleChecklistClick}
                    className="w-full text-left px-3 py-2 text-stone-200 hover:bg-[#282a35] flex items-center gap-2.5 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
                    <div className="flex-1">
                      <div className="font-semibold text-white flex items-center justify-between">
                        <span>PRD Acceptance Verification</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#d4af37]/20 text-[#fcd34d]">
                          12/12
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400">
                        View compliance matrix & checks
                      </div>
                    </div>
                  </button>

                  {onResetData && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onResetData();
                      }}
                      className="w-full text-left px-3 py-2 text-stone-200 hover:bg-[#282a35] flex items-center gap-2.5 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 text-rose-400" />
                      <div>
                        <div className="font-semibold text-white">Reset Demo Backlog</div>
                        <div className="text-[11px] text-stone-400">Restore default projects & sessions</div>
                      </div>
                    </button>
                  )}
                </div>

                <div className="px-3 py-2 border-t border-stone-800 text-[11px] text-stone-500 flex items-center justify-between">
                  <span>AlignCraft v1.0</span>
                  <span className="font-mono text-emerald-400">Client Persistence Active</span>
                </div>
              </div>
            )}
          </div>

          {/* Persona Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#1c1e26] hover:bg-[#242630] border border-stone-700 text-xs text-stone-200 transition-colors shadow-xs"
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                style={{ backgroundColor: currentUser.avatarColor }}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-semibold text-white leading-tight truncate max-w-[90px]">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-[#d4af37] leading-tight">
                  {getRoleLabel(currentUser.role)}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-[#1c1e26] border border-stone-700 rounded-xl shadow-2xl py-2 z-50 animate-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-stone-800">
                  <div className="text-xs font-semibold text-stone-200">Workshop Collaboration Roles</div>
                  <div className="text-[11px] text-stone-400">
                    Switch persona to test facilitator synchronization, voting, and role permissions.
                  </div>
                </div>
                <div className="py-1">
                  {availableUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleUserSelect(u)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#282a35] transition-colors ${
                        currentUser.id === u.id ? 'bg-[#282a35] text-white' : 'text-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-xs"
                          style={{ backgroundColor: u.avatarColor }}
                        >
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-white flex items-center gap-1.5">
                            {u.name}
                            {u.isVerified && (
                              <span className="text-[10px] text-emerald-400 font-mono">✓ Verified</span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-400">{getRoleLabel(u.role)}</div>
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

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 border border-stone-800 transition-colors"
            title={darkActive ? 'Switch to Warm Light theme' : 'Switch to Matte Charcoal Dark theme'}
          >
            {darkActive ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {showMobileMenu && (
        <div className="md:hidden bg-[#18191f] border-b border-stone-800 px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => handleNav('home')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
              currentTab === 'home' ? 'bg-[#242630] text-white font-bold' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <span>Workspace</span>
            <span className="text-[10px] text-stone-400">Dashboard</span>
          </button>
          <button
            onClick={() => handleNav('project')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
              currentTab === 'project' ? 'bg-[#242630] text-white font-bold' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <span>Project Overview</span>
            <span className="text-[10px] text-stone-400">Backlog & Workstreams</span>
          </button>
          <button
            onClick={() => handleNav('board')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
              currentTab === 'board' ? 'bg-[#242630] text-white font-bold' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <span>Working Board</span>
            <span className="text-[10px] text-stone-400">Interactive Kanban</span>
          </button>
          <button
            onClick={() => handleNav('session')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
              currentTab === 'session' ? 'bg-[#242630] text-[#fcd34d] font-bold' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#d4af37]" />
              Session Room
            </span>
            <span className="text-[10px] text-stone-400">Live Prioritization</span>
          </button>
          <button
            onClick={() => handleNav('results')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
              currentTab === 'results' ? 'bg-[#242630] text-white font-bold' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <span>Session Results</span>
            <span className="text-[10px] text-stone-400">Outcome & Export</span>
          </button>
          <button
            onClick={() => handleNav('import')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
              currentTab === 'import' ? 'bg-[#242630] text-white font-bold' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#d4af37]" />
              Import Wizard
            </span>
            <span className="text-[10px] text-stone-400">Excel / CSV</span>
          </button>
        </div>
      )}
    </header>
  );
};
