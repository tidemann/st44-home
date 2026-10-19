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

      this.successMessage.set(
        $localize`:@@inviteUser.sent:Invitasjonen er sendt til ${email}:email:.`,
      );
      this.invitationSent.emit(response);

      // Reset form
      this.inviteForm.reset({ role: 'parent' });
    } catch (error: unknown) {
      const httpError = error as { error?: { message?: string }; status?: number };
      let message = $localize`:@@inviteUser.sendFailed:Kunne ikke sende invitasjon. Vennligst prøv igjen.`;

      if (httpError?.status === 400) {
        message = $localize`:@@inviteUser.checkEmail:Vennligst sjekk e-postadressen.`;
      } else if (httpError?.status === 401) {
        message = $localize`:@@inviteUser.sessionExpired:Økten har utløpt. Vennligst logg inn igjen.`;
      } else if (httpError?.status === 403) {
        message = $localize`:@@inviteUser.noPermission:Du har ikke tillatelse til å invitere brukere til denne husholdningen.`;
      } else if (httpError?.status === 409) {
        // The backend's messages are English: map them, never show them (rule 8)
        const backendMessage = httpError.error?.message?.toLowerCase() ?? '';
        if (backendMessage.includes('already a household member')) {
          message = $localize`:@@inviteUser.alreadyMember:Denne brukeren er allerede medlem av husholdningen din.`;
        } else if (backendMessage.includes('pending invitation')) {
          message = $localize`:@@inviteUser.pendingInvitation:En ventende invitasjon eksisterer allerede for denne e-posten.`;
        } else {
          message = $localize`:@@inviteUser.cannotInvite:Denne brukeren kan ikke inviteres.`;
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
        const sent = this.successMessage();
        const copied = $localize`:@@inviteUser.linkCopied:Invitasjonslenken er kopiert.`;
        this.successMessage.set(copied);
        setTimeout(() => {
          if (this.successMessage() === copied) {
            this.successMessage.set(sent);
          }
        }, 2000);
      })
      .catch(() => {
        this.errorMessage.set(
          $localize`:@@inviteUser.copyFailed:Kunne ikke kopiere lenke. Vennligst kopier manuelt.`,
        );
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
      return $localize`:@@inviteUser.emailRequired:Skriv inn e-postadressen.`;
    }
    if (control.errors?.['email']) {
      return $localize`:@@inviteUser.emailInvalid:Skriv inn en gyldig e-postadresse.`;
    }
    return '';
  }
}
