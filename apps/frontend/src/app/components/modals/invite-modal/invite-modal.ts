import { Component, input, output, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../modal/modal';

/**
 * Data structure for invite member submission
 */
export interface InviteMemberData {
  email: string;
  role: 'parent' | 'adult';
  message?: string;
}

/**
 * Invite Member Modal
 *
 * Allows parents to invite other adults to join the household:
 * - Email address (required, validated)
 * - Role (Parent/Adult - required)
 * - Personal message (optional)
 *
 * Emits invitation data for parent component to handle API call.
 */
@Component({
  selector: 'app-invite-modal',
  imports: [Modal, ReactiveFormsModule],
  templateUrl: './invite-modal.html',
  styleUrl: './invite-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteModal {
  /**
   * Whether the modal is open
   */
  open = input<boolean>(false);

  /**
   * Event emitted when modal should closeModal
   */
  closeRequested = output<void>();

  /**
   * Event emitted when invite is sent
   */
  inviteSent = output<InviteMemberData>();

  /**
   * Form builder
   */
  private readonly fb = inject(FormBuilder);

  /**
   * Form group for invite member
   */
  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['parent' as 'parent' | 'adult', [Validators.required]],
    message: [''],
  });

  /**
   * Submission loading state
   */
  protected readonly submitting = signal(false);

  /**
   * Available role options
   */
  protected readonly roleOptions: {
    value: 'parent' | 'adult';
    label: string;
    description: string;
  }[] = [
    {
      value: 'parent',
      label: 'Parent (Admin)',
      description: 'Can manage tasks, children, and settings',
    },
    { value: 'adult', label: 'Adult Member', description: 'Can view and complete tasks' },
  ];

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const formValue = this.form.value;

    // Emit invitation data
    this.inviteSent.emit({
      email: formValue.email!.trim().toLowerCase(),
      role: formValue.role!,
      message: formValue.message?.trim() || undefined,
    });

    // Reset form
    this.form.reset({ role: 'parent' });
  }

  /**
   * Handle modal closeRequested
   */
  onClose(): void {
    this.form.reset({ role: 'parent' });
    this.closeRequested.emit();
  }

  /**
   * Handle cancel button click
   */
  onCancel(): void {
    this.onClose();
  }
}
