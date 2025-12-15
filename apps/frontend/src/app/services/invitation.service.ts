import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface Invitation {
  id: string;
  householdId: string;
  householdName?: string;
  invitedEmail: string;
  invitedBy: string;
  inviterName?: string;
  inviterEmail?: string;
  role: 'admin' | 'parent';
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  token?: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendInvitationRequest {
  email: string;
  role?: 'admin' | 'parent';
}

export interface SendInvitationResponse {
  id: string;
  email: string;
  token: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface ListInvitationsResponse {
  invitations: Invitation[];
}

export interface AcceptInvitationResponse {
  household: {
    id: string;
    name: string;
    role: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class InvitationService {
  private readonly api = inject(ApiService);

  /**
   * Send invitation to join household
   */
  async sendInvitation(
    householdId: string,
    email: string,
    role: 'admin' | 'parent' = 'parent',
  ): Promise<SendInvitationResponse> {
    return this.api.post<SendInvitationResponse>(`/households/${householdId}/invitations`, {
      email,
      role,
    });
  }

  /**
   * List invitations sent by current user's household
   */
  async listSentInvitations(
    householdId: string,
    status?: string,
  ): Promise<ListInvitationsResponse> {
    const endpoint = status
      ? `/households/${householdId}/invitations?status=${status}`
      : `/households/${householdId}/invitations`;
    return this.api.get<ListInvitationsResponse>(endpoint);
  }

  /**
   * List invitations received by current user
   */
  async listReceivedInvitations(): Promise<ListInvitationsResponse> {
    return this.api.get<ListInvitationsResponse>('/users/me/invitations');
  }

  /**
   * Accept invitation by token
   */
  async acceptInvitation(token: string): Promise<AcceptInvitationResponse> {
    return this.api.post<AcceptInvitationResponse>(`/invitations/${token}/accept`, {});
  }

  /**
   * Decline invitation by token
   */
  async declineInvitation(token: string): Promise<void> {
    return this.api.post<void>(`/invitations/${token}/decline`, {});
  }

  /**
   * Cancel pending invitation (admin/inviter only)
   */
  async cancelInvitation(householdId: string, invitationId: string): Promise<void> {
    return this.api.delete<void>(`/households/${householdId}/invitations/${invitationId}`);
  }
}
