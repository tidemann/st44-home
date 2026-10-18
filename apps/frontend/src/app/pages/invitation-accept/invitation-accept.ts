import {
  Component,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
  computed,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { TopTabs } from '../../components/navigation/top-tabs/top-tabs';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { timer } from 'rxjs';
import { InvitationService, AcceptInvitationResponse } from '../../services/invitation.service';
import { AuthService } from '../../services/auth.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

const REDIRECT_DELAY_MS = 2000;

@Component({
  selector: 'app-invitation-accept',
  imports: [CommonModule, RouterLink, TopTabs],
  templateUrl: './invitation-accept.html',
  styleUrl: './invitation-accept.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationAcceptComponent implements OnInit {
  private readonly invitationService = inject(InvitationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly token = signal<string | null>(null);
  protected readonly isProcessing = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly householdName = signal<string | null>(null);
  protected readonly isAuthenticated = computed(() => this.authService.isAuthenticated());
  protected readonly loginUrl = computed(() => {
    const token = this.token();
    if (!token) return '/login';
    return `/login?returnUrl=${encodeURIComponent(`/invitations/accept/${token}`)}`;
  });
  protected readonly registerUrl = computed(() => {
    const token = this.token();
    if (!token) return '/register';
    return `/register?returnUrl=${encodeURIComponent(`/invitations/accept/${token}`)}`;
  });

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.errorMessage.set('Lenken til invitasjonen er ugyldig.');
      return;
    }
    this.token.set(token);
  }

  async acceptInvitation(): Promise<void> {
    const token = this.token();
    if (!token || this.isProcessing()) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    try {
      const response: AcceptInvitationResponse =
        await this.invitationService.acceptInvitation(token);

      this.householdName.set(response.household.name);
      this.successMessage.set(`Du er nå med i «${response.household.name}».`);

      // Redirect to home after a brief delay (with proper cleanup)
      this.redirectToHomeAfterDelay();
    } catch (error: unknown) {
      console.error('Failed to accept invitation:', error);
      this.handleError(error);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async declineInvitation(): Promise<void> {
    const token = this.token();
    if (!token || this.isProcessing()) return;

    const confirmed = await this.confirmDialog.confirm({
      title: $localize`:@@invitationAccept.declineTitle:Avslå invitasjonen?`,
      message: $localize`:@@invitationAccept.declineMessage:Du blir ikke med i husstanden. Dette kan ikke angres.`,
      confirmLabel: $localize`:@@invitationAccept.declineConfirm:Avslå`,
      danger: true,
    });
    if (!confirmed) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    try {
      await this.invitationService.declineInvitation(token);
      this.successMessage.set('Invitasjonen er avslått.');

      // Redirect to home after a brief delay (with proper cleanup)
      this.redirectToHomeAfterDelay();
    } catch (error: unknown) {
      console.error('Failed to decline invitation:', error);
      this.handleError(error);
    } finally {
      this.isProcessing.set(false);
    }
  }

  private handleError(error: unknown): void {
    const err = error as {
      error?: { error?: string; message?: string };
      status?: number;
    };

    if (err.status === 404) {
      this.errorMessage.set('Fant ikke invitasjonen, eller den er allerede brukt.');
    } else if (err.status === 403) {
      this.errorMessage.set('Denne invitasjonen er ikke til din e-postadresse.');
    } else if (err.status === 400) {
      this.errorMessage.set(
        err.error?.message || 'Invitasjonen har utløpt eller gjelder ikke lenger.',
      );
    } else if (err.status === 409) {
      this.errorMessage.set('Du er allerede med i denne husstanden.');
    } else {
      this.errorMessage.set(err.error?.message || 'Noe gikk galt. Prøv igjen.');
    }
  }

  private redirectToHomeAfterDelay(): void {
    timer(REDIRECT_DELAY_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.router.navigate(['/home']);
      });
  }
}
