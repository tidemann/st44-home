import {
  Component,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  OnInit,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  passwordStrengthValidator,
  passwordMatchValidator,
  getPasswordStrength,
} from '../utils/password-validation.utils';

interface GoogleSignInResponse {
  credential: string;
}

declare const google: {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleSignInResponse) => void;
        auto_select?: boolean;
      }) => void;
      renderButton: (
        element: HTMLElement,
        config: {
          type: string;
          shape: string;
          theme: string;
          text: string;
          size: string;
          logo_alignment: string;
        },
      ) => void;
    };
  };
};

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected googleClientId = environment.googleClientId;
  protected showPassword = signal(false);
  protected isLoading = signal(false);
  protected errorMessage = signal<string | null>(null);

  protected registerForm = new FormGroup(
    {
      firstName: new FormControl('', [Validators.required, Validators.maxLength(100)]),
      lastName: new FormControl('', [Validators.required, Validators.maxLength(100)]),
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

  protected get firstNameControl() {
    return this.registerForm.get('firstName')!;
  }
  protected get lastNameControl() {
    return this.registerForm.get('lastName')!;
  }
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

  ngAfterViewInit(): void {
    // Initialize Google Sign-In after view is ready
    if (this.googleClientId && typeof google !== 'undefined') {
      this.initializeGoogleSignIn();
    }
  }

  private initializeGoogleSignIn(): void {
    google.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: this.handleGoogleSignUp.bind(this),
      auto_select: false,
    });

    const buttonElement = document.querySelector('.g_id_signin');
    if (buttonElement) {
      google.accounts.id.renderButton(buttonElement as HTMLElement, {
        type: 'standard',
        shape: 'rectangular',
        theme: 'outline',
        text: 'signup_with',
        size: 'large',
        logo_alignment: 'left',
      });
    }
  }

  protected async handleGoogleSignUp(response: GoogleSignInResponse): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await lastValueFrom(this.authService.loginWithGoogle(response.credential));

      // Success - navigate to returnUrl if provided, otherwise household creation page
      const returnUrl = this.route.snapshot.queryParams['returnUrl'];
      if (returnUrl) {
        this.router.navigateByUrl(returnUrl);
      } else {
        this.router.navigate(['/household/create']);
      }
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
      const { email, password, firstName, lastName } = this.registerForm.value;
      await this.authService.register(email!, password!, firstName!, lastName!).toPromise();

      // Success - navigate to login, preserving returnUrl if provided
      const returnUrl = this.route.snapshot.queryParams['returnUrl'];
      const queryParams: Record<string, string> = { registered: 'true' };
      if (returnUrl) {
        queryParams['returnUrl'] = returnUrl;
      }
      this.router.navigate(['/login'], { queryParams });
    } catch (error: unknown) {
      const err = error as { error?: { error?: string } };
      this.errorMessage.set(err.error?.error || 'Registration failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
