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
});
