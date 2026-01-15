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
        $localize`:@@resetPassword.invalidToken:Ugyldig eller manglende tilbakestillingstoken. Vennligst be om en ny lenke for tilbakestilling av passord.`,
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
      return $localize`:@@resetPassword.strongPassword:Sterkt passord`;
    }

    const missing: string[] = [];
    if (!hasMinLength) missing.push($localize`:@@resetPassword.8characters:8 tegn`);
    if (!hasUpperCase) missing.push($localize`:@@resetPassword.uppercaseLetter:stor bokstav`);
    if (!hasLowerCase) missing.push($localize`:@@resetPassword.lowercaseLetter:liten bokstav`);
    if (!hasNumber) missing.push($localize`:@@resetPassword.number:tall`);

    return $localize`:@@resetPassword.passwordMustInclude:Passordet må inneholde: ${missing.join(', ')}`;
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
          queryParams: {
            message: $localize`:@@resetPassword.successMessage:Tilbakestilling av passord vellykket. Vennligst logg inn.`,
          },
        });
      }, 2000);
    } catch (error: unknown) {
      const err = error as {
        error?: { error?: string; message?: string };
        status?: number;
      };

      if (err.status === 401) {
        this.errorMessage.set(
          $localize`:@@resetPassword.linkExpired:Tilbakestillingslenken har utløpt eller er ugyldig. Vennligst be om en ny.`,
        );
      } else {
        this.errorMessage.set(
          err.error?.error ||
            err.error?.message ||
            $localize`:@@resetPassword.resetFailed:Kunne ikke tilbakestille passord. Vennligst prøv igjen.`,
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
