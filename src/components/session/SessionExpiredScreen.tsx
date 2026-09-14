import React from 'react';
import { Lock, Clock } from 'lucide-react';

interface SessionExpiredScreenProps {
  sessionName?: string;
  projectName?: string;
}

// Shown when someone opens a workshop share link (?join=<token>) after the
// facilitator has already closed that session. Previously the join
// request just failed quietly with a generic "invitation link is no
// longer valid" toast — indistinguishable from a broken/mistyped link.
// This is the explicit "this session has ended" state Britto asked for.
export const SessionExpiredScreen: React.FC<SessionExpiredScreenProps> = ({
  sessionName,
  projectName,
}) => {
  return (
    <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
          <span className="absolute inset-0 rounded-full bg-stone-700/30" />
          <span className="relative flex items-center justify-center w-16 h-16 rounded-full bg-stone-800 border border-stone-700">
            <Lock className="w-7 h-7 text-stone-400" />
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-stone-400 bg-stone-800/80 px-3 py-1 rounded-full mb-5">
          <Clock className="w-3 h-3" /> Session Ended
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          This workshop has already wrapped up
        </h1>
        <p className="text-sm text-stone-400 leading-relaxed">
          {sessionName ? (
            <>
              <strong className="text-stone-300">{sessionName}</strong>
              {projectName ? <> ({projectName})</> : null} was closed by the facilitator, so this
              invitation link is no longer active.
            </>
          ) : (
            <>This invitation link is no longer active — the session it points to has been closed.</>
          )}
        </p>
        <p className="text-xs text-stone-500 mt-4">
          If you need the outcomes from this session, reach out to whoever facilitated it.
        </p>
      </div>
    </div>
  );
};
