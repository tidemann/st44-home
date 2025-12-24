import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
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
        'If an account exists with that email, a reset link has been sent. Please check your inbox.',
      );
      this.forgotPasswordForm.reset();
    } catch (error: unknown) {
      const err = error as {
        error?: { error?: string; message?: string };
        status?: number;
      };

      if (err.status === 429) {
        this.errorMessage.set('Too many requests. Please try again later.');
      } else {
        this.errorMessage.set(
          err.error?.error || err.error?.message || 'Failed to send reset email. Please try again.',
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
