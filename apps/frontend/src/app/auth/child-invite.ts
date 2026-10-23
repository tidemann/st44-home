import {
  Component,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { TopTabs } from '../components/navigation/top-tabs/top-tabs';
import { AuthService } from '../services/auth.service';
import { HouseholdService } from '../services/household.service';
import {
  ChildInvitationService,
  formatDayMonth,
  type ChildInvitationInfo,
} from '../services/child-invitation.service';
import {
  passwordStrengthValidator,
  passwordMatchValidator,
} from '../utils/password-validation.utils';

type PageState = 'loading' | 'form' | 'expired' | 'cancelled' | 'invalid' | 'used';

/**
 * «Lag passordet ditt» (ST-1678): the child opens the link a parent made, sets their own
 * password and lands in «Mine oppgaver» with the same points and history. It is the
 * «Sett nytt passord» page with other words: same band, same column, same form.
 * A dead link (expired, cancelled, used) shows one title and one sentence.
 */
@Component({
  selector: 'app-child-invite',
  templateUrl: './child-invite.html',
  styleUrls: ['./reset-password.css', './child-invite.css'],
  imports: [ReactiveFormsModule, RouterLink, TopTabs],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildInviteComponent implements OnInit {
  private readonly invitations = inject(ChildInvitationService);
  private readonly authService = inject(AuthService);
  private readonly householdService = inject(HouseholdService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly state = signal<PageState>('loading');
  protected readonly info = signal<ChildInvitationInfo | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  private token = '';

  protected readonly form = new FormGroup(
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
    return this.form.controls.newPassword;
  }

  protected get confirmPasswordControl() {
    return this.form.controls.confirmPassword;
  }

  protected readonly expiredOn = computed(() => {
    const info = this.info();
    return info ? formatDayMonth(info.expiresAt) : '';
  });

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    try {
      const info = await this.invitations.info(this.token);
      this.info.set(info);
      this.state.set(info.state === 'valid' ? 'form' : info.state);
    } catch {
      this.state.set('invalid');
    }
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  /** The page's own strength line */
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
    if (this.isLoading()) return;

    // Checked on the press: the button is never a greyed-out dead end (guide, rule 6)
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    const password = this.form.value.newPassword!;

    let email: string;
    try {
      email = (await this.invitations.accept(this.token, password)).email;
    } catch (error: unknown) {
      this.isLoading.set(false);
      if ((error as { status?: number })?.status === 410) {
        // Expired, cancelled or used while the page was open
        await this.ngOnInit();
      } else {
        this.errorMessage.set(
          $localize`:@@childInvite.failed:Kunne ikke lage passordet. Prøv igjen, eller be om en ny lenke.`,
        );
      }
      return;
    }

    // The password is set. Log straight in; if that fails, the login page takes over.
    try {
      await lastValueFrom(this.authService.login(email, password));
      await this.householdService.autoActivateHousehold();
      await this.router.navigateByUrl('/my-tasks');
    } catch {
      await this.router.navigate(['/login']);
    } finally {
      this.isLoading.set(false);
    }
  }
}
