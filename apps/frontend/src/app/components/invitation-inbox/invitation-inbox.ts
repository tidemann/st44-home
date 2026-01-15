import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  InvitationService,
  Invitation,
  AcceptInvitationResponse,
} from '../../services/invitation.service';

@Component({
  selector: 'app-invitation-inbox',
  imports: [CommonModule, DatePipe, TitleCasePipe],
  templateUrl: './invitation-inbox.html',
  styleUrl: './invitation-inbox.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationInboxComponent implements OnInit {
  private readonly invitationService = inject(InvitationService);
  private readonly router = inject(Router);

  protected readonly invitations = signal<Invitation[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly processingId = signal<string | null>(null);

  ngOnInit() {
    this.loadInvitations();
  }

  /**
   * Load received invitations for current user
   */
  async loadInvitations() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const response = await this.invitationService.listReceivedInvitations();
      // Filter to show only pending invitations
      const pending = response.invitations.filter((inv) => inv.status === 'pending');
      this.invitations.set(pending);
    } catch (error) {
      console.error('Failed to load invitations:', error);
      this.errorMessage.set(
        $localize`:@@invitationInbox.loadFailed:Kunne ikke laste invitasjoner. Vennligst prøv igjen.`,
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Accept an invitation after confirmation
   */
  async acceptInvitation(invitation: Invitation) {
    const confirmed = confirm(
      `Accept invitation to join "${invitation.householdName || 'the household'}"?\n\nYou will become a member with the role: ${invitation.role}`,
    );
    if (!confirmed) {
      return;
    }

    if (!invitation.token) {
      this.errorMessage.set(
        $localize`:@@invitationInbox.invalidToken:Ugyldig invitasjon - mangler token`,
      );
      return;
    }

    this.processingId.set(invitation.id);
    this.errorMessage.set(null);

    try {
      const response: AcceptInvitationResponse = await this.invitationService.acceptInvitation(
        invitation.token,
      );

      this.showSuccessMessage(`Successfully joined "${response.household.name}"! Redirecting...`);

      // Remove from list immediately
      this.invitations.update((list) => list.filter((inv) => inv.id !== invitation.id));

      // Redirect to household after brief delay
      setTimeout(() => {
        this.router.navigate(['/household/settings']);
      }, 1500);
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      this.errorMessage.set(
        $localize`:@@invitationInbox.acceptFailed:Kunne ikke akseptere invitasjon. Vennligst prøv igjen.`,
      );
    } finally {
      this.processingId.set(null);
    }
  }

  /**
   * Decline an invitation after confirmation
   */
  async declineInvitation(invitation: Invitation) {
    const confirmed = confirm(
      `Decline invitation to join "${invitation.householdName || 'the household'}"?\n\nThis action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    if (!invitation.token) {
      this.errorMessage.set(
        $localize`:@@invitationInbox.invalidToken:Ugyldig invitasjon - mangler token`,
      );
      return;
    }

    this.processingId.set(invitation.id);
    this.errorMessage.set(null);

    try {
      await this.invitationService.declineInvitation(invitation.token);

      this.showSuccessMessage('Invitation declined');

      // Remove from list immediately
      this.invitations.update((list) => list.filter((inv) => inv.id !== invitation.id));
    } catch (error) {
      console.error('Failed to decline invitation:', error);
      this.errorMessage.set(
        $localize`:@@invitationInbox.declineFailed:Kunne ikke avslå invitasjon. Vennligst prøv igjen.`,
      );
    } finally {
      this.processingId.set(null);
    }
  }

  /**
   * Check if invitation is expired
   */
  isExpired(invitation: Invitation): boolean {
    return new Date(invitation.expiresAt) < new Date();
  }

  /**
   * Check if a specific invitation is being processed
   */
  isProcessing(invitation: Invitation): boolean {
    return this.processingId() === invitation.id;
  }

  /**
   * Get count of pending invitations (for badge display)
   */
  get pendingCount(): number {
    return this.invitations().length;
  }

  /**
   * Show success message and auto-clear
   */
  private showSuccessMessage(message: string) {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(null), 3000);
  }
}
