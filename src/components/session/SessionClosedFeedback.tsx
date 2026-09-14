import React, { useState } from 'react';
import {
  Angry,
  Frown,
  Meh,
  Smile,
  Laugh,
  PartyPopper,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { PlanningSession, Project } from '../../types';
import { persistenceService } from '../../services/PersistenceService';

interface SessionClosedFeedbackProps {
  session: PlanningSession;
  project: Project;
  totalCards: number;
  selectedCount: number;
  actionsCount: number;
  onBackToSession: () => void;
}

// What a non-facilitator participant sees once a session is closed, in
// place of the full Results & Export page (that stays facilitator-only —
// see SessionResults.tsx). Deliberately light: a thank-you, a few headline
// numbers so people know the workshop actually went somewhere, and an
// anonymous 1-5 smiley rating. No exports, no card-by-card breakdown, no
// "Reopen Session" control — those are facilitator tools.
const RATING_OPTIONS: { value: number; label: string; icon: React.ElementType; color: string }[] = [
  { value: 1, label: 'Not great', icon: Angry, color: 'text-red-500' },
  { value: 2, label: 'Could be better', icon: Frown, color: 'text-orange-500' },
  { value: 3, label: 'Okay', icon: Meh, color: 'text-amber-500' },
  { value: 4, label: 'Good', icon: Smile, color: 'text-emerald-500' },
  { value: 5, label: 'Great', icon: Laugh, color: 'text-emerald-400' },
];

export const SessionClosedFeedback: React.FC<SessionClosedFeedbackProps> = ({
  session,
  project,
  totalCards,
  selectedCount,
  actionsCount,
  onBackToSession,
}) => {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedRating || submitting) return;
    setSubmitting(true);
    try {
      await persistenceService.submitSessionFeedback(session.id, selectedRating);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
          <span className="absolute inset-0 rounded-full bg-[#d4af37]/20 animate-ping" />
          <span className="relative flex items-center justify-center w-20 h-20 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40">
            <PartyPopper className="w-10 h-10 text-[#d4af37]" />
          </span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
          Thanks for the feedback!
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#d4af37]" />
          That's a wrap on {session.name}.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full mb-6">
        <Lock className="w-3 h-3" /> Session Closed
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-2">
        Thank you for participating!
      </h1>
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-8">
        {session.name} has wrapped up. Here's a quick look at what the group landed on.
      </p>

      {/* High-level summary — deliberately just headline numbers, not the
          full card-by-card breakdown facilitators see on Results & Export. */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-[#2e303a] rounded-xl p-4">
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">{totalCards}</div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Deliverables Reviewed</div>
        </div>
        <div className="bg-white dark:bg-[#20222a] border border-emerald-500/30 rounded-xl p-4">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{selectedCount}</div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Selected</div>
        </div>
        <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-[#2e303a] rounded-xl p-4">
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">{actionsCount}</div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Follow-Up Actions</div>
        </div>
      </div>

      {/* Anonymous 1-5 smiley rating */}
      <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-[#2e303a] rounded-2xl p-6">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">
          How was this session?
        </h2>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-5">Your response is anonymous.</p>

        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6">
          {RATING_OPTIONS.map(({ value, label, icon: Icon, color }) => {
            const isSelected = selectedRating === value;
            return (
              <button
                key={value}
                type="button"
                title={label}
                onClick={() => setSelectedRating(value)}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-[#d4af37] bg-[#d4af37]/10 scale-110'
                    : 'border-transparent hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${isSelected ? color : 'text-stone-400 dark:text-stone-500'}`} />
                <span className="text-[9px] font-semibold text-stone-400 dark:text-stone-500">{value}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedRating || submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 text-sm font-bold shadow-md transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>

        <button type="button" onClick={onBackToSession} className="w-full mt-3 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
          Skip and go back
        </button>
      </div>
    </div>
  );
};
