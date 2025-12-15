import {
  Component,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment.development';
import {
  passwordStrengthValidator,
  passwordMatchValidator,
  getPasswordStrength,
} from '../utils/password-validation.utils';

interface GoogleSignInResponse {
  credential: string;
}

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  protected googleClientId = environment.googleClientId;
  protected showPassword = signal(false);
  protected isLoading = signal(false);
  protected errorMessage = signal<string | null>(null);

  protected registerForm = new FormGroup(
    {
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        passwordStrengthValidator,
      ]),
      confirmPassword: new FormControl('', [Validators.required]),
    },
    { validators: passwordMatchValidator },
  );

  protected get emailControl() {
    return this.registerForm.get('email')!;
  }
  protected get passwordControl() {
    return this.registerForm.get('password')!;
  }
  protected get confirmPasswordControl() {
    return this.registerForm.get('confirmPassword')!;
  }

  protected passwordStrength = computed(() => {
    const password = this.passwordControl.value || '';
    return getPasswordStrength(password);
  });

  ngOnInit(): void {
    // Make callback available globally for Google
    (
      window as Window & { handleGoogleSignUp?: (response: GoogleSignInResponse) => void }
    ).handleGoogleSignUp = this.handleGoogleSignUp.bind(this);
  }

  protected async handleGoogleSignUp(response: GoogleSignInResponse): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await lastValueFrom(this.authService.loginWithGoogle(response.credential));

      // Success - navigate to household creation page (user already created and logged in)
      this.router.navigate(['/household/create']);
    } catch (error: unknown) {
      const err = error as { error?: { error?: string; message?: string } };
      const message = err.error?.error || 'Google sign-up failed. Please try again.';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  protected async onSubmit(): Promise<void> {
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
    } catch (error: unknown) {
      const err = error as { error?: { error?: string } };
      this.errorMessage.set(err.error?.error || 'Registration failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
