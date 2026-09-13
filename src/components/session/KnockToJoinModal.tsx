import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { ShareWorkshopBundle } from '../../utils/shareBundle';
import { Project, PlanningSession } from '../../types';
import { ShieldCheck, DoorOpen, Loader2, XCircle } from 'lucide-react';

interface KnockToJoinModalProps {
  payload: any;
  onApproved: (payload: any, guestName: string) => void;
  onCancel: () => void;
}

export const KnockToJoinModal: React.FC<KnockToJoinModalProps> = ({ payload, onApproved, onCancel }) => {
  const [guestName, setGuestName] = useState('');
  const [status, setStatus] = useState<'idle' | 'knocking' | 'approved' | 'rejected'>('idle');
  const [socket, setSocket] = useState<Socket | null>(null);

  const proj: Project | undefined = payload?.project || payload?.p;
  const sess: PlanningSession | undefined = payload?.session || payload?.s;

  useEffect(() => {
    const s = io(window.location.origin);
    setSocket(s);

    s.on('knock_approved', () => {
      setStatus('approved');
      setTimeout(() => {
        onApproved(payload, guestName);
      }, 1000);
    });

    s.on('knock_rejected', () => {
      setStatus('rejected');
    });

    return () => {
      s.disconnect();
    };
  }, [payload, guestName, onApproved]);

  const handleKnock = () => {
    if (!guestName.trim() || !socket || !sess) return;
    setStatus('knocking');
    
    // The guest knocks on the session's specific room
    socket.emit('knock', {
      sessionId: sess.id,
      guestId: socket.id,
      guestName: guestName.trim(),
    });
  };

  if (!proj || !sess) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1C1C1C] border border-[#d4af37]/30 rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-[#2A2A2A] border border-[#d4af37]/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-[#d4af37]" />
          </div>
          
          <h2 className="text-2xl font-bold text-[#EAEAEA] mb-2">Private Workshop</h2>
          <p className="text-sm text-[#A0A0A0] mb-6">
            You are requesting to join <strong>{sess.title}</strong> hosted in <strong>{proj.name}</strong>.
            The facilitator must approve your entry.
          </p>

          {status === 'idle' && (
            <div className="space-y-4">
              <div>
                <label className="block text-left text-sm text-[#A0A0A0] mb-1">Enter your name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-[#111111] border border-[#333333] rounded-lg px-4 py-3 text-[#EAEAEA] placeholder-[#555555] focus:outline-none focus:border-[#d4af37]"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleKnock()}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 px-4 bg-transparent border border-[#333333] text-[#A0A0A0] rounded-lg hover:text-[#EAEAEA] hover:border-[#555555] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleKnock}
                  disabled={!guestName.trim()}
                  className="flex-1 py-3 px-4 bg-[#d4af37] text-black font-semibold rounded-lg hover:bg-[#b5952f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <DoorOpen className="w-5 h-5" />
                  Knock to Join
                </button>
              </div>
            </div>
          )}

          {status === 'knocking' && (
            <div className="py-8 flex flex-col items-center">
              <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin mb-4" />
              <h3 className="text-lg font-medium text-[#EAEAEA]">Waiting for Facilitator...</h3>
              <p className="text-[#A0A0A0] text-sm mt-2">Please wait while the host approves your request.</p>
              <button
                onClick={onCancel}
                className="mt-6 text-sm text-[#d4af37] hover:underline"
              >
                Cancel Request
              </button>
            </div>
          )}

          {status === 'approved' && (
            <div className="py-8 flex flex-col items-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4 text-green-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-medium text-[#EAEAEA]">Access Granted</h3>
              <p className="text-[#A0A0A0] text-sm mt-2">Entering workshop...</p>
            </div>
          )}

          {status === 'rejected' && (
            <div className="py-8 flex flex-col items-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-400">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-medium text-[#EAEAEA]">Request Denied</h3>
              <p className="text-[#A0A0A0] text-sm mt-2">The facilitator declined your request to join.</p>
              <button
                onClick={onCancel}
                className="mt-6 py-2 px-6 bg-[#333333] text-[#EAEAEA] rounded-lg hover:bg-[#444444] transition-colors"
              >
                Close
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
