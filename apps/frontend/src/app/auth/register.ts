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
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DidditMark } from '../components/diddit-mark/diddit-mark';
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
          width: number;
          logo_alignment: string;
        },
      ) => void;
    };
  };
};

type GoogleWindow = Window & {
  handleGoogleSignUp?: (response: GoogleSignInResponse) => void;
  onGoogleLibraryLoad?: () => void;
};

/**
 * Create account. The same brand area, fields, buttons and states as the login (ST-954);
 * its styles are the login's, with register.css for the fields the login does not have.
 */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, NgTemplateOutlet, DidditMark],
  templateUrl: './register.html',
  styleUrls: ['./login.css', './register.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent implements OnInit, AfterViewInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected googleClientId = environment.googleClientId;
  protected showPassword = signal(false);
  protected isLoading = signal(false);
  protected errorMessage = signal<string | null>(null);

  /** A field has focus: on a phone the brand area collapses, as on the login */
  protected typing = signal(false);
  /** Google's own button has been drawn over ours */
  protected googleReady = signal(false);
  /** «Opprett konto» has been pressed: every field still wrong shows its line */
  private readonly submitted = signal(false);

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

  protected readonly text = {
    firstNameRequired: $localize`:@@error.firstName.required:Fornavn er påkrevd`,
    firstNameTooLong: $localize`:@@error.firstName.tooLong:Fornavnet er for langt`,
    lastNameRequired: $localize`:@@error.lastName.required:Etternavn er påkrevd`,
    lastNameTooLong: $localize`:@@error.lastName.tooLong:Etternavnet er for langt`,
    emailRequired: $localize`:@@error.email.required:E-post er påkrevd`,
    emailInvalid: $localize`:@@login.error.email:Skriv inn en gyldig e-postadresse.`,
    passwordRequirements: $localize`:@@error.password.requirements:Passordet må være minst 8 tegn med store bokstaver, små bokstaver og tall`,
    confirmRequired: $localize`:@@register.confirmPassword.required:Skriv passordet en gang til.`,
    mismatch: $localize`:@@error.password.mismatch:Passordene samsvarer ikke`,
  };

  private readonly passwordValue = toSignal(this.registerForm.controls.password.valueChanges, {
    initialValue: '',
  });

  /** «Vis passord» appears only once there is a character to show */
  protected readonly hasPassword = computed(() => !!this.passwordValue());
  protected readonly eyeLabel = computed(() =>
    this.showPassword()
      ? $localize`:@@login.password.hide:Skjul passord`
      : $localize`:@@login.password.show:Vis passord`,
  );

  private blurTimer: ReturnType<typeof setTimeout> | null = null;

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

  protected passwordStrength = computed(() => getPasswordStrength(this.passwordValue() || ''));

  protected readonly strengthLabel = computed(() => {
    switch (this.passwordStrength()) {
      case 'strong':
        return $localize`:@@register.password.strong:sterkt`;
      case 'medium':
        return $localize`:@@register.password.medium:middels`;
      default:
        return $localize`:@@register.password.weak:svakt`;
    }
  });

  /** The second password is wrong when it is empty or does not match, once it has been left */
  protected confirmInvalid(): boolean {
    const control = this.confirmPasswordControl;
    const seen = control.touched || this.submitted();
    return seen && (control.invalid || !!this.registerForm.errors?.['passwordMismatch']);
  }

  /** A field shows its line once it has been left, or once «Opprett konto» was pressed */
  protected showError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  ngOnInit(): void {
    const w = window as GoogleWindow;
    // Make callback available globally for Google
    w.handleGoogleSignUp = this.handleGoogleSignUp.bind(this);
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
      callback: this.handleGoogleSignUp.bind(this),
      auto_select: false,
    });
    google.accounts.id.renderButton(layer, {
      type: 'standard',
      shape: 'rectangular',
      theme: 'outline',
      text: 'signup_with',
      size: 'large',
      // Google caps the width at 400; the layer is clipped to our 49 px button
      width: Math.min(400, Math.max(200, Math.round(layer.getBoundingClientRect().width))),
      logo_alignment: 'center',
    });
    this.googleReady.set(true);
  }

  /** Our drawn Google button is only pressable when Google's own could not be drawn */
  protected onGoogleUnavailable(): void {
    this.errorMessage.set(
      $localize`:@@login.googleUnavailable:Google-innlogging er ikke tilgjengelig akkurat nå. Prøv igjen om litt.`,
    );
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
      const message =
        err.error?.error ||
        $localize`:@@register.googleSignupFailed:Google-registrering feilet. Vennligst prøv igjen.`;
      this.errorMessage.set(message);
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
    // Let a tap on «Opprett konto» land before the brand area grows back and moves the form
    if (this.blurTimer) clearTimeout(this.blurTimer);
    this.blurTimer = setTimeout(() => {
      this.blurTimer = null;
      this.typing.set(false);
    }, 300);
  }

  protected async onSubmit(): Promise<void> {
    if (this.isLoading()) return;

    // Validate on press: the button is never a greyed-out dead end
    if (this.registerForm.invalid) {
      this.submitted.set(true);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const { email, password, firstName, lastName } = this.registerForm.value;
      await lastValueFrom(this.authService.register(email!, password!, firstName!, lastName!));

      // Success - navigate to login, preserving returnUrl if provided
      const returnUrl = this.route.snapshot.queryParams['returnUrl'];
      const queryParams: Record<string, string> = { registered: 'true' };
      if (returnUrl) {
        queryParams['returnUrl'] = returnUrl;
      }
      this.router.navigate(['/login'], { queryParams });
    } catch (error: unknown) {
      const err = error as { error?: { error?: string } };
      this.errorMessage.set(
        err.error?.error ||
          $localize`:@@register.registrationFailed:Registrering feilet. Vennligst prøv igjen.`,
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
