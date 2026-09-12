import { PresenceState } from '../types';
import { IPresenceService } from './types';
import { authService } from './AuthService';
import { SEED_USERS } from '../data/seedData';

type MessagePayload =
  | { type: 'presence_heartbeat'; state: PresenceState }
  | { type: 'cursor_move'; userId: string; cursor: { x: number; y: number } }
  | { type: 'bring_everyone'; cardId: string; workstreamId?: string; sender: string }
  | { type: 'voting_state'; voting: any }
  | { type: 'peer_leave'; userId: string };

export class PresenceService implements IPresenceService {
  private channel: BroadcastChannel | null = null;
  private currentSessionId: string | null = null;
  private myState: PresenceState;
  private peers: Map<string, PresenceState> = new Map();
  private onPresenceUpdateCb?: (peers: PresenceState[]) => void;
  private onFacilitatorCommandCb?: (cmd: { type: 'bring_everyone' | 'jump'; cardId: string; workstreamId?: string }) => void;
  private onVotingUpdateCb?: (votingState: any) => void;
  private heartbeatInterval?: any;
  private simulationInterval?: any;

  constructor() {
    const user = authService.getCurrentUser();
    this.myState = {
      userId: user.id,
      userName: user.name,
      role: user.role,
      avatarColor: user.avatarColor,
      isOnline: true,
      lastSeen: Date.now(),
      followingFacilitator: false,
    };

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('product_planner_presence');
        this.channel.onmessage = this.handleBroadcastMessage.bind(this);
      } catch (err) {
        console.warn('BroadcastChannel not available, using in-memory presence fallback', err);
      }
    }
  }

  subscribe(
    sessionId: string,
    onPresenceUpdate: (peers: PresenceState[]) => void,
    onFacilitatorCommand: (cmd: { type: 'bring_everyone' | 'jump'; cardId: string; workstreamId?: string }) => void,
    onVotingUpdate: (votingState: any) => void
  ): () => void {
    this.currentSessionId = sessionId;
    this.onPresenceUpdateCb = onPresenceUpdate;
    this.onFacilitatorCommandCb = onFacilitatorCommand;
    this.onVotingUpdateCb = onVotingUpdate;

    const user = authService.getCurrentUser();
    this.myState.userId = user.id;
    this.myState.userName = user.name;
    this.myState.role = user.role;
    this.myState.avatarColor = user.avatarColor;

    // Add initial simulated peers so the collaborative workspace has active presence
    this.initSimulatedPeers(user.id);

    // Send initial heartbeat
    this.broadcast({ type: 'presence_heartbeat', state: this.myState });

    // Periodic heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.myState.lastSeen = Date.now();
      this.broadcast({ type: 'presence_heartbeat', state: this.myState });
      this.cleanStalePeers();
    }, 4000);

    // Subtle simulation of peer activity (cursor drift & reading cards)
    this.startPeerSimulation();

    // Initial trigger
    this.notifyPeers();

    return () => {
      clearInterval(this.heartbeatInterval);
      clearInterval(this.simulationInterval);
      this.broadcast({ type: 'peer_leave', userId: this.myState.userId });
      this.peers.clear();
    };
  }

  private initSimulatedPeers(currentUserId: string) {
    const peersToInit = SEED_USERS.filter((u) => u.id !== currentUserId).slice(0, 3);
    const sampleCards = ['AVM-101', 'AVM-201', 'AVM-301', 'AVM-401'];

    peersToInit.forEach((user, idx) => {
      this.peers.set(user.id, {
        userId: user.id,
        userName: user.name,
        role: user.role,
        avatarColor: user.avatarColor,
        activeCardId: sampleCards[idx % sampleCards.length],
        cursor: { x: 300 + idx * 180, y: 220 + idx * 60 },
        isOnline: true,
        lastSeen: Date.now(),
        followingFacilitator: true,
      });
    });
  }

  private startPeerSimulation() {
    let tick = 0;
    this.simulationInterval = setInterval(() => {
      tick++;
      // Gently drift simulated peers' cursors or active viewing cards
      this.peers.forEach((peer) => {
        if (peer.userId.startsWith('user-') && peer.userId !== this.myState.userId) {
          if (peer.cursor) {
            peer.cursor = {
              x: Math.max(100, Math.min(1000, peer.cursor.x + (Math.sin(tick * 0.4) * 12))),
              y: Math.max(120, Math.min(700, peer.cursor.y + (Math.cos(tick * 0.3) * 8))),
            };
          }
          peer.lastSeen = Date.now();
        }
      });
      this.notifyPeers();
    }, 3500);
  }

  private handleBroadcastMessage(event: MessageEvent<MessagePayload>) {
    const data = event.data;
    if (!data) return;

    if (data.type === 'presence_heartbeat') {
      if (data.state.userId !== this.myState.userId) {
        this.peers.set(data.state.userId, {
          ...data.state,
          lastSeen: Date.now(),
        });
        this.notifyPeers();
      }
    } else if (data.type === 'cursor_move') {
      if (data.userId !== this.myState.userId && this.peers.has(data.userId)) {
        const p = this.peers.get(data.userId)!;
        p.cursor = data.cursor;
        p.lastSeen = Date.now();
        this.notifyPeers();
      }
    } else if (data.type === 'peer_leave') {
      this.peers.delete(data.userId);
      this.notifyPeers();
    } else if (data.type === 'bring_everyone') {
      if (this.onFacilitatorCommandCb) {
        this.onFacilitatorCommandCb({
          type: 'bring_everyone',
          cardId: data.cardId,
          workstreamId: data.workstreamId,
        });
      }
    } else if (data.type === 'voting_state') {
      if (this.onVotingUpdateCb) {
        this.onVotingUpdateCb(data.voting);
      }
    }
  }

  private broadcast(payload: MessagePayload) {
    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch (err) {
        // channel may be closed
      }
    }
  }

  updateCursor(x: number, y: number): void {
    this.myState.cursor = { x, y };
    this.broadcast({
      type: 'cursor_move',
      userId: this.myState.userId,
      cursor: { x, y },
    });
  }

  setActiveCard(cardId?: string, workstreamId?: string): void {
    this.myState.activeCardId = cardId;
    this.myState.activeWorkstreamId = workstreamId;
    this.broadcast({ type: 'presence_heartbeat', state: this.myState });
    this.notifyPeers();
  }

  setFollowingFacilitator(following: boolean): void {
    this.myState.followingFacilitator = following;
    this.broadcast({ type: 'presence_heartbeat', state: this.myState });
    this.notifyPeers();
  }

  broadcastBringEveryone(cardId: string, workstreamId?: string): void {
    this.broadcast({
      type: 'bring_everyone',
      cardId,
      workstreamId,
      sender: this.myState.userName,
    });
  }

  broadcastVotingState(voting: any): void {
    this.broadcast({
      type: 'voting_state',
      voting,
    });
  }

  getConnectedPeers(): PresenceState[] {
    return Array.from(this.peers.values()).filter((p) => p.isOnline);
  }

  private cleanStalePeers() {
    const now = Date.now();
    let changed = false;
    this.peers.forEach((peer, id) => {
      if (now - peer.lastSeen > 18000) {
        this.peers.delete(id);
        changed = true;
      }
    });
    if (changed) {
      this.notifyPeers();
    }
  }

  private notifyPeers() {
    if (this.onPresenceUpdateCb) {
      this.onPresenceUpdateCb(this.getConnectedPeers());
    }
  }
}

export const presenceService = new PresenceService();
