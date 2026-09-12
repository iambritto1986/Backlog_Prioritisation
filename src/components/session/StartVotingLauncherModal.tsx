import React, { useState } from 'react';
import {
  Vote,
  Hash,
  Layers,
  Sparkles,
  Award,
  X,
  Clock,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { Card, VotingType } from '../../types';

interface StartVotingLauncherModalProps {
  card: Card;
  isOpen: boolean;
  onClose: () => void;
  onStartVoting: (type: VotingType, customPrompt?: string) => void;
}

export const StartVotingLauncherModal: React.FC<StartVotingLauncherModalProps> = ({
  card,
  isOpen,
  onClose,
  onStartVoting,
}) => {
  const [selectedType, setSelectedType] = useState<VotingType>('proposed_priority');
  const [customPrompt, setCustomPrompt] = useState('');

  if (!isOpen) return null;

  const handleLaunch = () => {
    onStartVoting(selectedType, customPrompt.trim() || undefined);
    onClose();
  };

  const votingModes: Array<{
    type: VotingType;
    title: string;
    description: string;
    badge: string;
    optionsPreview: string;
    icon: any;
  }> = [
    {
      type: 'proposed_priority',
      title: 'Priority Consensus Round',
      description: 'Vote on strategic importance (P0 Critical, P1 High, P2 Med, P3 Low). Consolidates to suggested priority.',
      badge: 'Strategic Alignment',
      optionsPreview: 'P0, P1, P2, P3',
      icon: Award,
    },
    {
      type: 'story_points',
      title: 'Story Points / Planning Poker',
      description: 'Estimate complexity and delivery sizing using Fibonacci sequence. Automatically averages and suggests closest point consensus.',
      badge: 'Delivery Sizing',
      optionsPreview: '1, 2, 3, 5, 8, 13, 21 pts',
      icon: Hash,
    },
    {
      type: 'disposition',
      title: 'Workshop Disposition',
      description: 'Collective alignment on whether to commit immediately, keep in reserve, defer, or drop.',
      badge: 'Commitment Decision',
      optionsPreview: 'Selected, Reserve, Defer, Drop',
      icon: Layers,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1c1e24] border-2 border-[#d4af37]/60 rounded-2xl max-w-lg w-full p-6 text-stone-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/50 flex items-center justify-center text-[#d4af37]">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">
                Facilitator Tool
              </span>
              <h3 className="text-base font-bold text-white">Start Interactive Voting Round</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Target Callout */}
        <div className="p-3 rounded-xl bg-[#232530] border border-stone-800 text-xs">
          <span className="text-stone-400 font-medium">Deliverable target: </span>
          <span className="font-bold text-white font-mono">{card.id}</span> &mdash;{' '}
          <span className="text-[#fcd34d] font-semibold">{card.title}</span>
        </div>

        {/* Voting Type Selection */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">
            Select Voting Scope:
          </label>
          <div className="space-y-2">
            {votingModes.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedType === mode.type;
              return (
                <div
                  key={mode.type}
                  onClick={() => setSelectedType(mode.type)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#262834] border-[#d4af37] ring-1 ring-[#d4af37] shadow-md'
                      : 'bg-[#20222a] border-stone-800 hover:border-stone-700 text-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{mode.title}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-400 font-mono">
                            {mode.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                          {mode.description}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[10px] font-mono font-bold text-[#fcd34d] bg-stone-800/80 px-2 py-0.5 rounded border border-stone-700">
                        {mode.optionsPreview}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Optional Custom Prompt */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-300">
            Voting Prompt or Discussion Question (Optional):
          </label>
          <input
            type="text"
            placeholder={
              selectedType === 'story_points'
                ? 'e.g. Estimate points assuming no breaking legacy refactor...'
                : 'e.g. Agree on strategic horizon priority for Q4...'
            }
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#16181e] border border-stone-700 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#d4af37]"
          />
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLaunch}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold shadow-md transition-colors"
          >
            <Vote className="w-4 h-4" />
            <span>Launch Live Voting Round</span>
          </button>
        </div>
      </div>
    </div>
  );
};
