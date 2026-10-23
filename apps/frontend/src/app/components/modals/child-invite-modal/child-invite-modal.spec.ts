import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChildInviteModal } from './child-invite-modal';
import { ChildInvitationService } from '../../../services/child-invitation.service';

describe('ChildInviteModal (popup 18)', () => {
  let fixture: ComponentFixture<ChildInviteModal>;
  let component: ChildInviteModal;
  let create: ReturnType<typeof vi.fn>;
  let copyLink: ReturnType<typeof vi.fn>;

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const emailField = () =>
    fixture.nativeElement.querySelector('#child-invite-email') as HTMLInputElement;

  beforeEach(async () => {
    create = vi.fn().mockResolvedValue({
      id: 'inv-1',
      email: 'mathea@eksempel.no',
      token: 'tok9',
      status: 'pending',
      expiresAt: '2026-10-27T10:00:00Z',
      acceptedAt: null,
      createdAt: '2026-10-20T10:00:00Z',
    });
    copyLink = vi.fn().mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [ChildInviteModal],
      providers: [
        {
          provide: ChildInvitationService,
          useValue: {
            create,
            copyLink,
            displayLink: (token: string) => `home.st44.no/no/invitasjon/${token}`,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChildInviteModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('householdId', 'h-1');
    fixture.componentRef.setInput('childId', 'c-1');
    fixture.componentRef.setInput('childName', 'Mathea');
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  });

  it('step 1 asks one thing, with the lead and the hint as drawn', () => {
    expect(text()).toContain('Inviter Mathea på e-post');
    expect(text()).toContain(
      'Mathea får en lenke på e-post, lager sitt eget passord og beholder poengene og historikken sin.',
    );
    expect(text()).toContain('E-postadresse *');
    expect(emailField().placeholder).toBe('mathea@eksempel.no');
    expect(text()).toContain('Lenken virker i 7 dager. Du kan avbryte den når som helst.');
    expect(text()).not.toContain('Rolle');
  });

  it('the main action is live from the first paint and checks on the press', async () => {
    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    expect(submit.textContent?.trim()).toBe('Lag invitasjon');

    emailField().value = 'mathea@eksempel';
    emailField().dispatchEvent(new Event('input'));
    await component.onSubmit();
    fixture.detectChanges();

    expect(create).not.toHaveBeenCalled();
    expect(emailField().classList).toContain('error');
    expect(text()).toContain('Skriv en hel e-postadresse, for eksempel mathea@eksempel.no');
  });

  it('step 2 shows the link, «Kopier lenke» in the body and «Lukk» alone', async () => {
    emailField().value = ' Mathea@Eksempel.no ';
    emailField().dispatchEvent(new Event('input'));
    await component.onSubmit();
    fixture.detectChanges();

    expect(create).toHaveBeenCalledWith('h-1', 'c-1', 'mathea@eksempel.no');
    expect(text()).toContain('Invitasjonen er klar');
    const link = fixture.nativeElement.querySelector('#child-invite-link') as HTMLInputElement;
    expect(link.value).toBe('home.st44.no/no/invitasjon/tok9');
    expect(text()).toContain(
      'Diddit sender ingen e-post ennå. Send lenken til Mathea i en melding. Den virker i 7 dager.',
    );
    const actions = fixture.nativeElement.querySelectorAll('.modal-actions button');
    expect(actions.length).toBe(1);
    expect((actions[0] as HTMLElement).textContent?.trim()).toBe('Lukk');

    await component.copy();
    fixture.detectChanges();
    expect(copyLink).toHaveBeenCalledWith('tok9');
    expect(text()).toContain('Lenken er kopiert');
  });

  it('an address already in use is said under the field', async () => {
    create.mockRejectedValue({ status: 409 });
    emailField().value = 'mathea@eksempel.no';
    emailField().dispatchEvent(new Event('input'));
    await component.onSubmit();
    fixture.detectChanges();
    expect(text()).toContain('Denne e-postadressen er allerede i bruk i Diddit.');
  });
});
