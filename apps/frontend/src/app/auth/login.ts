import {
  Component,
  signal,
  inject,
  ChangeDetectionStrategy,
  OnInit,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HouseholdService } from '../services/household.service';
import { QrAuthService } from '../services/qr-auth.service';
import { TokenService } from '../services/token.service';
import { QrCodeScannerComponent } from '../components/qr-code-scanner/qr-code-scanner';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

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
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, QrCodeScannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit, AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly householdService = inject(HouseholdService);
  private readonly qrAuthService = inject(QrAuthService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected googleClientId = environment.googleClientId;
  protected showPassword = signal(false);
  protected isLoading = signal(false);
  protected errorMessage = signal<string | null>(null);
  protected justRegistered = signal(false);
  protected showQrScanner = signal(false);

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

  ngAfterViewInit(): void {
    // Initialize Google Sign-In after view is ready
    if (this.googleClientId && typeof google !== 'undefined') {
      this.initializeGoogleSignIn();
    }
  }

  private initializeGoogleSignIn(): void {
    google.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: this.handleGoogleSignIn.bind(this),
      auto_select: false,
    });

    const buttonElement = document.querySelector('.g_id_signin');
    if (buttonElement) {
      google.accounts.id.renderButton(buttonElement as HTMLElement, {
        type: 'standard',
        shape: 'rectangular',
        theme: 'outline',
        text: 'signin_with',
        size: 'large',
        logo_alignment: 'left',
      });
    }
  }

  protected async handleGoogleSignIn(response: GoogleSignInResponse): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await lastValueFrom(this.authService.loginWithGoogle(response.credential));

      // Auto-activate household after successful login
      await this.householdService.autoActivateHousehold();

      // Success - navigate to return URL or home
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
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

      // Auto-activate household after successful login
      await this.householdService.autoActivateHousehold();

      // Success - navigate to return URL or home
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
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

  /**
   * Toggle QR code scanner
   */
  protected toggleQrScanner(): void {
    this.showQrScanner.update((v) => !v);
    this.errorMessage.set(null);
  }

  /**
   * Handle QR code scanned
   */
  protected async onQrCodeScanned(token: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.showQrScanner.set(false);

    try {
      const response = await lastValueFrom(this.qrAuthService.loginWithQrToken(token));

      // Store tokens using TokenService (always use persistent storage for QR login)
      this.tokenService.storeTokens(response.accessToken, response.refreshToken, 'persistent');

      // Update auth service state
      this.authService.currentUser.set({
        id: response.userId,
        email: response.email,
        role: response.role,
        firstName: response.firstName,
        lastName: response.lastName,
      });
      this.authService.isAuthenticated.set(true);

      // Auto-activate household after successful login
      await this.householdService.autoActivateHousehold();

      // Success - navigate to return URL or home
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
      this.router.navigateByUrl(returnUrl);
    } catch (error: unknown) {
      const err = error as {
        error?: { error?: string; message?: string };
      };
      const message = err.error?.error || 'QR code login failed. Please try again.';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Handle QR scanner cancelled
   */
  protected onQrScanCancelled(): void {
    this.showQrScanner.set(false);
  }
}
