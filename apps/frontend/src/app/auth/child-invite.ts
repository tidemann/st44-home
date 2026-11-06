import {
  Component,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  OnInit,
  ElementRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { TopTabs } from '../components/navigation/top-tabs/top-tabs';
import { DidditMark } from '../components/diddit-mark/diddit-mark';
import { AuthService } from '../services/auth.service';
import { HouseholdService } from '../services/household.service';
import { HouseholdStore } from '../stores/household.store';
import {
  ChildInvitationService,
  formatDayMonth,
  type ChildInvitationInfo,
  type ExistingLinkInfo,
  type ExistingLinkRefusalBody,
} from '../services/child-invitation.service';
import {
  passwordStrengthValidator,
  passwordMatchValidator,
} from '../utils/password-validation.utils';
import { maskEmail } from '../utils/mask-email';
import { roleWord, type HouseholdRole, type LinkedChildState } from '../utils/household-role';

/**
 * ST-2227: an account that already exists (Google) is linked to the child profile here too:
 * - entry:     not signed in. The invitation, «Fortsett med Google», or «Lag passord».
 * - consent:   signed in with the invited Google account. Household, profile, role, what
 *              happens; «Godta», «Avslå», «Bytt Google-konto».
 * - wrong / notGoogle / member / linked: refused, nothing changed, the way out.
 * Signing in with Google never accepts anything; only «Godta» does.
 */
type PageState =
  | 'loading'
  | 'entry'
  | 'form'
  | 'consent'
  | 'wrong'
  | 'notGoogle'
  | 'member'
  | 'linked'
  | 'expired'
  | 'cancelled'
  | 'invalid'
  | 'used';

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
  imports: [ReactiveFormsModule, RouterLink, NgTemplateOutlet, TopTabs, DidditMark],
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
      if (info.state !== 'valid') {
        this.setState(info.state);
      } else if (this.authService.isAuthenticated()) {
        await this.checkExisting();
      } else {
        this.setState('entry');
      }
    } catch {
      this.setState('invalid');
    }
  }

  // ===== ST-2227: an existing Google account =====

  protected readonly existing = signal<ExistingLinkInfo | null>(null);
  protected readonly refusal = signal<ExistingLinkRefusalBody | null>(null);
  protected readonly accepting = signal(false);
  protected readonly acceptError = signal<string | null>(null);
  protected readonly signedIn = computed(() => this.authService.isAuthenticated());
  /** The states drawn with their own band (ST-2227) */
  protected readonly linkPage = computed(() => {
    const s = this.state();
    if (['entry', 'consent', 'wrong', 'notGoogle', 'member', 'linked'].includes(s)) return true;
    return this.signedIn() && ['expired', 'cancelled', 'used', 'invalid'].includes(s);
  });

  /** «jo•••@gmail.com»: the invited e-mail as the link may show it */
  protected readonly maskedEmail = computed(() => maskEmail(this.info()?.email ?? ''));
  protected readonly householdName = computed(
    () =>
      this.existing()?.householdName ??
      this.refusal()?.householdName ??
      this.info()?.householdName ??
      '',
  );
  protected readonly childName = computed(
    () => this.existing()?.childName ?? this.refusal()?.childName ?? this.info()?.childName ?? '',
  );
  protected readonly inviterName = computed(
    () =>
      this.existing()?.inviterName ?? this.refusal()?.inviterName ?? this.info()?.inviterName ?? '',
  );
  protected readonly points = computed(() => this.existing()?.points ?? this.info()?.points ?? 0);
  protected readonly signedInEmail = computed(
    () =>
      this.existing()?.signedInEmail ??
      this.refusal()?.signedInEmail ??
      this.authService.currentUser()?.email ??
      '',
  );
  /** The other households the account keeps, for «Du er fortsatt … i …» */
  protected readonly otherHouseholds = computed(() =>
    this.householdStore.households().map((h) => ({ name: h.name, role: roleWord(h.role) })),
  );
  protected readonly memberRole = computed(() =>
    roleWord((this.refusal()?.role ?? 'parent') as HouseholdRole),
  );

  private readonly householdStore = inject(HouseholdStore);
  private readonly host = inject(ElementRef<HTMLElement>);

  /** A new state moves focus to its title, so keyboard and screen reader land on it */
  private setState(state: PageState): void {
    this.state.set(state);
    setTimeout(() => this.host.nativeElement.querySelector('h1')?.focus());
  }

  private async checkExisting(): Promise<void> {
    try {
      this.existing.set(await this.invitations.existing(this.token));
      this.refusal.set(null);
      void this.householdStore.loadHouseholds().catch(() => undefined);
      this.setState('consent');
    } catch (error: unknown) {
      this.showRefusal(error);
    }
  }

  private showRefusal(error: unknown): void {
    const status = (error as { status?: number })?.status;
    const body = ((error as { error?: ExistingLinkRefusalBody })?.error ??
      {}) as ExistingLinkRefusalBody;
    this.refusal.set(body);
    this.existing.set(null);
    switch (body.code) {
      case 'WRONG_ACCOUNT':
        return this.setState('wrong');
      case 'NOT_GOOGLE':
        return this.setState('notGoogle');
      case 'ALREADY_MEMBER':
        return this.setState('member');
      case 'PROFILE_LINKED':
        return this.setState('linked');
      case 'EXPIRED':
        return this.setState('expired');
      case 'CANCELLED':
        return this.setState('cancelled');
      case 'USED':
        return this.setState('used');
      case 'NOT_FOUND':
        return this.setState('invalid');
    }
    if (status === 401) {
      // The session ran out: sign in again, nothing was accepted
      this.setState('entry');
      return;
    }
    this.acceptError.set(
      $localize`:@@childInvite.existing.failed:Noe gikk galt. Ingenting er endret. Prøv igjen.`,
    );
  }

  /** The return address after Google: this page, where the consent waits */
  private get returnUrl(): string {
    return `/invitasjon/${this.token}`;
  }

  /** «Fortsett med Google»: sign in only; nothing is accepted until «Godta» */
  protected continueWithGoogle(): void {
    void this.router.navigate(['/login'], { queryParams: { returnUrl: this.returnUrl } });
  }

  /** «Lag passord»: the ST-1678 password form, unchanged */
  protected choosePassword(): void {
    this.setState('form');
  }

  /** «Bytt Google-konto»: sign out here and back to Google, then back to this page */
  protected switchAccount(): void {
    this.authService.logout(this.returnUrl);
  }

  /** «Avslå» / «Avbryt»: nothing is changed and the link stays with the parent */
  protected decline(): void {
    void this.router.navigateByUrl(this.signedIn() ? '/' : '/login');
  }

  /** «Gå til Familien Nordmann» (already a member there) */
  protected goToMemberHousehold(): void {
    const id = this.refusal()?.householdId;
    if (id) this.householdStore.setActiveHousehold(id);
    void this.router.navigateByUrl('/');
  }

  protected goHome(): void {
    void this.router.navigateByUrl(this.signedIn() ? '/' : '/login');
  }

  /** «Godta: bli barn i …»: the one place the link is spent */
  protected async acceptExisting(): Promise<void> {
    if (this.accepting()) return;
    this.accepting.set(true);
    this.acceptError.set(null);
    try {
      const result = await this.invitations.acceptExisting(this.token);
      await this.householdStore.loadHouseholds({ forceRefresh: true }).catch(() => undefined);
      this.householdStore.setActiveHousehold(result.householdId);
      const state: LinkedChildState = { linkedHousehold: result.householdName };
      await this.router.navigateByUrl('/my-tasks', { state });
    } catch (error: unknown) {
      this.showRefusal(error);
    } finally {
      this.accepting.set(false);
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
      } else if ((error as { error?: { error?: string } })?.error?.error === 'ACCOUNT_EXISTS') {
        // ST-2227: the e-mail already has a login; that account accepts with Google
        this.errorMessage.set(
          $localize`:@@childInvite.accountExists:Denne e-posten har allerede en Diddit-konto. Gå tilbake og velg «Fortsett med Google».`,
        );
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
