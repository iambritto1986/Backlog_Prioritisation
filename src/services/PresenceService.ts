import { PresenceState } from '../types';
import { IPresenceService } from './types';
import { authService } from './AuthService';
import { io, Socket } from 'socket.io-client';

type MessagePayload =
  | { type: 'presence_heartbeat'; state: PresenceState }
  | { type: 'cursor_move'; userId: string; cursor: { x: number; y: number } }
  | { type: 'bring_everyone'; cardId: string; workstreamId?: string; sender: string }
  | { type: 'voting_state'; voting: any }
  | { type: 'peer_leave'; userId: string }
  | { type: 'entity_sync'; entityType: string; data: any };

export class PresenceService implements IPresenceService {
  private socket: Socket | null = null;
  private currentSessionId: string | null = null;
  private myState: PresenceState;
  private peers: Map<string, PresenceState> = new Map();
  private onPresenceUpdateCb?: (peers: PresenceState[]) => void;
  private onFacilitatorCommandCb?: (cmd: { type: 'bring_everyone' | 'jump'; cardId: string; workstreamId?: string }) => void;
  private onVotingUpdateCb?: (votingState: any) => void;
  private onEntitySyncCb?: (entityType: string, data: any) => void;
  private heartbeatInterval?: any;

  constructor() {
    const user = authService.getCurrentUser();
    this.myState = {
      userId: user.id,
      userName: user.name,
      role: user.role,
      avatarColor: user.avatarColor,
      isOnline: true,
      lastSeen: Date.now(),
      followingFacilitator: true, // Default to true!
    };
  }

  subscribe(
    sessionId: string,
    onPresenceUpdate: (peers: PresenceState[]) => void,
    onFacilitatorCommand: (cmd: { type: 'bring_everyone' | 'jump'; cardId: string; workstreamId?: string }) => void,
    onVotingUpdate: (votingState: any) => void,
    onEntitySync?: (entityType: string, data: any) => void
  ): () => void {
    this.currentSessionId = sessionId;
    this.onPresenceUpdateCb = onPresenceUpdate;
    this.onFacilitatorCommandCb = onFacilitatorCommand;
    this.onVotingUpdateCb = onVotingUpdate;
    this.onEntitySyncCb = onEntitySync;

    const user = authService.getCurrentUser();
    this.myState.userId = user.id;
    this.myState.userName = user.name;
    this.myState.role = user.role;
    this.myState.avatarColor = user.avatarColor;
    
    // Auto-follow facilitator if guest
    this.myState.followingFacilitator = user.role !== 'facilitator';

    this.socket = io(window.location.origin);
    
    this.socket.on('connect', () => {
      this.socket?.emit('join_session_room', { sessionId, userId: this.myState.userId });
      this.broadcast({ type: 'presence_heartbeat', state: this.myState });
    });

    this.socket.on('presence_message', (payload: MessagePayload) => {
      this.handleSocketMessage(payload);
    });

    // Periodic heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.myState.lastSeen = Date.now();
      this.broadcast({ type: 'presence_heartbeat', state: this.myState });
      this.cleanStalePeers();
    }, 4000);

    // Initial trigger
    this.notifyPeers();

    return () => {
      clearInterval(this.heartbeatInterval);
      if (this.socket) {
        this.socket.emit('leave_session_room', { sessionId: this.currentSessionId, userId: this.myState.userId });
        this.socket.disconnect();
        this.socket = null;
      }
      this.peers.clear();
    };
  }

  private handleSocketMessage(data: MessagePayload) {
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
    } else if (data.type === 'entity_sync') {
      if (this.onEntitySyncCb) {
        this.onEntitySyncCb(data.entityType, data.data);
      }
    }
  }

  private broadcast(payload: MessagePayload) {
    if (this.socket && this.socket.connected && this.currentSessionId) {
      this.socket.emit('presence_message', {
        sessionId: this.currentSessionId,
        payload
      });
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
  
  broadcastEntitySync(entityType: string, data: any): void {
    this.broadcast({
      type: 'entity_sync',
      entityType,
      data
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
