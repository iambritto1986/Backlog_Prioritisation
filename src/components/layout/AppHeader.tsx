import React from 'react';
import { useUser, useClerk, UserButton } from '@clerk/clerk-react';
import {
  ChevronRight,
  LogOut,
  Radio,
} from 'lucide-react';
import { User, Role, Project, PlanningSession } from '../../types';
import { BrandLogo } from '../common/BrandLogo';

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
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser,
  activeProject,
  currentProject,
  activeSession,
  currentSession,
  activeView = 'home',
  onNavigateHome,
  onNavigateOverview,
  onNavigateSession,
}) => {
  // Real facilitators/owners are signed in via Clerk and get the real
  // UserButton (profile, sign-out). Guests (joined via a share link, see
  // App.tsx's auth gate) never have a Clerk session, so they get a plain
  // badge showing who they're in the room as — there's nothing to "switch"
  // to anymore now that auth is real, so the old persona-switcher dropdown
  // that used to list every seed user is gone.
  const { isSignedIn } = useUser();
  const { signOut } = useClerk();

  const project = activeProject || currentProject || null;
  const session = activeSession || currentSession || null;
  const isInsideProject = activeView !== 'home' && !!project;

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
            title="Return to TalonSync Projects Hub"
          >
            <div className="w-8 h-8 rounded-xl bg-[#14161f] border border-[#d4af37]/40 flex items-center justify-center shadow-xs group-hover:border-[#d4af37] group-hover:shadow-[0_0_12px_rgba(212,175,55,0.25)] transition-all">
              <BrandLogo className="w-5 h-5" />
            </div>
            <span className="gold-text font-black text-base tracking-tight group-hover:brightness-125 transition-[filter]">
              TalonSync
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

        {/* Right: Actions & Identity */}
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

          {/* Identity: Clerk UserButton for real sign-ins, static badge for guests.
              Two SEPARATE controls, deliberately: the UserButton avatar opens
              Clerk's own popover (profile/account management — its internal
              trigger, not something this file's markup can attach to), and
              the Sign Out button next to it is a plain <button> wired
              directly to Clerk's signOut() — no popover, no portal, no
              click-target guesswork, just an explicit control that always
              works and is always visible as its own affordance. */}
          {isSignedIn ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-[#121318] border border-[#1f222c] hover:border-[#d4af37]/60 transition-all shadow-xs">
                <UserButton
                  appearance={{
                    variables: {
                      colorPrimary: '#d4af37',
                      colorBackground: '#121318',
                      colorText: '#e5e7eb',
                      colorTextSecondary: '#a8a29e',
                      colorInputBackground: '#18191c',
                      colorInputText: '#e5e7eb',
                      borderRadius: '0.75rem',
                    },
                    elements: {
                      // avatarBox alone only sizes the circular image — Clerk's
                      // own trigger button around it (userButtonBox /
                      // userButtonTrigger) keeps its default padding and a
                      // reserved-width layout regardless, which read as a big
                      // empty gap between the avatar and the name span next to
                      // it. Zeroing those out makes the button hug the avatar
                      // exactly, so gap-2 on the parent pill is the only
                      // spacing between the avatar and the name.
                      avatarBox: 'w-7 h-7',
                      userButtonBox: 'flex-none w-7 h-7 flex items-center justify-center',
                      userButtonTrigger: 'p-0 m-0 w-7 h-7 rounded-full focus:shadow-none',
                      userButtonOuterIdentifier: 'hidden',
                      userButtonPopoverCard: 'bg-[#121318] border border-[#1f222c] shadow-2xl',
                      userButtonPopoverMain: 'bg-[#121318]',
                      userButtonPopoverActionButton: 'text-[#e5e7eb] hover:bg-[#1e202e]',
                      userButtonPopoverActionButtonText: 'text-[#e5e7eb]',
                      userButtonPopoverActionButtonIcon: 'text-[#a8a29e]',
                      userButtonPopoverFooter: 'hidden',
                      userPreviewMainIdentifier: 'text-[#e5e7eb]',
                      userPreviewSecondaryIdentifier: 'text-[#a8a29e]',
                    },
                  }}
                />
                <span className="font-semibold text-white max-w-[90px] sm:max-w-[120px] truncate text-xs">
                  {currentUser.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                title="Sign out"
                aria-label="Sign out"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#121318] border border-[#1f222c] text-stone-400 hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121318] border border-[#1f222c] text-xs text-stone-200 shadow-xs">
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
                Guest · {getRoleLabel(currentUser.role)}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
