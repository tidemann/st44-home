import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InvitationsSentListComponent } from './invitations-sent-list';
import { InvitationService, type Invitation } from '../../services/invitation.service';
import { HouseholdService } from '../../services/household.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

describe('InvitationsSentListComponent (rule 8: Norwegian)', () => {
  let fixture: ComponentFixture<InvitationsSentListComponent>;
  let component: InvitationsSentListComponent;

  const invitation = {
    id: 'inv-1',
    invitedEmail: 'b@example.com',
    status: 'pending',
  } as Invitation;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InvitationsSentListComponent],
      providers: [
        {
          provide: InvitationService,
          useValue: {
            listSentInvitations: vi.fn().mockResolvedValue({ invitations: [] }),
            cancelInvitation: vi.fn().mockResolvedValue(undefined),
            cleanupInvitations: vi
              .fn()
              .mockResolvedValue({ deleted: 3, message: 'Removed 3 old invitation(s)' }),
          },
        },
        { provide: HouseholdService, useValue: { getActiveHouseholdId: () => 'h1' } },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn().mockResolvedValue(true) } },
      ],
    });
    fixture = TestBed.createComponent(InvitationsSentListComponent);
    component = fixture.componentInstance;
  });

  it('says the invitation was withdrawn in Norwegian', async () => {
    await component.cancelInvitation(invitation);
    expect(component.successMessage()).toBe('Invitasjonen til b@example.com er trukket tilbake.');
  });

  it('counts the removed invitations in Norwegian, not the backend message', async () => {
    await component.cleanupInvitations();
    expect(component.successMessage()).toBe('3 gamle invitasjoner er fjernet.');
  });

  it('uses the singular when one invitation was removed', async () => {
    const service = TestBed.inject(InvitationService) as unknown as {
      cleanupInvitations: ReturnType<typeof vi.fn>;
    };
    service.cleanupInvitations.mockResolvedValue({
      deleted: 1,
      message: 'Removed 1 old invitation(s)',
    });
    await component.cleanupInvitations();
    expect(component.successMessage()).toBe('1 gammel invitasjon er fjernet.');
  });
});

describe('InvitationsSentListComponent e-mail (ST-1551: break only before «@»)', () => {
  let component: InvitationsSentListComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InvitationsSentListComponent],
      providers: [
        {
          provide: InvitationService,
          useValue: {
            listSentInvitations: vi.fn().mockResolvedValue({
              invitations: [
                {
                  id: 'inv-1',
                  invitedEmail: 'eirik-st1542-invitasjon-test@example.com',
                  status: 'pending',
                  role: 'parent',
                  createdAt: '2026-10-19T08:00:00Z',
                  expiresAt: '2026-10-26T08:00:00Z',
                },
              ],
            }),
          },
        },
        { provide: HouseholdService, useValue: { getActiveHouseholdId: () => 'h1' } },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
      ],
    });
    component = TestBed.createComponent(InvitationsSentListComponent).componentInstance;
  });

  it('splits the address before its last «@»', () => {
    expect(component.emailParts('a.b@example.com')).toEqual(['a.b', '@example.com']);
    expect(component.emailParts('"a@b"@example.com')).toEqual(['"a@b"', '@example.com']);
  });

  it('keeps an address without a local part whole', () => {
    expect(component.emailParts('example.com')).toEqual(['example.com', '']);
    expect(component.emailParts('@example.com')).toEqual(['@example.com', '']);
  });

  it('renders the two parts as unbreakable pieces, with the full address as title', async () => {
    const fixture = TestBed.createComponent(InvitationsSentListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const cell = (fixture.nativeElement as HTMLElement).querySelector(
      '.table-row .cell.email',
    ) as HTMLElement;
    const parts = [...cell.querySelectorAll('.email-part')].map((p) => p.textContent);
    expect(parts).toEqual(['eirik-st1542-invitasjon-test', '@example.com']);
    expect(cell.getAttribute('title')).toBe('eirik-st1542-invitasjon-test@example.com');
    expect(cell.textContent?.trim()).toBe('eirik-st1542-invitasjon-test@example.com');
  });
});
