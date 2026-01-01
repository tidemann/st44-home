import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Child } from '@st44/types';
import { Modal } from '../modal/modal';
import { CreateChildAccountComponent } from '../../create-child-account/create-child-account';
import { ChildrenService } from '../../../services/children.service';

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
  imports: [Modal, CreateChildAccountComponent, ReactiveFormsModule],
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
      2015,
      [Validators.required, Validators.min(1900), Validators.max(new Date().getFullYear())],
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
        birthYear: child.birthYear || this.currentYear - 10,
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
    if (!child || this.form.invalid || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    try {
      await this.childrenService.updateChild(this.householdId(), child.id, {
        name: this.form.value.name!.trim(),
        birthYear: this.form.value.birthYear!,
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
}
