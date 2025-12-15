import { Component, signal, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InvitationService, SendInvitationResponse } from '../../services/invitation.service';

@Component({
  selector: 'app-invite-user',
  imports: [ReactiveFormsModule],
  templateUrl: './invite-user.html',
  styleUrl: './invite-user.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteUserComponent {
  private fb = inject(FormBuilder);
  private invitationService = inject(InvitationService);

  householdId = input.required<string>();
  invitationSent = output<SendInvitationResponse>();

  isSending = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  invitationLink = signal('');

  inviteForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['parent', [Validators.required]],
  });

  async onSubmit() {
    if (this.inviteForm.invalid) {
      this.markFormGroupTouched(this.inviteForm);
      return;
    }

    this.isSending.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.invitationLink.set('');

    try {
      const { email, role } = this.inviteForm.value;
      const response = await this.invitationService.sendInvitation(this.householdId(), email, role);

      // Generate invitation link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/invite/${response.token}`;
      this.invitationLink.set(link);

      this.successMessage.set(`Invitation sent to ${email}!`);
      this.invitationSent.emit(response);

      // Reset form
      this.inviteForm.reset({ role: 'parent' });
    } catch (error: unknown) {
      const httpError = error as { error?: { message?: string }; status?: number };
      let message = 'Failed to send invitation. Please try again.';

      if (httpError?.status === 400) {
        message = 'Please check the email address.';
      } else if (httpError?.status === 401) {
        message = 'Session expired. Please log in again.';
      } else if (httpError?.status === 403) {
        message = 'You do not have permission to invite users to this household.';
      } else if (httpError?.status === 409) {
        if (httpError.error?.message?.includes('already a household member')) {
          message = 'This user is already a member of your household.';
        } else if (httpError.error?.message?.includes('pending invitation')) {
          message = 'A pending invitation already exists for this email.';
        } else {
          message = httpError.error?.message || 'This user cannot be invited.';
        }
      }

      this.errorMessage.set(message);
    } finally {
      this.isSending.set(false);
    }
  }

  copyInvitationLink() {
    const link = this.invitationLink();
    if (!link) return;

    navigator.clipboard
      .writeText(link)
      .then(() => {
        this.successMessage.set('Invitation link copied to clipboard!');
        setTimeout(() => {
          if (this.successMessage() === 'Invitation link copied to clipboard!') {
            this.successMessage.set(`Invitation sent to ${this.inviteForm.value.email}!`);
          }
        }, 2000);
      })
      .catch(() => {
        this.errorMessage.set('Failed to copy link. Please copy manually.');
      });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getEmailError(): string {
    const control = this.inviteForm.get('email');
    if (!control?.touched || !control.invalid) return '';

    if (control.errors?.['required']) {
      return 'Email is required';
    }
    if (control.errors?.['email']) {
      return 'Please enter a valid email address';
    }
    return '';
  }
}
