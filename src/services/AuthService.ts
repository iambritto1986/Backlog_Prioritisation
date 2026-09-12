import { User, Role, Invitation } from '../types';
import { IAuthService } from './types';
import { SEED_USERS } from '../data/seedData';

const CURRENT_USER_KEY = 'pp_current_user';
const INVITATIONS_KEY = 'pp_invitations';

export class AuthService implements IAuthService {
  private currentUser: User;
  private users: User[] = SEED_USERS;

  constructor() {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch {
        this.currentUser = SEED_USERS[0];
      }
    } else {
      this.currentUser = SEED_USERS[0]; // Britto Thomas by default
    }
  }

  getCurrentUser(): User {
    return this.currentUser;
  }

  setCurrentUser(user: User): void {
    this.currentUser = user;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }

  getAvailableUsers(): User[] {
    return this.users;
  }

  async signInWithEmail(email: string, name?: string): Promise<{ token: string; requiresVerification: boolean }> {
    const normalized = email.trim().toLowerCase();
    const existing = this.users.find((u) => u.email.toLowerCase() === normalized);
    const token = `tok_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;

    // Store pending verification
    localStorage.setItem(`pp_verify_${token}`, JSON.stringify({
      email: normalized,
      name: name || existing?.name || normalized.split('@')[0],
      role: existing?.role || 'contributor',
      avatarColor: existing?.avatarColor || '#d97706',
    }));

    return {
      token,
      requiresVerification: true,
    };
  }

  async verifyEmailToken(token: string): Promise<User> {
    const dataStr = localStorage.getItem(`pp_verify_${token}`);
    if (!dataStr) {
      throw new Error('Invalid or expired verification token.');
    }
    const data = JSON.parse(dataStr);
    localStorage.removeItem(`pp_verify_${token}`);

    const existingIndex = this.users.findIndex((u) => u.email.toLowerCase() === data.email);
    let verifiedUser: User;
    if (existingIndex >= 0) {
      this.users[existingIndex].isVerified = true;
      verifiedUser = this.users[existingIndex];
    } else {
      verifiedUser = {
        id: `user_${Date.now()}`,
        name: data.name,
        email: data.email,
        role: data.role,
        avatarColor: data.avatarColor,
        isVerified: true,
      };
      this.users.push(verifiedUser);
    }

    this.setCurrentUser(verifiedUser);
    return verifiedUser;
  }

  can(action: 'configure_project' | 'facilitate' | 'edit_cards' | 'vote_and_comment' | 'view'): boolean {
    const role = this.currentUser.role;
    switch (action) {
      case 'configure_project':
        return role === 'workspace_admin' || role === 'project_lead';
      case 'facilitate':
        return role === 'workspace_admin' || role === 'project_lead' || role === 'facilitator';
      case 'edit_cards':
        return role === 'workspace_admin' || role === 'project_lead' || role === 'facilitator' || role === 'editor';
      case 'vote_and_comment':
        return role !== 'viewer';
      case 'view':
        return true;
      default:
        return false;
    }
  }

  async createInvitation(
    projectId: string,
    sessionId: string | undefined,
    role: Role,
    invitedEmail?: string
  ): Promise<Invitation> {
    const invitations = this.loadInvitations();
    const code = 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 days

    const newInvite: Invitation = {
      id: `inv-${Date.now()}`,
      projectId,
      sessionId,
      role,
      code,
      expiresAt: expiryDate.toISOString(),
      isRevoked: false,
      invitedEmail,
      createdAt: new Date().toISOString(),
      createdBy: this.currentUser.name,
    };

    invitations.push(newInvite);
    this.saveInvitations(invitations);
    return newInvite;
  }

  async getInvitations(projectId: string): Promise<Invitation[]> {
    const all = this.loadInvitations();
    return all.filter((inv) => inv.projectId === projectId);
  }

  async revokeInvitation(inviteId: string): Promise<void> {
    const invitations = this.loadInvitations();
    const target = invitations.find((i) => i.id === inviteId);
    if (target) {
      target.isRevoked = true;
      this.saveInvitations(invitations);
    }
  }

  async redeemInvitation(code: string): Promise<Invitation | null> {
    const invitations = this.loadInvitations();
    const invite = invitations.find(
      (i) => i.code.toUpperCase() === code.trim().toUpperCase() && !i.isRevoked
    );
    if (!invite) return null;
    if (new Date(invite.expiresAt).getTime() < Date.now()) return null;
    return invite;
  }

  async joinWithInvite(code: string, name: string, email: string): Promise<User> {
    const invitations = this.loadInvitations();
    const invite = invitations.find((i) => i.code.toUpperCase() === code.trim().toUpperCase());

    if (!invite) {
      throw new Error('Invitation code not found.');
    }
    if (invite.isRevoked) {
      throw new Error('This invitation link has been revoked by project leadership.');
    }
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      throw new Error('This invitation link has expired.');
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      avatarColor: '#10b981',
      role: invite.role,
      isVerified: true,
    };

    this.setCurrentUser(newUser);
    return newUser;
  }

  private loadInvitations(): Invitation[] {
    try {
      const data = localStorage.getItem(INVITATIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveInvitations(invitations: Invitation[]) {
    localStorage.setItem(INVITATIONS_KEY, JSON.stringify(invitations));
  }
}

export const authService = new AuthService();
