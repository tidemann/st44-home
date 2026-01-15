import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { InvitationService, Invitation } from '../../services/invitation.service';
import { HouseholdService } from '../../services/household.service';

@Component({
  selector: 'app-invitations-sent-list',
  imports: [CommonModule, DatePipe],
  templateUrl: './invitations-sent-list.html',
  styleUrl: './invitations-sent-list.css',
})
export class InvitationsSentListComponent implements OnInit {
  private invitationService = inject(InvitationService);
  private householdService = inject(HouseholdService);

  invitations = signal<Invitation[]>([]);
  isLoading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  /**
   * Check if there are any old invitations that can be cleaned up
   */
  hasOldInvitations(): boolean {
    const now = new Date();
    return this.invitations().some((inv) => {
      if (inv.status === 'cancelled' || inv.status === 'declined') {
        return true;
      }
      if (inv.status === 'pending' && new Date(inv.expiresAt) < now) {
        return true;
      }
      return false;
    });
  }

  ngOnInit() {
    this.loadInvitations();
  }

  /**
   * Load sent invitations for current household
   */
  async loadInvitations() {
    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) {
      this.errorMessage.set(
        $localize`:@@invitationsSent.noActiveHousehold:Ingen aktiv husstand valgt`,
      );
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const response = await this.invitationService.listSentInvitations(householdId);
      this.invitations.set(response.invitations);
    } catch (error) {
      console.error('Failed to load invitations:', error);
      this.errorMessage.set(
        $localize`:@@invitationsSent.loadFailed:Kunne ikke laste invitasjoner. Vennligst prøv igjen.`,
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(invitation: Invitation) {
    const confirmed = confirm(
      `Are you sure you want to cancel the invitation to ${invitation.invitedEmail}?`,
    );
    if (!confirmed) {
      return;
    }

    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) {
      this.errorMessage.set(
        $localize`:@@invitationsSent.noActiveHousehold:Ingen aktiv husstand valgt`,
      );
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.invitationService.cancelInvitation(householdId, invitation.id);
      this.showSuccessMessage(`Invitation to ${invitation.invitedEmail} cancelled`);
      await this.loadInvitations();
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      this.errorMessage.set(
        $localize`:@@invitationsSent.cancelFailed:Kunne ikke kansellere invitasjon. Vennligst prøv igjen.`,
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Get status badge class
   */
  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'badge-pending';
      case 'accepted':
        return 'badge-accepted';
      case 'declined':
        return 'badge-declined';
      case 'cancelled':
        return 'badge-cancelled';
      case 'expired':
        return 'badge-expired';
      default:
        return '';
    }
  }

  /**
   * Check if invitation can be cancelled
   */
  canCancel(invitation: Invitation): boolean {
    return invitation.status === 'pending';
  }

  /**
   * Clean up cancelled and expired invitations
   */
  async cleanupInvitations() {
    const confirmed = confirm(
      'Are you sure you want to remove all cancelled, declined, and expired invitations?',
    );
    if (!confirmed) {
      return;
    }

    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) {
      this.errorMessage.set(
        $localize`:@@invitationsSent.noActiveHousehold:Ingen aktiv husstand valgt`,
      );
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const result = await this.invitationService.cleanupInvitations(householdId);
      this.showSuccessMessage(result.message);
      await this.loadInvitations();
    } catch (error) {
      console.error('Failed to cleanup invitations:', error);
      this.errorMessage.set(
        $localize`:@@invitationsSent.cleanupFailed:Kunne ikke rydde opp i invitasjoner. Vennligst prøv igjen.`,
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Show success message and auto-clear
   */
  private showSuccessMessage(message: string) {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(null), 3000);
  }
}
