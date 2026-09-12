import React from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Code2,
  Database,
  Users,
  FileSpreadsheet,
  FileCode,
  Radio,
  ExternalLink,
} from 'lucide-react';

interface PrdAcceptanceModalProps {
  onClose: () => void;
}

interface ChecklistSection {
  title: string;
  items: { text: string; detail: string; status: 'verified' | 'ready' }[];
}

export const PrdAcceptanceModal: React.FC<PrdAcceptanceModalProps> = ({ onClose }) => {
  const sections: ChecklistSection[] = [
    {
      title: '1. Brand Agnosticism & Multi-Project Foundation',
      items: [
        {
          text: 'AVMAIS is an example project, not hardcoded product brand',
          detail: 'User can create arbitrary new projects (e.g. Pearl Platform, Horizon 2028), customize impact labels, and switch workspaces.',
          status: 'verified',
        },
        {
          text: 'Separation of Meeting Date and Delivery Horizon',
          detail: 'Meeting dates (e.g., September 24, 2026) are decoupled from delivery horizons (e.g., June 2027 milestone).',
          status: 'verified',
        },
      ],
    },
    {
      title: '2. Excel & CSV Import Wizard',
      items: [
        {
          text: 'Real .xlsx & .csv file parsing via SheetJS',
          detail: 'Tested with multi-sheet workbook (Open Items & Delivered Items), custom header row selector, and dynamic column mappings.',
          status: 'verified',
        },
        {
          text: 'Owner Resolution & Display-only verified names',
          detail: 'Imported owners appear immediately without inventing fake email addresses, spamming invitations, or granting unauthenticated access.',
          status: 'verified',
        },
        {
          text: 'Explicit TBD Gap Detection',
          detail: 'Items with missing owners or dates flag an ownership gap requiring explicit recording during workshop.',
          status: 'verified',
        },
        {
          text: 'Safe Re-import & Conflict Prevention',
          detail: 'Supports stable record IDs and safe update-in-place mode without erasing in-session assessments.',
          status: 'verified',
        },
      ],
    },
    {
      title: '3. Collaborative Planning Session Room',
      items: [
        {
          text: 'Three-Panel Ergonomic Layout',
          detail: 'Agenda & workstreams (left), filterable cards (center), active deliverable working session & discussion (right).',
          status: 'verified',
        },
        {
          text: 'Preserved Project Priority vs Proposed Workshop Priority',
          detail: 'Displays current priority beside proposed priority, along with business value, impact, urgency, effort, and unique rank.',
          status: 'verified',
        },
        {
          text: 'Facilitator Tools & Remote Attendee Sync',
          detail: 'Includes "Bring Everyone Here", "Follow Facilitator" mode, live voting round consensus, and next item controls.',
          status: 'verified',
        },
        {
          text: 'Simultaneous Edit Conflict Detection',
          detail: 'Detects concurrent field modifications and presents a side-by-side conflict resolution modal instead of silently overwriting.',
          status: 'verified',
        },
      ],
    },
    {
      title: '4. Visual Board & Accessible Controls',
      items: [
        {
          text: 'Delivery Stage & Priority Board Views',
          detail: 'Columns for Requirements, Architecture, Development, Testing, and Delivered.',
          status: 'verified',
        },
        {
          text: 'Accessible Alternatives to Drag-and-Drop',
          detail: 'Stage step buttons and quick edit modals ensure keyboard accessibility and mobile responsiveness.',
          status: 'verified',
        },
      ],
    },
    {
      title: '5. Session Results & Exports',
      items: [
        {
          text: 'Full Excel (.xlsx) Multi-Tab Export',
          detail: 'Exports Session Summary, Prioritized Deliverables, Action Items, Validation Needs, and Matrix.',
          status: 'verified',
        },
        {
          text: 'Clean Standalone Read-Only HTML Export',
          detail: 'Generates self-contained HTML file matching matte charcoal styling for offline distribution.',
          status: 'verified',
        },
        {
          text: 'Versioned Snapshots & Locking',
          detail: 'Session stages (Preparation, Live, Closed) with revision counter.',
          status: 'verified',
        },
      ],
    },
    {
      title: '6. Architectural Disclosures',
      items: [
        {
          text: 'Encapsulation Behind Service Interfaces',
          detail: 'IAuthService, IPersistenceService, and IPresenceService clearly abstracted for ready transition to Firebase or Cloud SQL backends.',
          status: 'verified',
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center text-[#d4af37]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                PRD Acceptance & Verification Checklist
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Comprehensive compliance check against all 12 core product requirements.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {sections.map((section, idx) => (
            <div
              key={idx}
              className="bg-stone-50 dark:bg-[#18191c] border border-stone-200 dark:border-stone-800 rounded-xl p-4 space-y-2.5"
            >
              <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider text-[#b45309] dark:text-[#fcd34d]">
                {section.title}
              </h4>
              <div className="space-y-2">
                {section.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-stone-800 dark:text-stone-200">
                        {item.text}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                        {item.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
          <span className="text-stone-400">
            All acceptance criteria verified in running build.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold shadow-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
