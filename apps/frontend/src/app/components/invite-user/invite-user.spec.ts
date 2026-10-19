import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InviteUserComponent } from './invite-user';
import { InvitationService } from '../../services/invitation.service';

describe('InviteUserComponent (rule 8: Norwegian)', () => {
  let fixture: ComponentFixture<InviteUserComponent>;
  let component: InviteUserComponent;
  let sendInvitation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendInvitation = vi.fn().mockResolvedValue({ token: 'tok' });
    TestBed.configureTestingModule({
      imports: [InviteUserComponent],
      providers: [{ provide: InvitationService, useValue: { sendInvitation } }],
    });
    fixture = TestBed.createComponent(InviteUserComponent);
    fixture.componentRef.setInput('householdId', 'h1');
    component = fixture.componentInstance;
  });

  const submit = async (email = 'b@example.com') => {
    component.inviteForm.patchValue({ email, role: 'parent' });
    await component.onSubmit();
  };

  it('says the invitation was sent in Norwegian', async () => {
    await submit();
    expect(component.successMessage()).toBe('Invitasjonen er sendt til b@example.com.');
  });

  it('shows a pending invitation conflict in Norwegian', async () => {
    sendInvitation.mockRejectedValue({
      status: 409,
      error: { message: 'Pending invitation already exists for this email' },
    });
    await submit();
    expect(component.errorMessage()).toBe(
      'En ventende invitasjon eksisterer allerede for denne e-posten.',
    );
  });

  it('shows an already-member conflict in Norwegian', async () => {
    sendInvitation.mockRejectedValue({
      status: 409,
      error: { message: 'User is already a household member' },
    });
    await submit();
    expect(component.errorMessage()).toBe(
      'Denne brukeren er allerede medlem av husholdningen din.',
    );
  });

  it('never shows an unknown backend conflict message', async () => {
    sendInvitation.mockRejectedValue({ status: 409, error: { message: 'Something else' } });
    await submit();
    expect(component.errorMessage()).toBe('Denne brukeren kan ikke inviteres.');
  });

  it('says the link was copied in Norwegian', async () => {
    await submit();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    component.copyInvitationLink();
    await Promise.resolve();
    await Promise.resolve();
    expect(component.successMessage()).toBe('Invitasjonslenken er kopiert.');
  });

  it('shows the e-mail field errors in Norwegian', () => {
    const email = component.inviteForm.get('email')!;
    email.markAsTouched();
    expect(component.getEmailError()).toBe('Skriv inn e-postadressen.');
    email.setValue('not-an-email');
    expect(component.getEmailError()).toBe('Skriv inn en gyldig e-postadresse.');
  });
});
