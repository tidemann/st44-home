import { Component, signal, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import {
  passwordStrengthValidator,
  passwordMatchValidator,
} from '../utils/password-validation.utils';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected showPassword = signal(false);
  protected showConfirmPassword = signal(false);
  protected isLoading = signal(false);
  protected errorMessage = signal<string | null>(null);
  protected resetToken = signal<string | null>(null);
  protected passwordResetSuccess = signal(false);

  protected resetPasswordForm = new FormGroup(
    {
      newPassword: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        passwordStrengthValidator,
      ]),
      confirmPassword: new FormControl('', [Validators.required]),
    },
    { validators: passwordMatchValidator },
  );

  protected get newPasswordControl() {
    return this.resetPasswordForm.get('newPassword')!;
  }

  protected get confirmPasswordControl() {
    return this.resetPasswordForm.get('confirmPassword')!;
  }

  ngOnInit(): void {
    // Get token from query params
    const token = this.route.snapshot.queryParams['token'];
    if (!token) {
      this.errorMessage.set(
        'Invalid or missing reset token. Please request a new password reset link.',
      );
    } else {
      this.resetToken.set(token);
    }
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  protected getPasswordStrengthMessage(): string {
    const password = this.newPasswordControl.value || '';
    if (password.length === 0) return '';

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasMinLength = password.length >= 8;

    if (hasUpperCase && hasLowerCase && hasNumber && hasMinLength) {
      return 'Strong password';
    }

    const missing: string[] = [];
    if (!hasMinLength) missing.push('8 characters');
    if (!hasUpperCase) missing.push('uppercase letter');
    if (!hasLowerCase) missing.push('lowercase letter');
    if (!hasNumber) missing.push('number');

    return `Password must include: ${missing.join(', ')}`;
  }

  protected async onSubmit(): Promise<void> {
    if (this.resetPasswordForm.invalid || !this.resetToken()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const { newPassword } = this.resetPasswordForm.value;
      await lastValueFrom(this.authService.resetPassword(this.resetToken()!, newPassword!));

      this.passwordResetSuccess.set(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        this.router.navigate(['/login'], {
          queryParams: { message: 'Password reset successful. Please log in.' },
        });
      }, 2000);
    } catch (error: unknown) {
      const err = error as {
        error?: { error?: string; message?: string };
        status?: number;
      };

      if (err.status === 401) {
        this.errorMessage.set('Reset link has expired or is invalid. Please request a new one.');
      } else {
        this.errorMessage.set(
          err.error?.error || err.error?.message || 'Failed to reset password. Please try again.',
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
