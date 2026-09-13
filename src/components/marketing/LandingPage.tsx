import React from 'react';
import {
  FileSpreadsheet,
  Vote,
  Radio,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { BananaLogo } from '../common/BananaLogo';
import { SignInScreen } from '../auth/SignInScreen';
import { LiquidBackground } from './LiquidBackground';

/**
 * The public, signed-out landing page — what a visitor sees before they've
 * signed in or opened a share link. Replaces what used to be a bare Clerk
 * SignIn box floating alone on a black screen: this explains what Banana OS
 * actually is (left column) and docks sign-in to the side (right column),
 * per the redesign Britto asked for. See App.tsx's auth gate for where this
 * is mounted — guests arriving via a share link never see this at all.
 */
export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#e5e7eb] font-sans relative overflow-hidden">
      <LiquidBackground />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 relative z-10">
        {/* Brand mark */}
        <div className="flex items-center gap-2.5 mb-12 sm:mb-16">
          <div className="w-10 h-10 rounded-xl bg-[#14161f] border border-[#d4af37]/40 flex items-center justify-center shadow-xs">
            <BananaLogo className="w-6 h-6" />
          </div>
          <span className="font-black text-xl tracking-tight text-white">Banana OS</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-start">
          {/* Left: what this is */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121318] border border-[#d4af37]/30 text-[11px] font-bold text-[#fcd34d] tracking-wide uppercase mb-6">
              <Sparkles className="w-3 h-3" />
              Product & Scrum Planning Workshops
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black tracking-tight text-white leading-[1.1] mb-5">
              Run backlog grooming and sprint ceremonies like an actual
              workshop — not a spreadsheet fight.
            </h1>

            <p className="text-sm sm:text-base text-stone-400 leading-relaxed mb-10">
              Import the messy backlog spreadsheet you already have, prioritize
              it live with your team on a call, and walk out with decisions
              everyone actually agrees on — not just whatever's left in your
              inbox after the meeting.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 shrink-0 rounded-xl bg-[#121318] border border-[#1f222c] flex items-center justify-center">
                  <FileSpreadsheet className="w-4.5 h-4.5 text-[#d4af37]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white mb-0.5">Import your backlog as-is</div>
                  <div className="text-xs text-stone-500 leading-relaxed">
                    Drop in the Excel sheet you already have. Safe re-import
                    means updating it later won't duplicate or clobber anything.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 shrink-0 rounded-xl bg-[#121318] border border-[#1f222c] flex items-center justify-center">
                  <Vote className="w-4.5 h-4.5 text-[#d4af37]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white mb-0.5">Decide together, live</div>
                  <div className="text-xs text-stone-500 leading-relaxed">
                    Delphi-style planning poker for priority, effort, and
                    disposition — votes reveal at once, so no one anchors on
                    whoever talks first.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 shrink-0 rounded-xl bg-[#121318] border border-[#1f222c] flex items-center justify-center">
                  <Radio className="w-4.5 h-4.5 text-[#d4af37]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white mb-0.5">One link, everyone's in</div>
                  <div className="text-xs text-stone-500 leading-relaxed">
                    Share a single workshop link. Guests need no account and no
                    setup — they're in the room within seconds, and every
                    decision updates live on everyone's screen.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-10 pt-6 border-t border-[#1f222c] text-[11px] text-stone-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-stone-600" />
              Built for the Product Managers and Scrum Masters actually
              running the meeting — not another system of record.
            </div>
          </div>

          {/* Right: sign in, docked to the side */}
          <div className="w-full lg:sticky lg:top-16">
            <div className="bg-[#121318] border border-[#1f222c] rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-white">Sign in to your workspace</h2>
                <p className="text-xs text-stone-500 mt-1">
                  For facilitators and workspace owners.
                </p>
              </div>
              <SignInScreen />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
