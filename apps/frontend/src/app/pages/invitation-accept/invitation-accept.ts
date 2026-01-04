import {
  Component,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { InvitationService, AcceptInvitationResponse } from '../../services/invitation.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-invitation-accept',
  imports: [CommonModule, RouterLink],
  templateUrl: './invitation-accept.html',
  styleUrl: './invitation-accept.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationAcceptComponent implements OnInit {
  private readonly invitationService = inject(InvitationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly token = signal<string | null>(null);
  protected readonly isLoading = signal(false);
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
      this.errorMessage.set('Invalid invitation link. No token provided.');
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
      this.successMessage.set(`Successfully joined "${response.household.name}"!`);

      // Redirect to home after a brief delay
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 2000);
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

    const confirmed = confirm('Are you sure you want to decline this invitation?');
    if (!confirmed) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    try {
      await this.invitationService.declineInvitation(token);
      this.successMessage.set('Invitation declined.');

      // Redirect to home after a brief delay
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 2000);
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
      this.errorMessage.set('Invitation not found or has already been processed.');
    } else if (err.status === 403) {
      this.errorMessage.set('This invitation is not for your email address.');
    } else if (err.status === 400) {
      this.errorMessage.set(err.error?.message || 'Invitation has expired or is no longer valid.');
    } else if (err.status === 409) {
      this.errorMessage.set('You are already a member of this household.');
    } else {
      this.errorMessage.set(err.error?.message || 'Something went wrong. Please try again.');
    }
  }
}
