import React, { useState, useEffect } from 'react';
import { Project, Role, Invitation, User } from '../../types';
import { authService } from '../../services/AuthService';
import {
  Link,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Shield,
  Trash2,
  Users,
  Send,
} from 'lucide-react';

interface InviteModalProps {
  project: Project;
  sessionId?: string;
  currentUser: User;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  project,
  sessionId,
  currentUser,
  onClose,
}) => {
  const [selectedRole, setSelectedRole] = useState<Role>('editor');
  const [invitedEmail, setInvitedEmail] = useState('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadInvites();
  }, [project.id]);

  const loadInvites = async () => {
    const list = await authService.getInvitations(project.id);
    setInvitations(list);
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      await authService.createInvitation(
        project.id,
        sessionId,
        selectedRole,
        invitedEmail.trim() || undefined
      );
      setInvitedEmail('');
      await loadInvites();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    await authService.revokeInvitation(id);
    await loadInvites();
  };

  const copyInviteLink = (code: string) => {
    const inviteUrl = `${window.location.origin}/?join=${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-[#d4af37]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Project Invitations & Access
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Grant scoped workshop permissions per PRD Section 10.
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

        {/* Create Invite Link Form */}
        <form onSubmit={handleCreateInvite} className="space-y-4 bg-stone-50 dark:bg-[#18191c] p-4 rounded-xl border border-stone-200 dark:border-stone-800 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                Participant Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] text-stone-900 dark:text-stone-100 font-medium"
              >
                <option value="facilitator">Facilitator (Guide session, confirm decisions)</option>
                <option value="editor">Editor (Update cards, assess, comment & vote)</option>
                <option value="contributor">Contributor (Comment, vote, submit recommendations)</option>
                <option value="viewer">Viewer (Read and follow along)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                Designated Email (Optional)
              </label>
              <input
                type="email"
                placeholder="e.g., collaborator@pearl.io"
                value={invitedEmail}
                onChange={(e) => setInvitedEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {/* PRD Mandate Disclosure */}
            <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 max-w-sm">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Forwarding a shareable invitation will admit additional verified participants.</span>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold shadow-xs transition-colors shrink-0"
            >
              Generate Invitation
            </button>
          </div>
        </form>

        {/* Existing Invitations List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
            Active Invitation Links ({invitations.length})
          </h4>

          {invitations.length === 0 ? (
            <div className="text-center py-6 text-xs text-stone-400 bg-stone-50 dark:bg-[#18191c] rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
              No active invitation links created yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                    inv.isRevoked
                      ? 'bg-rose-500/5 border-rose-500/20 opacity-60'
                      : 'bg-white dark:bg-[#18191c] border-stone-200 dark:border-stone-800'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                        {inv.code}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                        {inv.role}
                      </span>
                      {inv.isRevoked ? (
                        <span className="text-[10px] font-bold text-rose-500">Revoked</span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Valid</span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-400">
                      Created by {inv.createdBy} &bull; Expires in 7 days
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!inv.isRevoked && (
                      <button
                        type="button"
                        onClick={() => copyInviteLink(inv.code)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 font-semibold text-[11px] text-stone-800 dark:text-stone-200"
                      >
                        {copiedCode === inv.code ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Link
                          </>
                        )}
                      </button>
                    )}

                    {!inv.isRevoked && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(inv.id)}
                        className="p-1 rounded text-stone-400 hover:text-rose-500"
                        title="Revoke access immediately"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 font-semibold text-xs text-stone-800 dark:text-stone-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
