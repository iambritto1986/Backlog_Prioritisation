import React, { useState, useEffect } from 'react';
import { Project, PlanningSession, Role, User } from '../../types';
import { authService } from '../../services/AuthService';
import {
  Share2,
  Copy,
  Check,
  Calendar,
  Clock,
  Users,
  FileSpreadsheet,
  Link,
  ShieldCheck,
  Sparkles,
  Mail,
  ExternalLink,
  Radio,
  CheckCircle2,
} from 'lucide-react';

interface ShareSessionModalProps {
  project: Project;
  session?: PlanningSession;
  sessions: PlanningSession[];
  currentUser: User;
  deliverablesCount: number;
  onClose: () => void;
  onEnterSession?: (sessionId: string) => void;
}

export const ShareSessionModal: React.FC<ShareSessionModalProps> = ({
  project,
  session: initialSession,
  sessions,
  currentUser,
  deliverablesCount,
  onClose,
  onEnterSession,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    initialSession?.id || sessions[0]?.id || ''
  );
  const [selectedRole, setSelectedRole] = useState<Role>('contributor');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInviteText, setCopiedInviteText] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const activeSession = sessions.find((s) => s.id === selectedSessionId) || initialSession || sessions[0];

  useEffect(() => {
    generateLink();
  }, [selectedSessionId, selectedRole]);

  const generateLink = async () => {
    setIsGenerating(true);
    try {
      const invite = await authService.createInvitation(
        project.id,
        selectedSessionId,
        selectedRole
      );
      setInviteCode(invite.code);
      const url = `${window.location.origin}/?join=${invite.code}`;
      setInviteLink(url);
    } catch (e) {
      console.error('Failed to generate invite', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const getInviteSnippet = () => {
    const sessionName = activeSession?.name || 'Collaborative Planning Session';
    const date = activeSession?.date || 'Upcoming Date';
    const tz = activeSession?.timeZone || 'EDT';
    const facilitator = activeSession?.facilitatorName || currentUser.name;
    const horizon = activeSession?.deliveryHorizon || project.targetHorizon;

    return `🗓️ Invitation to Project Planning Session: ${sessionName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Date & Time: ${date} (${tz})
🎯 Facilitator: ${facilitator}
📌 Target Delivery: ${horizon}
📊 Scope: ${deliverablesCount} Deliverables imported for workshop review
🔗 Join Planning Board: ${inviteLink}

Please review our backlog and join the live session to assess priorities, validate ownership, and align on decisions.`;
  };

  const handleCopyInviteText = () => {
    navigator.clipboard.writeText(getInviteSnippet());
    setCopiedInviteText(true);
    setTimeout(() => setCopiedInviteText(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1e2027] border border-stone-200 dark:border-stone-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Share Planning Session & Workspace
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Send stakeholders a direct link to what you are building and prioritizing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 text-base font-bold"
          >
            ✕
          </button>
        </div>

        {/* Session Selector (if multiple exist) */}
        {sessions.length > 1 && (
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Select Planning Session
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-[#d4af37]"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} &bull; {s.date} (Facilitator: {s.facilitatorName})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Session Context Digest Card */}
        {activeSession && (
          <div className="bg-stone-50 dark:bg-[#18191c] p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                {activeSession.name}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                Ready for Attendees
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-stone-600 dark:text-stone-400 pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Date: <strong>{activeSession.date}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-stone-400" />
                <span>Facilitator: <strong>{activeSession.facilitatorName}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Scope: <strong>{deliverablesCount} Deliverables</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>Horizon: <strong>{activeSession.deliveryHorizon}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Share Link & Role Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Invite Access Link
            </label>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-500">Access Level:</span>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-800 dark:text-stone-200 text-xs"
              >
                <option value="contributor">Contributor (Can Vote & Propose)</option>
                <option value="editor">Editor (Can Update Card Fields)</option>
                <option value="viewer">Viewer (Read-Only Reviewer)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Link className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                readOnly
                value={inviteLink || 'Generating link...'}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-[#18191c] text-stone-800 dark:text-stone-200 text-xs font-mono select-all focus:outline-none"
              />
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold transition-all shrink-0 shadow-sm"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Formatted Meeting Invite Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#d4af37]" />
              Calendar / Slack Invite Message
            </span>
            <button
              onClick={handleCopyInviteText}
              className="text-xs font-bold text-[#b45309] dark:text-[#fcd34d] hover:underline flex items-center gap-1"
            >
              {copiedInviteText ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Full Message</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-3 rounded-lg bg-stone-50 dark:bg-[#15161a] border border-stone-200 dark:border-stone-800 text-[11px] text-stone-700 dark:text-stone-300 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
            {getInviteSnippet()}
          </pre>
        </div>

        {/* Experience disclosure */}
        <div className="p-3 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-xs text-stone-700 dark:text-stone-300 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
          <p className="leading-normal">
            <strong>Seamless Guest Experience:</strong> People you share with do not need to invent passwords or accounts. They open the link and immediately see the clear planning board, workstreams, and deliverables for the session.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-stone-100 dark:border-stone-800">
          {activeSession && onEnterSession && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEnterSession(activeSession.id);
              }}
              className="text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Preview Live Session Room &rarr;</span>
            </button>
          )}
          <div className="ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
