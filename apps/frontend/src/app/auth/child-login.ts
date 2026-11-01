import {
  Component,
  signal,
  inject,
  ChangeDetectionStrategy,
  ElementRef,
  Injector,
  afterNextRender,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TopTabs } from '../components/navigation/top-tabs/top-tabs';
import { DidditMark } from '../components/diddit-mark/diddit-mark';
import { QrCodeScannerComponent } from '../components/qr-code-scanner/qr-code-scanner';
import { AuthService } from '../services/auth.service';
import { QrAuthService } from '../services/qr-auth.service';
import { TokenService } from '../services/token.service';
import { HouseholdService } from '../services/household.service';
import { lastValueFrom } from 'rxjs';

/** ST-1999: QR first, e-mail second (Stig, option A on ST-1892) */
type ChildLoginMode = 'choices' | 'form' | 'scan';

@Component({
  selector: 'app-child-login',
  templateUrl: './child-login.html',
  styleUrl: './child-login.css',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TopTabs,
    DidditMark,
    QrCodeScannerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildLoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly qrAuthService = inject(QrAuthService);
  private readonly tokenService = inject(TokenService);
  private readonly householdService = inject(HouseholdService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected mode = signal<ChildLoginMode>('choices');

  protected showPassword = signal(false);
  protected isLoading = signal(false);
  protected errorMessage = signal<string | null>(null);
  /** A refused QR code, shown under the two choices */
  protected qrError = signal<string | null>(null);
  /** A refused sign-in marks both fields, as login.ts does on a 401 */
  protected credentialsRefused = signal(false);

  // Switching choice replaces the column, so focus follows it (ST-1999 W2, WCAG 2.4.3)
  protected chooseScan(): void {
    this.qrError.set(null);
    this.mode.set('scan');
    this.focusAfterRender('.qr-scanner-section');
  }

  protected chooseEmail(): void {
    this.qrError.set(null);
    this.mode.set('form');
    this.focusAfterRender('#email');
  }

  protected back(): void {
    this.mode.set('choices');
    this.focusAfterRender('.qr-choice');
  }

  protected async onQrCodeScanned(token: string): Promise<void> {
    this.mode.set('choices');
    this.isLoading.set(true);
    this.qrError.set(null);

    try {
      const response = await lastValueFrom(this.qrAuthService.loginWithQrToken(token));

      // As the parent login's QR sign-in: persistent tokens, then the auth state
      this.tokenService.storeTokens(response.accessToken, response.refreshToken, 'persistent');
      this.authService.currentUser.set({
        id: response.userId,
        email: response.email,
        role: response.role,
        firstName: response.firstName,
        lastName: response.lastName,
      });
      this.authService.isAuthenticated.set(true);
      await this.householdService.autoActivateHousehold();

      this.router.navigate(['/my-tasks']);
    } catch {
      this.qrError.set(
        $localize`:@@login.qrLoginFailed:QR-koden virket ikke. Be en voksen om en ny, og prøv igjen.`,
      );
      this.focusAfterRender('.qr-choice');
    } finally {
      this.isLoading.set(false);
    }
  }

  private focusAfterRender(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }

  protected loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  protected get emailControl() {
    return this.loginForm.get('email')!;
  }

  protected get passwordControl() {
    return this.loginForm.get('password')!;
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  protected async onSubmit(): Promise<void> {
    if (this.isLoading()) return;

    // Validate on press: the button is never a greyed-out dead end (guide, rule 6)
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.credentialsRefused.set(false);

    try {
      const { email, password } = this.loginForm.value;
      await lastValueFrom(this.authService.login(email!, password!, false));

      // Success - navigate to child dashboard
      this.router.navigate(['/my-tasks']);
    } catch (error: unknown) {
      this.credentialsRefused.set(true);
      // The signed-off login's own sentence for a refused sign-in (ST-1999 W9)
      this.errorMessage.set(
        $localize`:@@childLogin.loginFailed:Feil e-post eller passord. Prøv igjen.`,
      );
      console.error('Login failed:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
