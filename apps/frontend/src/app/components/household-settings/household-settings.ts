import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  LOCALE_ID,
} from '@angular/core';
import { Router } from '@angular/router';
import { HouseholdService } from '../../services/household.service';
import { InvitationService, Invitation } from '../../services/invitation.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { PageComponent } from '../page/page';

export type InviteRole = 'parent' | 'admin';

/** A sent invitation as its card shows it: pending, or past its date */
export interface SentInvitation {
  id: string;
  email: string;
  role: InviteRole;
  expired: boolean;
  createdAt: string;
  expiresAt: string;
}

/** «9. nov.» in the build's own language, or «i dag» for today */
export function shortDay(iso: string, now: Date = new Date(), locale = 'nb'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (d.toDateString() === now.toDateString()) return $localize`:@@invitations.today:i dag`;
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d);
}

/**
 * «Invitasjoner til husstanden» (ST-2068, approved on ST-2076): invite someone to the household
 * and see what you have sent. The household name lives on «Husstander», members and children on
 * «Familie». Admin only: anyone else is sent to «Familie».
 */
@Component({
  selector: 'app-household-settings',
  imports: [PageComponent],
  templateUrl: './household-settings.html',
  styleUrl: './household-settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseholdSettingsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly householdService = inject(HouseholdService);
  private readonly invitationService = inject(InvitationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly locale = inject(LOCALE_ID);

  protected readonly title = $localize`:@@invitations.title:Invitasjoner til husstanden`;
  protected readonly householdId = signal<string | null>(null);
  protected readonly householdName = signal('');
  protected readonly ready = signal(false);

  // The form
  protected readonly email = signal('');
  protected readonly role = signal<InviteRole>('parent');
  protected readonly sending = signal(false);
  protected readonly sendError = signal('');
  /** The receipt after a send: who it went to, and the link */
  protected readonly sentTo = signal('');
  protected readonly link = signal('');
  protected readonly copied = signal(false);

  // The list
  protected readonly listLoading = signal(true);
  protected readonly listError = signal(false);
  protected readonly invitations = signal<SentInvitation[]>([]);
  protected readonly hasExpired = computed(() => this.invitations().some((i) => i.expired));
  /** Polite announcements: withdrawn, cleaned up (4.1.3) */
  protected readonly announce = signal('');

  async ngOnInit(): Promise<void> {
    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) {
      await this.router.navigate(['/household/create']);
      return;
    }
    try {
      const household = await this.householdService.getHousehold(householdId);
      if (household.role !== 'admin') {
        await this.router.navigate(['/family']);
        return;
      }
      this.householdId.set(householdId);
      this.householdName.set(household.name);
      this.ready.set(true);
    } catch {
      await this.router.navigate(['/family']);
      return;
    }
    await this.loadInvitations();
  }

  async loadInvitations(): Promise<void> {
    const householdId = this.householdId();
    if (!householdId) return;
    this.listLoading.set(true);
    this.listError.set(false);
    try {
      const res = await this.invitationService.listSentInvitations(householdId);
      const now = Date.now();
      this.invitations.set(
        res.invitations
          .filter((i) => i.status === 'pending' || i.status === 'expired')
          .map((i: Invitation) => ({
            id: i.id,
            email: i.invitedEmail,
            role: i.role === 'admin' ? 'admin' : 'parent',
            expired: i.status === 'expired' || new Date(i.expiresAt).getTime() < now,
            createdAt: i.createdAt,
            expiresAt: i.expiresAt,
          })),
      );
    } catch {
      this.listError.set(true);
    } finally {
      this.listLoading.set(false);
    }
  }

  protected onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
    this.sendError.set('');
  }

  /** «Send invitasjon» stays yellow; the check happens on the press (rule 6) */
  async send(): Promise<void> {
    const householdId = this.householdId();
    if (!householdId || this.sending()) return;
    const email = this.email().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.sendError.set($localize`:@@invitations.emailInvalid:Skriv en gyldig e-postadresse.`);
      return;
    }

    this.sending.set(true);
    this.sendError.set('');
    try {
      const res = await this.invitationService.sendInvitation(householdId, email, this.role());
      this.sentTo.set(email);
      this.link.set(new URL(`invitations/accept/${res.token}`, document.baseURI).href);
      this.copied.set(false);
      this.email.set('');
      this.role.set('parent');
      await this.loadInvitations();
    } catch (error: unknown) {
      this.sendError.set(this.sendErrorText(error));
    } finally {
      this.sending.set(false);
    }
  }

  /** The backend speaks English: map it, never show it (rule 8) */
  private sendErrorText(error: unknown): string {
    const http = error as { status?: number; error?: { message?: string } };
    if (http?.status === 400) {
      return $localize`:@@invitations.emailInvalid:Skriv en gyldig e-postadresse.`;
    }
    if (http?.status === 409) {
      const message = http.error?.message?.toLowerCase() ?? '';
      if (message.includes('already a household member')) {
        return $localize`:@@invitations.alreadyMember:Denne personen er allerede med i husstanden.`;
      }
      return $localize`:@@invitations.alreadyInvited:Denne adressen er allerede invitert.`;
    }
    return $localize`:@@invitations.sendFailed:Vi fikk ikke sendt invitasjonen. Prøv igjen.`;
  }

  async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link());
      this.copied.set(true);
    } catch {
      this.copied.set(false);
      this.announce.set(
        $localize`:@@invitations.copyFailed:Vi fikk ikke kopiert lenken. Merk den og kopier den selv.`,
      );
    }
  }

  /** No confirm: it is reversible, you simply invite again (3.3.4) */
  async withdraw(invitation: SentInvitation): Promise<void> {
    const householdId = this.householdId();
    if (!householdId) return;
    try {
      await this.invitationService.cancelInvitation(householdId, invitation.id);
      this.invitations.update((list) => list.filter((i) => i.id !== invitation.id));
      this.announce.set(
        $localize`:@@invitations.withdrawn:Invitasjonen til ${invitation.email}:email: er trukket tilbake.`,
      );
    } catch {
      this.announce.set(
        $localize`:@@invitations.withdrawFailed:Vi fikk ikke trukket tilbake invitasjonen. Prøv igjen.`,
      );
    }
  }

  /** «Rydd opp gamle» removes the expired rows, and its confirm line says how many */
  async cleanUp(): Promise<void> {
    const householdId = this.householdId();
    const count = this.invitations().filter((i) => i.expired).length;
    if (!householdId || count === 0) return;
    const confirmed = await this.confirmDialog.confirm({
      title: $localize`:@@invitations.cleanupTitle:Rydde opp gamle invitasjoner?`,
      message:
        count === 1
          ? $localize`:@@invitations.cleanupOne:1 utløpt invitasjon fjernes fra listen.`
          : $localize`:@@invitations.cleanupMany:${count}:count: utløpte invitasjoner fjernes fra listen.`,
      confirmLabel: $localize`:@@invitations.cleanupConfirm:Rydd opp`,
    });
    if (!confirmed) return;
    try {
      await this.invitationService.cleanupInvitations(householdId);
      await this.loadInvitations();
      this.announce.set($localize`:@@invitations.cleanedUp:De gamle invitasjonene er fjernet.`);
    } catch {
      this.announce.set(
        $localize`:@@invitations.cleanupFailed:Vi fikk ikke ryddet opp. Prøv igjen.`,
      );
    }
  }

  /** The address split before its last «@», so it breaks there first (D14) */
  protected emailParts(email: string): [string, string] {
    const at = email.lastIndexOf('@');
    return at > 0 ? [email.slice(0, at), email.slice(at)] : [email, ''];
  }

  protected roleLabel(role: InviteRole): string {
    return role === 'admin'
      ? $localize`:@@invitations.roleAdmin:Administrator`
      : $localize`:@@invitations.roleParent:Forelder`;
  }

  protected detailLine(invitation: SentInvitation): string {
    const role = this.roleLabel(invitation.role);
    const sent = shortDay(invitation.createdAt, new Date(), this.locale);
    const until = shortDay(invitation.expiresAt, new Date(), this.locale);
    return invitation.expired
      ? $localize`:@@invitations.detailExpired:${role}:role: · sendt ${sent}:sent: · utløp ${until}:until:`
      : $localize`:@@invitations.detailPending:${role}:role: · sendt ${sent}:sent: · utløper ${until}:until:`;
  }
}
