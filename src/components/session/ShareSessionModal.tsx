import React, { useState, useEffect } from 'react';
import { Project, PlanningSession, Role, User, Card } from '../../types';
import { authService } from '../../services/AuthService';
import { createShareHash } from '../../utils/shareBundle';
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
  Globe,
} from 'lucide-react';

interface ShareSessionModalProps {
  project: Project;
  session?: PlanningSession;
  sessions: PlanningSession[];
  cards?: Card[];
  currentUser: User;
  deliverablesCount: number;
  onClose: () => void;
  onEnterSession?: (sessionId: string) => void;
}

export const ShareSessionModal: React.FC<ShareSessionModalProps> = ({
  project,
  session: initialSession,
  sessions,
  cards = [],
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
  const [portableHashLink, setPortableHashLink] = useState('');
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
      const sess = activeSession || initialSession || sessions[0];
      if (!sess) return;

      // Generate portable client-side compressed hash
      const hash = await createShareHash(project, sess, cards, selectedRole, currentUser.name);
      const directHashUrl = `${window.location.origin}/#workshop=${hash}`;
      setPortableHashLink(directHashUrl);

      // Try server-backed short link
      try {
        const resp = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project,
            session: sess,
            cards,
            role: selectedRole,
            invitedBy: currentUser.name,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.code) {
            setInviteCode(data.code);
            setInviteLink(`${window.location.origin}/?share=${data.code}`);
            setIsGenerating(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Server share API unavailable, using portable URL link', e);
      }

      // Default to direct portable hash URL
      setInviteCode('PORTABLE');
      setInviteLink(directHashUrl);
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
🏢 Project: ${project.name}
📅 Date & Time: ${date} (${tz})
🎯 Facilitator: ${facilitator}
📌 Target Delivery: ${horizon}
📊 Scope: ${deliverablesCount} Deliverables & ${project.workstreams?.length || 0} Workstream Tracks
🔗 Live Workshop Link: ${inviteLink}

Please open the link to join our live session, review workstream deliverables, and participate in prioritization!`;
  };

  const handleCopyInviteText = () => {
    navigator.clipboard.writeText(getInviteSnippet());
    setCopiedInviteText(true);
    setTimeout(() => setCopiedInviteText(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121318] border border-[#282c38] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-[#e5e7eb] animate-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#1f222c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#14161f] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] shadow-inner">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Share Live Workshop & Backlog
              </h3>
              <p className="text-xs text-stone-400">
                Send colleagues a direct link to <strong className="text-white">{project.name}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 text-base font-bold"
          >
            ✕
          </button>
        </div>

        {/* Session Selector (if multiple exist) */}
        {sessions.length > 1 && (
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Select Planning Session
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#282c38] bg-[#181920] text-white text-xs focus:outline-none focus:border-[#d4af37]"
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
          <div className="bg-[#181920] p-4 rounded-xl border border-[#252836] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#d4af37]" />
                {activeSession.name}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                Ready for Attendees
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-stone-300 pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Date: <strong className="text-white">{activeSession.date}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-stone-400" />
                <span>Facilitator: <strong className="text-white">{activeSession.facilitatorName}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Scope: <strong className="text-[#fcd34d]">{deliverablesCount} Deliverables</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>Horizon: <strong className="text-white">{activeSession.deliveryHorizon}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Share Link & Role Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-stone-300">
              Live Workshop Direct Link
            </label>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-400">Join Role:</span>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                className="px-2.5 py-1 rounded-lg border border-[#282c38] bg-[#181920] text-stone-200 text-xs focus:outline-none focus:border-[#d4af37]"
              >
                <option value="contributor">Contributor (Can Vote & Propose)</option>
                <option value="editor">Editor (Can Edit Backlog)</option>
                <option value="viewer">Viewer (Read-Only Observer)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Link className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                readOnly
                value={inviteLink || (isGenerating ? 'Generating portable workshop link...' : '')}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#282c38] bg-[#14161f] text-stone-200 text-xs font-mono select-all focus:outline-none focus:border-[#d4af37]"
              />
            </div>
            <button
              onClick={handleCopyLink}
              disabled={!inviteLink}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold transition-all shrink-0 shadow-md"
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
            <span className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#d4af37]" />
              Calendar / Slack Invite Snippet
            </span>
            <button
              onClick={handleCopyInviteText}
              className="text-xs font-bold text-[#fcd34d] hover:underline flex items-center gap-1"
            >
              {copiedInviteText ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied Message!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Full Message</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-3 rounded-xl bg-[#14161f] border border-[#252836] text-[11px] text-stone-300 font-mono whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
            {getInviteSnippet()}
          </pre>
        </div>

        {/* Experience disclosure */}
        <div className="p-3 rounded-xl bg-[#181920] border border-[#d4af37]/30 text-xs text-stone-300 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Cross-Device Live Access:</strong> Anyone opening this link will immediately see this exact project (<strong className="text-white">{project.name}</strong>), all its workstream tracks, and all imported deliverable cards.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-[#1f222c]">
          {activeSession && onEnterSession && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEnterSession(activeSession.id);
              }}
              className="text-xs font-semibold text-stone-400 hover:text-white flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Preview Live Session Room &rarr;</span>
            </button>
          )}
          <div className="ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#181a22] hover:bg-[#222530] text-stone-200 border border-[#282c38] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
