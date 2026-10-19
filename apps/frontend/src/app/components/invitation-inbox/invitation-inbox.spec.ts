import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { InvitationInboxComponent } from './invitation-inbox';
import { InvitationService, type Invitation } from '../../services/invitation.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

describe('InvitationInboxComponent', () => {
  const invitation = (role: 'admin' | 'parent'): Invitation => ({
    id: `inv-${role}`,
    householdId: 'h1',
    householdName: 'Familien Test',
    invitedEmail: 'b@example.com',
    invitedBy: 'u1',
    inviterEmail: 'a@example.com',
    role,
    status: 'pending',
    token: `tok-${role}`,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InvitationInboxComponent],
      providers: [
        {
          provide: InvitationService,
          useValue: {
            listReceivedInvitations: vi
              .fn()
              .mockResolvedValue({ invitations: [invitation('parent'), invitation('admin')] }),
          },
        },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
  });

  it('shows the role in Norwegian with a space after «Rolle:»', async () => {
    const fixture = TestBed.createComponent(InvitationInboxComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const roles = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.invitation-card .role'),
    ).map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim());
    expect(roles).toEqual(['Rolle: Forelder', 'Rolle: Administrator']);
  });

  it('says you joined in Norwegian after «Bli med»', async () => {
    const service = TestBed.inject(InvitationService) as unknown as Record<string, unknown>;
    service['acceptInvitation'] = vi
      .fn()
      .mockResolvedValue({ household: { id: 'h1', name: 'Familien Test' } });
    vi.mocked(TestBed.inject(ConfirmDialogService).confirm).mockResolvedValue(true);
    const component = TestBed.createComponent(InvitationInboxComponent).componentInstance;

    await component.acceptInvitation(invitation('parent'));
    expect(component['successMessage']()).toBe('Du er nå med i «Familien Test».');
  });

  it('says the invitation was declined in Norwegian', async () => {
    const service = TestBed.inject(InvitationService) as unknown as Record<string, unknown>;
    service['declineInvitation'] = vi.fn().mockResolvedValue(undefined);
    vi.mocked(TestBed.inject(ConfirmDialogService).confirm).mockResolvedValue(true);
    const component = TestBed.createComponent(InvitationInboxComponent).componentInstance;

    await component.declineInvitation(invitation('parent'));
    expect(component['successMessage']()).toBe('Invitasjonen er avslått.');
  });

  it('splits a name-less inviter address before «@» (ST-1557)', () => {
    const fixture = TestBed.createComponent(InvitationInboxComponent);
    fixture.componentInstance['invitations'].set([
      {
        ...invitation('parent'),
        inviterName: undefined,
        inviterEmail: 'lang.adresse.for.test@example.com',
      },
    ]);
    fixture.detectChanges();

    const parts = [
      ...fixture.nativeElement.querySelectorAll('.inviter .email-part'),
    ].map((p: Element) => p.textContent);
    expect(parts).toEqual(['lang.adresse.for.test', '@example.com']);
  });
});
