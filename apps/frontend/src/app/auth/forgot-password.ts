import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected isLoading = signal(false);
  protected errorMessage = signal<string | null>(null);
  protected successMessage = signal<string | null>(null);

  protected forgotPasswordForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  protected get emailControl() {
    return this.forgotPasswordForm.get('email')!;
  }

  protected async onSubmit(): Promise<void> {
    if (this.forgotPasswordForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const { email } = this.forgotPasswordForm.value;
      await lastValueFrom(this.authService.forgotPassword(email!));

      this.successMessage.set(
        $localize`:@@forgotPassword.successMessage:Hvis en konto finnes med den e-posten, er en tilbakestillingslenke sendt. Vennligst sjekk innboksen din.`,
      );
      this.forgotPasswordForm.reset();
    } catch (error: unknown) {
      const err = error as {
        error?: { error?: string; message?: string };
        status?: number;
      };

      if (err.status === 429) {
        this.errorMessage.set(
          $localize`:@@forgotPassword.tooManyRequests:For mange forespørsler. Vennligst prøv igjen senere.`,
        );
      } else {
        this.errorMessage.set(
          err.error?.error ||
            err.error?.message ||
            $localize`:@@forgotPassword.sendResetEmailFailed:Kunne ikke sende tilbakestillings-e-post. Vennligst prøv igjen.`,
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
