import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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

      // Success - navigate to return URL or dashboard
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
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
