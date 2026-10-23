import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  effect,
  untracked,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Child } from '@st44/types';
import { Modal } from '../modal/modal';
import { ChildInviteModal } from '../child-invite-modal/child-invite-modal';
import { CreateChildAccountComponent } from '../../create-child-account/create-child-account';
import { ChildrenService } from '../../../services/children.service';
import {
  ChildInvitationService,
  formatDayMonth,
  formatWeekdayDate,
  type ChildInvitation,
} from '../../../services/child-invitation.service';
import { isDesktopSignal } from '../../../utils/desktop-query';

/**
 * Child Details Modal
 *
 * Shows child information and allows parents to:
 * - View child details (name, age)
 * - Edit child name and birth year
 * - Delete child from household
 * - Create login credentials for children without accounts
 * - View account status for children with accounts
 *
 * Design reserves space for future QR code login feature (#238).
 */
@Component({
  selector: 'app-child-details-modal',
  imports: [Modal, ChildInviteModal, CreateChildAccountComponent, ReactiveFormsModule],
  templateUrl: './child-details-modal.html',
  styleUrl: './child-details-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildDetailsModal {
  /** Popup rule 4 is desktop-only: on the phone the main action still waits for a valid form */
  protected readonly desktop = isDesktopSignal();
  /**
   * Whether the modal is open
   */
  open = input<boolean>(false);

  /**
   * The child to display details for
   */
  child = input<Child | null>(null);

  /**
   * The child's email if they have an account (from household members)
   */
  childEmail = input<string | null>(null);

  /**
   * The household ID for API calls
   */
  householdId = input.required<string>();

  /**
   * Event emitted when modal should close
   */
  closeRequested = output<void>();

  /**
   * Event emitted when account is created successfully
   */
  accountCreated = output<void>();

  /**
   * Event emitted when child is updated successfully
   */
  childUpdated = output<void>();

  /**
   * Event emitted when child is deleted successfully
   */
  childDeleted = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly childrenService = inject(ChildrenService);

  /**
   * Whether to show the create account form
   */
  protected readonly showCreateAccount = signal(false);

  /**
   * Whether the modal is in edit mode
   */
  protected readonly editMode = signal(false);

  /**
   * Whether to show delete confirmation
   */
  protected readonly showDeleteConfirm = signal(false);

  /**
   * Loading state for save operation
   */
  protected readonly saving = signal(false);

  /**
   * Loading state for delete operation
   */
  protected readonly deleting = signal(false);

  /**
   * Error message for operations
   */
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * Edit form for child details
   */
  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
    birthYear: [
      null as number | null,
      [Validators.min(1900), Validators.max(new Date().getFullYear())],
    ],
  });

  /**
   * Whether the child has an account (userId is set)
   */
  protected readonly hasAccount = computed(() => {
    const child = this.child();
    return child?.userId != null;
  });

  /**
   * Calculate child's age from birth year
   */
  protected readonly childAge = computed(() => {
    const child = this.child();
    if (!child?.birthYear) return null;
    return new Date().getFullYear() - child.birthYear;
  });

  /**
   * Current year for birth year max validation
   */
  protected readonly currentYear = new Date().getFullYear();

  /**
   * Minimum birth year (for reasonable age range)
   */
  protected readonly minBirthYear = this.currentYear - 100;

  /**
   * Handle modal close
   */
  onClose(): void {
    this.showCreateAccount.set(false);
    this.editMode.set(false);
    this.showDeleteConfirm.set(false);
    this.errorMessage.set(null);
    this.closeRequested.emit();
  }

  /**
   * Toggle create account form
   */
  toggleCreateAccount(): void {
    this.showCreateAccount.update((v) => !v);
  }

  /**
   * Handle account created event from CreateChildAccountComponent
   */
  onAccountCreated(): void {
    this.showCreateAccount.set(false);
    this.accountCreated.emit();
    this.closeRequested.emit();
  }

  /**
   * Handle cancel from CreateChildAccountComponent
   */
  onCreateAccountCancelled(): void {
    this.showCreateAccount.set(false);
  }

  /**
   * Enter edit mode and populate form with current child data
   */
  enterEditMode(): void {
    const child = this.child();
    if (child) {
      this.form.patchValue({
        name: child.name,
        birthYear: child.birthYear ?? null,
      });
      this.editMode.set(true);
      this.errorMessage.set(null);
    }
  }

  /**
   * Cancel edit mode
   */
  cancelEdit(): void {
    this.editMode.set(false);
    this.errorMessage.set(null);
  }

  /**
   * Save edited child details
   */
  async saveEdit(): Promise<void> {
    const child = this.child();
    if (!child || this.saving()) {
      return;
    }

    // ST-1430 rule 4: checked on the press, the error under the field.
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    try {
      await this.childrenService.updateChild(this.householdId(), child.id, {
        name: this.form.value.name!.trim(),
        birthYear: this.form.value.birthYear ?? null,
      });

      this.editMode.set(false);
      this.childUpdated.emit();
    } catch (error) {
      console.error('Failed to update child:', error);
      this.errorMessage.set('Failed to save changes. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Show delete confirmation dialog
   */
  showDeleteConfirmation(): void {
    this.showDeleteConfirm.set(true);
  }

  /**
   * Cancel delete confirmation
   */
  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
  }

  /**
   * Confirm and execute child deletion
   */
  async confirmDelete(): Promise<void> {
    const child = this.child();
    if (!child || this.deleting()) {
      return;
    }

    this.deleting.set(true);
    this.errorMessage.set(null);

    try {
      await this.childrenService.deleteChild(this.householdId(), child.id);

      this.showDeleteConfirm.set(false);
      this.childDeleted.emit();
      this.closeRequested.emit();
    } catch (error) {
      console.error('Failed to delete child:', error);
      this.errorMessage.set('Failed to remove child. Please try again.');
    } finally {
      this.deleting.set(false);
    }
  }

  // ---- ST-1678: invite the child by link -------------------------------------------------

  private readonly invitations = inject(ChildInvitationService);

  /** The newest invitation for this child, loaded each time the card opens */
  protected readonly invitation = signal<ChildInvitation | null>(null);
  protected readonly inviteOpen = signal(false);
  protected readonly inviteEmail = signal('');
  protected readonly inviteBusy = signal(false);
  protected readonly inviteError = signal<string | null>(null);
  protected readonly copied = signal(false);

  protected readonly pendingInvitation = computed(() => {
    const invitation = this.invitation();
    return invitation?.status === 'pending' ? invitation : null;
  });

  protected readonly expiredInvitation = computed(() => {
    const invitation = this.invitation();
    return invitation?.status === 'expired' ? invitation : null;
  });

  protected readonly acceptedInvitation = computed(() => {
    const invitation = this.invitation();
    return invitation?.status === 'accepted' && invitation.acceptedAt ? invitation : null;
  });

  private readonly loadInvitation = effect(() => {
    const child = this.child();
    const householdId = this.householdId();
    if (!this.open() || !child) return;
    untracked(() => {
      this.invitation.set(null);
      this.inviteError.set(null);
      this.copied.set(false);
      this.invitations
        .get(householdId, child.id)
        .then((invitation) => {
          if (this.child()?.id === child.id) this.invitation.set(invitation);
        })
        .catch((error) => console.error('Failed to load child invitation:', error));
    });
  });

  protected readonly weekdayDate = formatWeekdayDate;
  protected readonly dayMonth = formatDayMonth;

  protected displayLink(token: string): string {
    return this.invitations.displayLink(token);
  }

  openInvite(email: string): void {
    this.inviteEmail.set(email);
    this.inviteError.set(null);
    this.inviteOpen.set(true);
  }

  onInvitationCreated(invitation: ChildInvitation): void {
    this.invitation.set(invitation);
  }

  async copyLink(token: string): Promise<void> {
    this.copied.set(false);
    this.copied.set(await this.invitations.copyLink(token));
  }

  /** «Lag ny lenke»: a fresh link with 7 new days; the old one stops working */
  async renewInvitation(email: string): Promise<void> {
    const child = this.child();
    if (!child || this.inviteBusy()) return;
    this.inviteBusy.set(true);
    this.inviteError.set(null);
    try {
      this.invitation.set(await this.invitations.create(this.householdId(), child.id, email));
      this.copied.set(false);
    } catch (error) {
      console.error('Failed to renew child invitation:', error);
      this.inviteError.set(
        $localize`:@@childDetailsModal.newLinkFailed:Kunne ikke lage en ny lenke. Prøv igjen.`,
      );
    } finally {
      this.inviteBusy.set(false);
    }
  }

  /** «Avbryt invitasjonen»: the link stops; the profile, points and history are not touched */
  async cancelInvitation(): Promise<void> {
    const child = this.child();
    if (!child || this.inviteBusy()) return;
    this.inviteBusy.set(true);
    this.inviteError.set(null);
    try {
      await this.invitations.cancel(this.householdId(), child.id);
      this.invitation.set(null);
    } catch (error) {
      console.error('Failed to cancel child invitation:', error);
      this.inviteError.set(
        $localize`:@@childDetailsModal.cancelInviteFailed:Kunne ikke avbryte invitasjonen. Prøv igjen.`,
      );
    } finally {
      this.inviteBusy.set(false);
    }
  }
}
