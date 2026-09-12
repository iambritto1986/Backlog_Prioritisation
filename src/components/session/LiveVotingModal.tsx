import React, { useState, useEffect, useMemo } from 'react';
import {
  Vote,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  Check,
  Award,
  Layers,
  BarChart2,
  HelpCircle,
} from 'lucide-react';
import { VotingRound, VotingType, User, PresenceState, Priority, WorkshopDisposition, Effort } from '../../types';

interface LiveVotingModalProps {
  activeVoting: VotingRound | null;
  currentUser: User;
  peers: PresenceState[];
  isFacilitator: boolean;
  onCastVote: (vote: string) => void;
  onRevealVotes: () => void;
  onConfirmDecision: (resultValue: string, points?: number) => void;
  onCancelVoting: () => void;
  onStartNewRound?: (type: VotingType, cardId: string, cardTitle: string) => void;
}

const STORY_POINT_OPTIONS = ['1', '2', '3', '5', '8', '13', '21', '?'];
const PRIORITY_OPTIONS: Priority[] = ['P0', 'P1', 'P2', 'P3'];
const DISPOSITION_OPTIONS: WorkshopDisposition[] = ['Selected', 'Reserve', 'Defer', 'Drop', 'Needs Validation'];
const EFFORT_OPTIONS = ['XS', 'Small', 'Medium', 'Large', 'XL'];

export const LiveVotingModal: React.FC<LiveVotingModalProps> = ({
  activeVoting,
  currentUser,
  peers,
  isFacilitator,
  onCastVote,
  onRevealVotes,
  onConfirmDecision,
  onCancelVoting,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [customConsensus, setCustomConsensus] = useState<string>('');

  if (!activeVoting) return null;

  // Determine current user's vote
  const myVote = activeVoting.votes[currentUser.id]?.vote || null;

  // Active participants (current user + online peers)
  const allParticipants = useMemo(() => {
    const list: Array<{ id: string; name: string; avatarColor: string; role: string }> = [
      { id: currentUser.id, name: currentUser.name, avatarColor: currentUser.avatarColor, role: currentUser.role },
    ];
    peers.forEach((p) => {
      if (!list.some((u) => u.id === p.userId)) {
        list.push({ id: p.userId, name: p.userName, avatarColor: p.avatarColor, role: p.role });
      }
    });
    return list;
  }, [currentUser, peers]);

  const totalParticipants = Math.max(allParticipants.length, 1);
  const votedCount = Object.keys(activeVoting.votes).length;
  const isRevealed = activeVoting.status === 'revealed' || activeVoting.status === 'closed';

  // Calculate stats
  interface VoteEntry {
    userId: string;
    userName: string;
    vote: string;
    timestamp: string;
  }
  const votesArray: VoteEntry[] = Object.values(activeVoting.votes);

  // Numerical calculation for Story Points
  const storyPointStats = useMemo(() => {
    if (activeVoting.type !== 'story_points' || votesArray.length === 0) return null;
    const numericVotes = votesArray
      .map((v) => parseFloat(v.vote))
      .filter((n) => !isNaN(n));
    if (numericVotes.length === 0) return null;

    const sum = numericVotes.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / numericVotes.length;
    const min = Math.min(...numericVotes);
    const max = Math.max(...numericVotes);

    // Find closest fibonacci option
    const validFibs = [1, 2, 3, 5, 8, 13, 21];
    const closest = validFibs.reduce((prev, curr) =>
      Math.abs(curr - avg) < Math.abs(prev - avg) ? curr : prev
    );

    return { avg, min, max, closest, totalNumericVotes: numericVotes.length };
  }, [activeVoting, votesArray]);

  // Vote distribution map
  const distribution = useMemo(() => {
    const dist: Record<string, number> = {};
    votesArray.forEach((v) => {
      dist[v.vote] = (dist[v.vote] || 0) + 1;
    });
    return dist;
  }, [votesArray]);

  // Mode / Suggested consensus
  const suggestedConsensus = useMemo(() => {
    if (activeVoting.type === 'story_points') {
      return storyPointStats ? String(storyPointStats.closest) : '';
    }
    // Highest vote count
    let maxCount = 0;
    let modeVal = '';
    (Object.entries(distribution) as [string, number][]).forEach(([val, count]) => {
      if (count > maxCount) {
        maxCount = count;
        modeVal = val;
      }
    });
    return modeVal;
  }, [activeVoting.type, storyPointStats, distribution]);

  // Sync custom consensus choice with suggested consensus
  useEffect(() => {
    if (suggestedConsensus && !customConsensus) {
      setCustomConsensus(suggestedConsensus);
    }
  }, [suggestedConsensus]);

  // Handle final confirmation
  const handleConfirm = () => {
    const finalVal = customConsensus || suggestedConsensus || myVote || (activeVoting.type === 'story_points' ? '5' : 'P1');
    const pts = activeVoting.type === 'story_points' ? (storyPointStats ? Math.round(storyPointStats.avg * 10) / 10 : parseFloat(finalVal) || 0) : undefined;
    onConfirmDecision(finalVal, pts);
  };

  const getOptionsForType = () => {
    switch (activeVoting.type) {
      case 'story_points':
        return STORY_POINT_OPTIONS;
      case 'proposed_priority':
        return PRIORITY_OPTIONS;
      case 'disposition':
        return DISPOSITION_OPTIONS;
      case 'effort':
      case 'tshirt':
        return EFFORT_OPTIONS;
      default:
        return PRIORITY_OPTIONS;
    }
  };

  const options = getOptionsForType();

  // Minimized floating pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#1c1e24] text-stone-100 border-2 border-[#d4af37] shadow-2xl hover:scale-105 transition-all"
        >
          <div className="w-6 h-6 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37]">
            <Vote className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div className="text-left">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">
              Live Voting ({votedCount}/{totalParticipants})
            </div>
            <div className="text-xs font-bold text-white max-w-[160px] truncate">
              {activeVoting.cardTitle}
            </div>
          </div>
          <ChevronUp className="w-4 h-4 text-stone-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-full max-w-[440px] sm:max-w-[480px] p-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-[#1a1c23] border-2 border-[#d4af37]/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-stone-100 backdrop-blur-md">
        {/* Floating Header */}
        <div className="bg-[#222530] px-4 py-3 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/50 flex items-center justify-center text-[#d4af37] shadow-xs">
              <Vote className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#d4af37]">
                  {activeVoting.type === 'story_points' ? 'Story Points Poker' : 'Priority Consensus Round'}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  isRevealed ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {isRevealed ? 'Revealed' : 'Voting Live'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white leading-tight truncate max-w-[280px]">
                {activeVoting.cardTitle}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              title="Minimize window"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            {isFacilitator && (
              <button
                onClick={onCancelVoting}
                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors"
                title="Cancel voting round"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Voting Progress Bar */}
        <div className="px-4 py-2.5 bg-[#20222b] border-b border-stone-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1.5 font-medium text-stone-300">
              <Users className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Participation Status:</span>
            </div>
            <div className="font-bold text-[#fcd34d]">
              {votedCount} of {totalParticipants} Voted ({Math.round((votedCount / totalParticipants) * 100)}%)
            </div>
          </div>
          <div className="w-full h-1.5 rounded-full bg-stone-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#d4af37] to-amber-300 transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, Math.round((votedCount / totalParticipants) * 100))}%` }}
            />
          </div>

          {/* Participant Avatars & Live Status */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {allParticipants.map((p) => {
              const hasVoted = Boolean(activeVoting.votes[p.id]);
              const voteRecord = activeVoting.votes[p.id];

              return (
                <div
                  key={p.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-all ${
                    hasVoted
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold'
                      : 'bg-stone-800/60 border-stone-700/60 text-stone-400'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: p.avatarColor }}
                  />
                  <span className="truncate max-w-[80px]">{p.name}</span>
                  {hasVoted ? (
                    isRevealed && voteRecord ? (
                      <span className="ml-0.5 px-1 rounded bg-[#d4af37]/20 text-[#fcd34d] font-bold font-mono">
                        {voteRecord.vote}
                      </span>
                    ) : (
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    )
                  ) : (
                    <Clock className="w-2.5 h-2.5 text-stone-500 shrink-0 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Voting Options Pad */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-300">
              {activeVoting.type === 'story_points' ? 'Select Story Points:' : 'Select Priority / Choice:'}
            </label>
            {myVote ? (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Your vote: <strong className="text-white font-mono">{myVote}</strong>
              </span>
            ) : (
              <span className="text-xs text-amber-400 animate-pulse">Cast your vote below</span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {options.map((opt) => {
              const isSelected = myVote === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onCastVote(opt)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border shadow-xs flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-[#d4af37] text-neutral-950 border-[#d4af37] ring-2 ring-white/50 scale-102 shadow-md'
                      : 'bg-[#242632] hover:bg-[#2e3140] text-stone-200 border-stone-700 hover:border-stone-500'
                  }`}
                >
                  <span className="font-mono text-sm">{opt}</span>
                  {activeVoting.type === 'story_points' && opt !== '?' && (
                    <span className={`text-[9px] ${isSelected ? 'text-neutral-900 font-semibold' : 'text-stone-400'}`}>
                      pts
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Results section if Revealed */}
          {isRevealed && (
            <div className="mt-3 p-3 rounded-xl bg-[#232530] border border-[#d4af37]/40 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#fcd34d]">
                  <Award className="w-4 h-4 text-[#d4af37]" />
                  <span>Consolidated Voting Results</span>
                </div>
                {activeVoting.type === 'story_points' && storyPointStats && (
                  <div className="text-xs font-mono font-bold text-white bg-stone-800 px-2 py-0.5 rounded">
                    Average: <span className="text-[#fcd34d]">{Math.round(storyPointStats.avg * 10) / 10} pts</span>
                  </div>
                )}
              </div>

              {/* Vote Distribution Bar Chart */}
              <div className="space-y-1.5 pt-1">
                {(Object.entries(distribution) as [string, number][]).map(([val, count]) => {
                  const pct = Math.round((count / Math.max(1, votedCount)) * 100);
                  const isTop = val === suggestedConsensus;
                  return (
                    <div key={val} className="text-xs">
                      <div className="flex items-center justify-between text-stone-300 text-[11px] mb-0.5">
                        <span className="font-mono font-bold">{val}</span>
                        <span>{count} vote{count > 1 ? 's' : ''} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded bg-stone-800 overflow-hidden">
                        <div
                          className={`h-full rounded ${isTop ? 'bg-[#d4af37]' : 'bg-stone-600'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Consensus Choice Selector (Facilitator can adjust before applying) */}
              {isFacilitator && (
                <div className="pt-2 border-t border-stone-700/80 flex items-center justify-between gap-3 text-xs">
                  <span className="text-stone-300 font-medium">Apply Decision:</span>
                  <select
                    value={customConsensus || suggestedConsensus}
                    onChange={(e) => setCustomConsensus(e.target.value)}
                    className="px-2.5 py-1 rounded bg-[#18191c] border border-stone-600 text-xs font-bold text-[#fcd34d] focus:outline-none focus:border-[#d4af37]"
                  >
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt} {opt === suggestedConsensus ? '(Suggested Consensus)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="p-3 bg-[#1e2028] border-t border-stone-800 flex items-center justify-between gap-2">
          <div className="text-[11px] text-stone-400">
            {!isRevealed ? (
              <span>Votes are blind until facilitator reveals.</span>
            ) : (
              <span>Confirming writes consensus to deliverable card.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isFacilitator && !isRevealed && (
              <button
                type="button"
                onClick={onRevealVotes}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold transition-colors shadow-xs"
              >
                <Eye className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Reveal Results</span>
              </button>
            )}

            {isFacilitator && isRevealed && (
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold transition-all shadow-md"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Confirm Decision</span>
              </button>
            )}

            {!isFacilitator && (
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
              >
                Minimize
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
