import {
  Component,
  input,
  output,
  signal,
  inject,
  effect,
  computed,
  untracked,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../modal/modal';
import {
  ChildInvitationService,
  type ChildInvitation,
} from '../../../services/child-invitation.service';

/** A whole address: something@domain.tld (Validators.email lets «mathea@eksempel» through) */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Popup 18, «Inviter [navn] på e-post» (ST-1678, approved on ST-1639)
 *
 * Step 1 asks for the child's address and makes a 7-day link tied to the child's profile.
 * Step 2 shows the link with the yellow «Kopier lenke» in the body and «Lukk» alone in the
 * action row. No e-mail is sent yet (ST-1362).
 */
@Component({
  selector: 'app-child-invite-modal',
  imports: [Modal, ReactiveFormsModule],
  templateUrl: './child-invite-modal.html',
  styleUrl: './child-invite-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildInviteModal {
  private readonly invitations = inject(ChildInvitationService);

  open = input<boolean>(false);
  householdId = input.required<string>();
  childId = input.required<string>();
  childName = input.required<string>();
  /** An address to start from, for «Inviter [navn] på nytt» */
  initialEmail = input<string>('');

  closeRequested = output<void>();
  invitationCreated = output<ChildInvitation>();

  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(EMAIL_PATTERN)],
  });
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly created = signal<ChildInvitation | null>(null);
  protected readonly copied = signal(false);

  protected readonly titleText = computed(
    () => $localize`:@@childInviteModal.title:Inviter ${this.childName()}:name: på e-post`,
  );

  /** «mathea@eksempel.no»: the first name, as drawn */
  protected readonly placeholder = computed(() => {
    const first = this.childName().trim().split(/[\s-]+/)[0] ?? "";
    const local = first.toLowerCase().replace(/[^a-zæøå0-9]/g, "");
    return `${local || "navn"}@eksempel.no`;
  });

  constructor() {
    // Each time it opens it starts at step 1, with the address it was given
    effect(() => {
      if (this.open()) {
        const start = this.initialEmail();
        untracked(() => {
          this.created.set(null);
          this.serverError.set(null);
          this.copied.set(false);
          this.email.reset(start);
        });
      }
    });
  }

  protected get showError(): boolean {
    return (this.email.invalid && this.email.touched) || this.serverError() !== null;
  }

  protected displayLink(token: string): string {
    return this.invitations.displayLink(token);
  }

  async onSubmit(): Promise<void> {
    if (this.submitting()) return;
    this.serverError.set(null);

    // Guide, popup rule 4: the main action is live from the first paint, checked on the press
    if (this.email.invalid) {
      this.email.markAsTouched();
      return;
    }

    this.submitting.set(true);
    try {
      const invitation = await this.invitations.create(
        this.householdId(),
        this.childId(),
        this.email.value.trim().toLowerCase(),
      );
      this.created.set(invitation);
      this.invitationCreated.emit(invitation);
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      this.serverError.set(
        status === 409
          ? $localize`:@@childInviteModal.emailInUse:Denne e-postadressen er allerede i bruk i Diddit.`
          : $localize`:@@childInviteModal.failed:Kunne ikke lage invitasjonen. Prøv igjen.`,
      );
    } finally {
      this.submitting.set(false);
    }
  }

  async copy(): Promise<void> {
    const invitation = this.created();
    if (!invitation) return;
    this.copied.set(await this.invitations.copyLink(invitation.token));
  }

  onClose(): void {
    this.closeRequested.emit();
  }
}
