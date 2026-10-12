import {
  Component,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HouseholdService } from '../services/household.service';
import { QrAuthService } from '../services/qr-auth.service';
import { TokenService } from '../services/token.service';
import { QrCodeScannerComponent } from '../components/qr-code-scanner/qr-code-scanner';
import { DidditMark } from '../components/diddit-mark/diddit-mark';
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
          width: number;
          logo_alignment: string;
        },
      ) => void;
    };
  };
};

type GoogleWindow = Window & {
  handleGoogleSignIn?: (response: GoogleSignInResponse) => void;
  onGoogleLibraryLoad?: () => void;
};

/** Which fields carry the red border: both on a refused sign-in, so neither is singled out */
type FieldError = 'none' | 'email' | 'password' | 'both';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
  imports: [ReactiveFormsModule, RouterLink, NgTemplateOutlet, QrCodeScannerComponent, DidditMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly householdService = inject(HouseholdService);
  private readonly qrAuthService = inject(QrAuthService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected googleClientId = environment.googleClientId;
  protected showPassword = signal(false);
  protected isLoading = signal(false);
  protected errorMessage = signal<string | null>(null);
  protected justRegistered = signal(false);
  protected showQrScanner = signal(false);

  /** A field has focus: on a phone the brand area collapses so «Logg inn» clears the keyboard */
  protected typing = signal(false);
  /** Google's own button has been drawn over ours */
  protected googleReady = signal(false);
  protected fieldError = signal<FieldError>('none');

  protected loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
    // No «Husk meg» in the approved login: a password sign-in keeps the session store
    rememberMe: new FormControl(false),
  });

  private readonly passwordValue = toSignal(this.loginForm.controls.password.valueChanges, {
    initialValue: '',
  });
  /** «Vis passord» appears only once there is a character to show */
  protected readonly hasPassword = computed(() => !!this.passwordValue());

  protected readonly emailInvalid = computed(() => ['email', 'both'].includes(this.fieldError()));
  protected readonly passwordInvalid = computed(() =>
    ['password', 'both'].includes(this.fieldError()),
  );
  protected readonly eyeLabel = computed(() =>
    this.showPassword()
      ? $localize`:@@login.password.hide:Skjul passord`
      : $localize`:@@login.password.show:Vis passord`,
  );

  private blurTimer: ReturnType<typeof setTimeout> | null = null;

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
    const w = window as GoogleWindow;
    // Make callback available globally for Google
    w.handleGoogleSignIn = this.handleGoogleSignIn.bind(this);
    // The Google script loads async; if it arrives after this view, draw the button then
    w.onGoogleLibraryLoad = () => this.initializeGoogleSignIn();
  }

  ngAfterViewInit(): void {
    if (this.googleClientId && typeof google !== 'undefined') {
      this.initializeGoogleSignIn();
    }
  }

  ngOnDestroy(): void {
    if (this.blurTimer) clearTimeout(this.blurTimer);
    const w = window as GoogleWindow;
    delete w.onGoogleLibraryLoad;
  }

  private initializeGoogleSignIn(): void {
    if (!this.googleClientId || typeof google === 'undefined') return;
    const layer = this.host.nativeElement.querySelector('.gsi-layer') as HTMLElement | null;
    if (!layer) return;

    google.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: this.handleGoogleSignIn.bind(this),
      auto_select: false,
    });
    google.accounts.id.renderButton(layer, {
      type: 'standard',
      shape: 'rectangular',
      theme: 'outline',
      text: 'continue_with',
      size: 'large',
      // Google caps the width at 400; the layer is clipped to our 49 px button
      width: Math.min(400, Math.max(200, Math.round(layer.getBoundingClientRect().width))),
      logo_alignment: 'center',
    });
    this.googleReady.set(true);
  }

  /** Our drawn Google button is only pressable when Google's own could not be drawn */
  protected onGoogleUnavailable(): void {
    this.fieldError.set('none');
    this.errorMessage.set(
      $localize`:@@login.googleUnavailable:Google-innlogging er ikke tilgjengelig akkurat nå. Prøv igjen om litt.`,
    );
  }

  protected async handleGoogleSignIn(response: GoogleSignInResponse): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.fieldError.set('none');

    try {
      await lastValueFrom(this.authService.loginWithGoogle(response.credential));

      // Auto-activate household after successful login
      await this.householdService.autoActivateHousehold();

      // Success - navigate to return URL or home
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
      this.router.navigateByUrl(returnUrl);
    } catch {
      this.errorMessage.set(
        $localize`:@@login.googleSigninFailed:Google-innloggingen gikk ikke. Prøv igjen.`,
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  protected onFieldFocus(event: FocusEvent): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (this.blurTimer) {
      clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }
    this.typing.set(true);
  }

  protected onFieldBlur(event: FocusEvent): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (event.relatedTarget instanceof HTMLInputElement) return;
    // Let a tap on «Logg inn» land before the brand area grows back and moves the form
    if (this.blurTimer) clearTimeout(this.blurTimer);
    this.blurTimer = setTimeout(() => {
      this.blurTimer = null;
      this.typing.set(false);
    }, 300);
  }

  protected async onSubmit(): Promise<void> {
    if (this.isLoading()) return;

    // Validate on press: the button is never a greyed-out dead end
    if (this.loginForm.invalid) {
      const emailBad = this.emailControl.invalid;
      const passwordBad = this.passwordControl.invalid;
      this.fieldError.set(emailBad && passwordBad ? 'both' : emailBad ? 'email' : 'password');
      this.errorMessage.set(
        emailBad && passwordBad && !this.emailControl.value
          ? $localize`:@@login.error.bothEmpty:Skriv inn e-post og passord.`
          : emailBad
            ? $localize`:@@login.error.email:Skriv inn en gyldig e-postadresse.`
            : $localize`:@@login.error.password:Skriv inn passordet ditt.`,
      );
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.fieldError.set('none');

    try {
      const { email, password, rememberMe } = this.loginForm.value;
      await lastValueFrom(this.authService.login(email!, password!, rememberMe || false));

      // Auto-activate household after successful login
      await this.householdService.autoActivateHousehold();

      // Success - navigate to return URL or home
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
      this.router.navigateByUrl(returnUrl);
    } catch (error: unknown) {
      const status = (error as { status?: number }).status;
      if (status === 401) {
        // Both fields, so the placement never reveals which one was wrong
        this.fieldError.set('both');
        this.errorMessage.set(
          $localize`:@@login.error.credentials:Feil e-post eller passord. Prøv igjen.`,
        );
      } else if (status === 429) {
        this.errorMessage.set(
          $localize`:@@login.error.tooMany:For mange forsøk. Vent litt, og prøv igjen.`,
        );
      } else {
        this.errorMessage.set(
          $localize`:@@login.loginFailed:Vi fikk ikke logget deg inn. Sjekk nettet, og prøv igjen.`,
        );
      }
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
    this.fieldError.set('none');
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
    } catch {
      this.errorMessage.set(
        $localize`:@@login.qrLoginFailed:QR-koden virket ikke. Be en voksen om en ny, og prøv igjen.`,
      );
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
