import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import type { Child } from '@st44/types';
import { Modal } from '../modal/modal';
import { CreateChildAccountComponent } from '../../create-child-account/create-child-account';

/**
 * Child Details Modal
 *
 * Shows child information and allows parents to:
 * - View child details (name, age)
 * - Create login credentials for children without accounts
 * - View account status for children with accounts
 *
 * Design reserves space for future QR code login feature (#238).
 */
@Component({
  selector: 'app-child-details-modal',
  imports: [Modal, CreateChildAccountComponent],
  templateUrl: './child-details-modal.html',
  styleUrl: './child-details-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildDetailsModal {
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
   * Whether to show the create account form
   */
  protected readonly showCreateAccount = signal(false);

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
   * Handle modal close
   */
  onClose(): void {
    this.showCreateAccount.set(false);
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
}
