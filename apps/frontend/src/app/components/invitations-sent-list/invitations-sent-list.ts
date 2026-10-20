import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { InvitationService, Invitation } from '../../services/invitation.service';
import { HouseholdService } from '../../services/household.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { isDesktopSignal } from '../../utils/desktop-query';

@Component({
  selector: 'app-invitations-sent-list',
  imports: [CommonModule, DatePipe],
  templateUrl: './invitations-sent-list.html',
  styleUrl: './invitations-sent-list.css',
})
export class InvitationsSentListComponent implements OnInit {
  private invitationService = inject(InvitationService);
  private householdService = inject(HouseholdService);
  private confirmDialog = inject(ConfirmDialogService);

  /** From 1024 px the status badge is the guide's chip (ST-1621) */
  protected readonly desktop = isDesktopSignal();
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
    const confirmed = await this.confirmDialog.confirm({
      title: $localize`:@@invitationsSent.cancelTitle:Trekke tilbake invitasjonen?`,
      message: $localize`:@@invitationsSent.cancelMessage:Invitasjonen til ${invitation.invitedEmail}:email: slutter å virke.`,
      confirmLabel: $localize`:@@invitationsSent.cancelConfirm:Trekk tilbake`,
      danger: true,
    });
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
      this.showSuccessMessage(
        $localize`:@@invitationsSent.cancelled:Invitasjonen til ${invitation.invitedEmail}:email: er trukket tilbake.`,
      );
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

  /** The address split before its last «@», so a narrow row breaks there and nowhere else */
  emailParts(email: string): [string, string] {
    const at = email.lastIndexOf('@');
    return at > 0 ? [email.slice(0, at), email.slice(at)] : [email, ''];
  }

  /** Role in Norwegian (rule 8) */
  getRoleLabel(role: string): string {
    switch (role) {
      case 'admin':
        return $localize`:@@invitationsSent.roleAdmin:Administrator`;
      case 'parent':
        return $localize`:@@invitationsSent.roleParent:Forelder`;
      case 'child':
        return $localize`:@@invitationsSent.roleChild:Barn`;
      default:
        return role;
    }
  }

  /** Status in Norwegian (rule 8) */
  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return $localize`:@@invitationsSent.statusPending:Venter`;
      case 'accepted':
        return $localize`:@@invitationsSent.statusAccepted:Godtatt`;
      case 'declined':
        return $localize`:@@invitationsSent.statusDeclined:Avslått`;
      case 'cancelled':
        return $localize`:@@invitationsSent.statusCancelled:Avbrutt`;
      case 'expired':
        return $localize`:@@invitationsSent.statusExpired:Utløpt`;
      default:
        return status;
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
    const confirmed = await this.confirmDialog.confirm({
      title: $localize`:@@invitationsSent.cleanupTitle:Rydde i invitasjonene?`,
      message: $localize`:@@invitationsSent.cleanupMessage:Alle tilbaketrukne, avslåtte og utløpte invitasjoner fjernes fra listen.`,
      confirmLabel: $localize`:@@invitationsSent.cleanupConfirm:Rydd`,
      danger: true,
    });
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
      this.showSuccessMessage(
        result.deleted === 1
          ? $localize`:@@invitationsSent.cleanedUpOne:1 gammel invitasjon er fjernet.`
          : $localize`:@@invitationsSent.cleanedUp:${result.deleted}:count: gamle invitasjoner er fjernet.`,
      );
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
