import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChildDetailsModal } from './child-details-modal';
import { ChildrenService } from '../../../services/children.service';
import {
  ChildInvitationService,
  type ChildInvitation,
} from '../../../services/child-invitation.service';
import type { Child } from '@st44/types';

describe('ChildDetailsModal', () => {
  let component: ChildDetailsModal;
  let fixture: ComponentFixture<ChildDetailsModal>;
  let mockChildrenService: Partial<ChildrenService>;
  let mockInvitations: {
    get: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    displayLink: (token: string) => string;
    copyLink: ReturnType<typeof vi.fn>;
  };

  const mockChild: Child = {
    id: 'child-1',
    householdId: 'household-1',
    name: 'Alex',
    birthYear: 2015,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    mockChildrenService = {
      updateChild: vi.fn().mockResolvedValue({ ...mockChild, name: 'Updated Name' }),
      deleteChild: vi.fn().mockResolvedValue({ success: true, message: 'Deleted' }),
    };

    mockInvitations = {
      get: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      cancel: vi.fn().mockResolvedValue(undefined),
      displayLink: (token: string) => `home.st44.no/no/invitasjon/${token}`,
      copyLink: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [ChildDetailsModal],
      providers: [
        { provide: ChildrenService, useValue: mockChildrenService },
        { provide: ChildInvitationService, useValue: mockInvitations },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChildDetailsModal);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('householdId', 'household-1');
    fixture.componentRef.setInput('child', mockChild);
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('View Mode', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display child name', () => {
      expect(component.child()?.name).toBe('Alex');
    });

    it('should calculate child age correctly', () => {
      const expectedAge = new Date().getFullYear() - 2015;
      expect(component['childAge']()).toBe(expectedAge);
    });

    it('should not be in edit mode by default', () => {
      expect(component['editMode']()).toBe(false);
    });

    it('should not show delete confirmation by default', () => {
      expect(component['showDeleteConfirm']()).toBe(false);
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should enter edit mode and populate form', () => {
      component.enterEditMode();

      expect(component['editMode']()).toBe(true);
      expect(component['form'].value.name).toBe('Alex');
      expect(component['form'].value.birthYear).toBe(2015);
    });

    it('should cancel edit mode', () => {
      component.enterEditMode();
      component.cancelEdit();

      expect(component['editMode']()).toBe(false);
    });

    it('should save edited child details', async () => {
      const childUpdatedSpy = vi.spyOn(component.childUpdated, 'emit');

      component.enterEditMode();
      component['form'].patchValue({ name: 'Updated Name', birthYear: 2016 });
      fixture.detectChanges();

      await component.saveEdit();

      expect(mockChildrenService.updateChild).toHaveBeenCalledWith('household-1', 'child-1', {
        name: 'Updated Name',
        birthYear: 2016,
      });
      expect(childUpdatedSpy).toHaveBeenCalled();
      expect(component['editMode']()).toBe(false);
    });

    it('saves an emptied birth year as null, so the age is removed (ST-1624)', async () => {
      component.enterEditMode();
      component['form'].patchValue({ name: 'Test Child', birthYear: null });
      fixture.detectChanges();

      await component.saveEdit();

      expect(mockChildrenService.updateChild).toHaveBeenCalledWith('household-1', 'child-1', {
        name: 'Test Child',
        birthYear: null,
      });
    });

    it('opens a child without a birth year with the field empty, not a made-up year', () => {
      fixture.componentRef.setInput('child', { ...mockChild, birthYear: null });
      component.enterEditMode();

      expect(component['form'].value.birthYear).toBeNull();
      expect(component['form'].valid).toBe(true);
    });

    it('should not save if form is invalid', async () => {
      component.enterEditMode();
      component['form'].patchValue({ name: '', birthYear: 2015 });
      component['form'].get('name')?.markAsTouched();
      fixture.detectChanges();

      await component.saveEdit();

      expect(mockChildrenService.updateChild).not.toHaveBeenCalled();
    });

    it('should show error message on save failure', async () => {
      (mockChildrenService.updateChild as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error'),
      );

      component.enterEditMode();
      component['form'].patchValue({ name: 'Updated Name', birthYear: 2016 });
      fixture.detectChanges();

      await component.saveEdit();

      expect(component['errorMessage']()).toBe('Failed to save changes. Please try again.');
    });
  });

  describe('Delete Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should show delete confirmation', () => {
      component.showDeleteConfirmation();

      expect(component['showDeleteConfirm']()).toBe(true);
    });

    it('should cancel delete confirmation', () => {
      component.showDeleteConfirmation();
      component.cancelDelete();

      expect(component['showDeleteConfirm']()).toBe(false);
    });

    it('should delete child on confirmation', async () => {
      const childDeletedSpy = vi.spyOn(component.childDeleted, 'emit');
      const closeRequestedSpy = vi.spyOn(component.closeRequested, 'emit');

      component.showDeleteConfirmation();
      await component.confirmDelete();

      expect(mockChildrenService.deleteChild).toHaveBeenCalledWith('household-1', 'child-1');
      expect(childDeletedSpy).toHaveBeenCalled();
      expect(closeRequestedSpy).toHaveBeenCalled();
    });

    it('should show error message on delete failure', async () => {
      (mockChildrenService.deleteChild as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error'),
      );

      component.showDeleteConfirmation();
      await component.confirmDelete();

      expect(component['errorMessage']()).toBe('Failed to remove child. Please try again.');
    });
  });

  describe('Modal Controls', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should emit closeRequested on close', () => {
      const closeRequestedSpy = vi.spyOn(component.closeRequested, 'emit');

      component.onClose();

      expect(closeRequestedSpy).toHaveBeenCalled();
    });

    it('should reset all state on close', () => {
      component.enterEditMode();
      component['showCreateAccount'].set(true);
      component['showDeleteConfirm'].set(true);
      component['errorMessage'].set('Some error');

      component.onClose();

      expect(component['editMode']()).toBe(false);
      expect(component['showCreateAccount']()).toBe(false);
      expect(component['showDeleteConfirm']()).toBe(false);
      expect(component['errorMessage']()).toBeNull();
    });
  });

  describe('Account Status', () => {
    it('should detect when child has no account', () => {
      fixture.detectChanges();
      expect(component['hasAccount']()).toBe(false);
    });

    it('should detect when child has account', () => {
      const childWithAccount: Child = { ...mockChild, userId: 'user-123' };
      fixture.componentRef.setInput('child', childWithAccount);
      fixture.detectChanges();

      expect(component['hasAccount']()).toBe(true);
    });
  });

  // ST-1678: the four states of «Innloggingskonto»
  describe('Invite by link', () => {
    const invitation = (over: Partial<ChildInvitation>): ChildInvitation => ({
      id: 'inv-1',
      email: 'alex@eksempel.no',
      token: 'abc123',
      status: 'pending',
      expiresAt: '2026-10-27T10:00:00Z',
      acceptedAt: null,
      createdAt: '2026-10-20T10:00:00Z',
      ...over,
    });

    async function openWith(found: ChildInvitation | null, child: Child = mockChild) {
      mockInvitations.get.mockResolvedValue(found);
      fixture.componentRef.setInput('child', child);
      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).textContent ?? '';
    }

    it('no login: the invite leads, «Opprett innlogging» is the backup under «eller»', async () => {
      const text = await openWith(null);
      expect(mockInvitations.get).toHaveBeenCalledWith('household-1', 'child-1');
      expect(text).toContain('Ingen innlogging');
      expect(text).toContain('Alex kan ikke logge inn ennå.');
      expect(text).toContain('Inviter Alex på e-post');
      expect(text).toContain('eller');
      expect(text).toContain('For barn uten e-post: du lager passordet.');
      const primary = fixture.nativeElement.querySelector('.acct-btn-primary') as HTMLElement;
      const outline = fixture.nativeElement.querySelector('.acct-btn-outline') as HTMLElement;
      expect(primary.textContent?.trim()).toBe('Inviter Alex på e-post');
      expect(outline.textContent?.trim()).toBe('Opprett innlogging');
    });

    it('invite sent: the address, the date, the link and the three actions', async () => {
      const text = await openWith(invitation({}));
      expect(text).toContain('Invitasjon sendt');
      expect(text).toContain('alex@eksempel.no');
      expect(text).toContain('Utløper tirsdag 27. oktober');
      const field = fixture.nativeElement.querySelector(
        '#child-invite-link-card',
      ) as HTMLInputElement;
      expect(field.value).toBe('home.st44.no/no/invitasjon/abc123');
      expect(text).toContain('Kopier lenke');
      expect(text).toContain('Lag ny lenke');
      expect(text).toContain('Avbryt invitasjonen');
    });

    it('«Lag ny lenke» makes a new link for the same address', async () => {
      await openWith(invitation({}));
      mockInvitations.create.mockResolvedValue(invitation({ token: 'new456' }));
      await component.renewInvitation('alex@eksempel.no');
      fixture.detectChanges();
      expect(mockInvitations.create).toHaveBeenCalledWith(
        'household-1',
        'child-1',
        'alex@eksempel.no',
      );
      const field = fixture.nativeElement.querySelector(
        '#child-invite-link-card',
      ) as HTMLInputElement;
      expect(field.value).toBe('home.st44.no/no/invitasjon/new456');
    });

    it('«Avbryt invitasjonen» goes back to no login', async () => {
      await openWith(invitation({}));
      await component.cancelInvitation();
      fixture.detectChanges();
      expect(mockInvitations.cancel).toHaveBeenCalledWith('household-1', 'child-1');
      expect(fixture.nativeElement.textContent).toContain('Ingen innlogging');
    });

    it('expired: the rust word, «Inviter på nytt», and «Opprett innlogging» still there', async () => {
      const text = await openWith(invitation({ status: 'expired' }));
      expect(text).toContain('Invitasjonen er utløpt');
      expect(text).toContain('Sendt 20. oktober til alex@eksempel.no');
      expect(fixture.nativeElement.querySelector('.status-expired-word')?.textContent).toContain(
        'Utløpt',
      );
      expect(text).toContain('Inviter Alex på nytt');
      expect(text).toContain('Opprett innlogging');
    });

    it('account active: the accepted date and how the child logs in', async () => {
      const text = await openWith(
        invitation({ status: 'accepted', acceptedAt: '2026-10-18T10:00:00Z' }),
        { ...mockChild, userId: 'user-1' },
      );
      expect(text).toContain('Konto aktiv');
      expect(text).toContain('alex@eksempel.no');
      expect(text).toContain('Invitasjonen ble godtatt 18. oktober');
      expect(text).toContain('Alex logger inn med e-posten og sitt eget passord.');
      expect(text).not.toContain('Kopier lenke');
    });

    it('opening the invite steps the card aside for popup 18', async () => {
      await openWith(null);
      component.openInvite('');
      fixture.detectChanges();
      expect(component['inviteOpen']()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Inviter Alex på e-post');
      expect(fixture.nativeElement.textContent).toContain('E-postadresse *');
    });
  });
});
