import { Component, signal, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment.development';

interface GoogleSignInResponse {
  credential: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected googleClientId = environment.googleClientId;
  protected showPassword = signal(false);
  protected isLoading = signal(false);
  protected errorMessage = signal<string | null>(null);
  protected justRegistered = signal(false);

  protected loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
    rememberMe: new FormControl(false),
  });

  protected get emailControl() {
    return this.loginForm.get('email')!;
  }
  protected get passwordControl() {
    return this.loginForm.get('password')!;
  }

  constructor() {
    // Check if user just registered
    this.justRegistered.set(this.route.snapshot.queryParams['registered'] === 'true');
  }

  ngOnInit(): void {
    // Make callback available globally for Google
    (
      window as Window & { handleGoogleSignIn?: (response: GoogleSignInResponse) => void }
    ).handleGoogleSignIn = this.handleGoogleSignIn.bind(this);
  }

  protected async handleGoogleSignIn(response: GoogleSignInResponse): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await lastValueFrom(this.authService.loginWithGoogle(response.credential));

      // Success - navigate to return URL or household creation page
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/household/create';
      this.router.navigateByUrl(returnUrl);
    } catch (error: unknown) {
      const err = error as { error?: { error?: string; message?: string } };
      const message = err.error?.error || 'Google sign-in failed. Please try again.';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  protected async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const { email, password, rememberMe } = this.loginForm.value;
      await lastValueFrom(this.authService.login(email!, password!, rememberMe || false));

      // Success - navigate to return URL or household creation page
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/household/create';
      this.router.navigateByUrl(returnUrl);
    } catch (error: unknown) {
      const err = error as {
        error?: { error?: string; message?: string };
      };
      const message =
        err.error?.error || err.error?.message || 'Login failed. Please check your credentials.';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
