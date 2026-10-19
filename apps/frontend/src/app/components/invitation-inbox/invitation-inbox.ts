import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  InvitationService,
  Invitation,
  AcceptInvitationResponse,
} from '../../services/invitation.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-invitation-inbox',
  imports: [CommonModule, DatePipe],
  templateUrl: './invitation-inbox.html',
  styleUrl: './invitation-inbox.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationInboxComponent implements OnInit {
  private readonly invitationService = inject(InvitationService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly invitations = signal<Invitation[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly processingId = signal<string | null>(null);

  /** Role in Norwegian (rule 8) */
  protected roleLabel(role: string): string {
    switch (role) {
      case 'admin':
        return $localize`:@@invitationInbox.roleAdmin:Administrator`;
      case 'parent':
        return $localize`:@@invitationInbox.roleParent:Forelder`;
      default:
        return role;
    }
  }

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
    const householdName =
      invitation.householdName || $localize`:@@invitationInbox.theHousehold:husstanden`;
    const confirmed = await this.confirmDialog.confirm({
      title: $localize`:@@invitationInbox.acceptTitle:Bli med i husstanden?`,
      message: $localize`:@@invitationInbox.acceptMessage:Du blir med i «${householdName}:householdName:» som ${this.roleLabel(invitation.role).toLowerCase()}:role:.`,
      confirmLabel: $localize`:@@invitationInbox.acceptConfirm:Bli med`,
    });
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

      this.showSuccessMessage(
        $localize`:@@invitationInbox.joined:Du er nå med i «${response.household.name}:household:».`,
      );

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
    const householdName =
      invitation.householdName || $localize`:@@invitationInbox.theHousehold:husstanden`;
    const confirmed = await this.confirmDialog.confirm({
      title: $localize`:@@invitationInbox.declineTitle:Avslå invitasjonen?`,
      message: $localize`:@@invitationInbox.declineMessage:Du blir ikke med i «${householdName}:householdName:». Dette kan ikke angres.`,
      confirmLabel: $localize`:@@invitationInbox.declineConfirm:Avslå`,
      danger: true,
    });
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

      this.showSuccessMessage($localize`:@@invitationInbox.declined:Invitasjonen er avslått.`);

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
  /** The address split before its last «@», so it can break only there (ST-1557) */
  protected emailParts(email: string): [string, string] {
    const at = email.lastIndexOf('@');
    return at > 0 ? [email.slice(0, at), email.slice(at)] : [email, ''];
  }

  /** The desktop band's sub-line: «1 invitasjon», «2 invitasjoner» */
  protected countLine(): string {
    const n = this.invitations().length;
    return n === 1
      ? $localize`:@@invitationInbox.countOne:1 invitasjon`
      : $localize`:@@invitationInbox.countMany:${n}:count: invitasjoner`;
  }

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
