import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="register-container">
      <h1>Create Account</h1>

      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
        <!-- Email -->
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            [attr.aria-invalid]="emailControl.invalid && emailControl.touched"
            [attr.aria-describedby]="
              emailControl.invalid && emailControl.touched ? 'email-error' : null
            "
          />
          @if (emailControl.invalid && emailControl.touched) {
            <div id="email-error" class="error" role="alert">
              @if (emailControl.errors?.['required']) {
                <span>Email is required</span>
              }
              @if (emailControl.errors?.['email']) {
                <span>Please enter a valid email</span>
              }
            </div>
          }
        </div>

        <!-- Password -->
        <div class="form-group">
          <label for="password">Password</label>
          <div class="password-input-wrapper">
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              [attr.aria-invalid]="passwordControl.invalid && passwordControl.touched"
              [attr.aria-describedby]="
                'password-strength' +
                (passwordControl.invalid && passwordControl.touched ? ' password-error' : '')
              "
            />
            <button
              type="button"
              class="toggle-password"
              (click)="togglePasswordVisibility()"
              [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
            >
              {{ showPassword() ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>

          @if (passwordControl.value) {
            <div id="password-strength" class="strength-indicator" aria-live="polite">
              Strength:
              <span [class]="'strength-' + passwordStrength()">{{ passwordStrength() }}</span>
            </div>
          }

          @if (passwordControl.invalid && passwordControl.touched) {
            <div id="password-error" class="error" role="alert">
              Password must be at least 8 characters with uppercase, lowercase, and number
            </div>
          }
        </div>

        <!-- Confirm Password -->
        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            [type]="showPassword() ? 'text' : 'password'"
            formControlName="confirmPassword"
            [attr.aria-invalid]="confirmPasswordControl.invalid && confirmPasswordControl.touched"
            [attr.aria-describedby]="
              confirmPasswordControl.invalid && confirmPasswordControl.touched
                ? 'confirm-error'
                : null
            "
          />
          @if (registerForm.errors?.['passwordMismatch'] && confirmPasswordControl.touched) {
            <div id="confirm-error" class="error" role="alert">Passwords do not match</div>
          }
        </div>

        <!-- Server Error -->
        @if (errorMessage()) {
          <div class="error server-error" role="alert" aria-live="assertive">
            {{ errorMessage() }}
          </div>
        }

        <!-- Submit -->
        <button type="submit" [disabled]="registerForm.invalid || isLoading()">
          @if (isLoading()) {
            <span>Creating account...</span>
          } @else {
            <span>Create Account</span>
          }
        </button>

        <p class="login-link">Already have an account? <a routerLink="/login">Log in</a></p>
      </form>
    </div>
  `,
  styles: [
    `
      .register-container {
        max-width: 400px;
        margin: 2rem auto;
        padding: 2rem;
      }

      .form-group {
        margin-bottom: 1rem;
      }

      label {
        display: block;
        margin-bottom: 0.25rem;
        font-weight: 500;
      }

      input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
      }

      input[aria-invalid='true'] {
        border-color: #dc3545;
      }

      .error {
        color: #dc3545;
        font-size: 0.875rem;
        margin-top: 0.25rem;
      }

      .password-input-wrapper {
        position: relative;
        display: flex;
      }

      .password-input-wrapper input {
        flex: 1;
      }

      .toggle-password {
        position: absolute;
        right: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.2rem;
      }

      .strength-indicator {
        font-size: 0.875rem;
        margin-top: 0.25rem;
      }

      .strength-weak {
        color: #dc3545;
        font-weight: 600;
      }
      .strength-medium {
        color: #ffc107;
        font-weight: 600;
      }
      .strength-strong {
        color: #28a745;
        font-weight: 600;
      }

      button[type='submit'] {
        width: 100%;
        padding: 0.75rem;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500;
      }

      button[type='submit']:hover:not(:disabled) {
        background-color: #0056b3;
      }

      button[type='submit']:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .login-link {
        text-align: center;
        margin-top: 1rem;
        font-size: 0.875rem;
      }

      .login-link a {
        color: #007bff;
        text-decoration: none;
      }

      .login-link a:hover {
        text-decoration: underline;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  registerForm = new FormGroup(
    {
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        this.passwordStrengthValidator.bind(this),
      ]),
      confirmPassword: new FormControl('', [Validators.required]),
    },
    { validators: this.passwordMatchValidator.bind(this) },
  );

  get emailControl() {
    return this.registerForm.get('email')!;
  }
  get passwordControl() {
    return this.registerForm.get('password')!;
  }
  get confirmPasswordControl() {
    return this.registerForm.get('confirmPassword')!;
  }

  passwordStrength = computed(() => {
    const password = this.passwordControl.value || '';
    return this.getPasswordStrength(password);
  });

  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return { passwordStrength: true };
    }

    return null;
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  }

  getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  }

  togglePasswordVisibility() {
    this.showPassword.update((v) => !v);
  }

  async onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const { email, password } = this.registerForm.value;
      await this.authService.register(email!, password!).toPromise();

      // Success - navigate to login
      this.router.navigate(['/login'], {
        queryParams: { registered: 'true' },
      });
    } catch (error: any) {
      this.errorMessage.set(error.error?.error || 'Registration failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
