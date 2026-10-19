import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvitationAcceptComponent } from './invitation-accept';
import { InvitationService } from '../../services/invitation.service';
import { AuthService } from '../../services/auth.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { Router, ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

describe('InvitationAcceptComponent', () => {
  let component: InvitationAcceptComponent;
  let fixture: ComponentFixture<InvitationAcceptComponent>;
  let mockInvitationService: {
    acceptInvitation: ReturnType<typeof vi.fn>;
    declineInvitation: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
  };
  let mockActivatedRoute: { snapshot: { paramMap: Map<string, string> } };
  let router: Router;

  beforeEach(() => {
    // Clear storage before tests
    localStorage.clear();
    sessionStorage.clear();

    // Create mocks
    mockInvitationService = {
      acceptInvitation: vi.fn(),
      declineInvitation: vi.fn(),
    };
    mockAuthService = {
      isAuthenticated: signal(false),
    };
    mockActivatedRoute = {
      snapshot: { paramMap: new Map([['token', 'test-token-123']]) },
    };

    TestBed.configureTestingModule({
      imports: [InvitationAcceptComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: InvitationService, useValue: mockInvitationService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    fixture = TestBed.createComponent(InvitationAcceptComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should extract token from route params on init', () => {
      expect(component['token']()).toBe('test-token-123');
    });

    it('should set error when no token provided', () => {
      mockActivatedRoute.snapshot.paramMap = new Map();
      fixture = TestBed.createComponent(InvitationAcceptComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component['errorMessage']()).toBe('Lenken til invitasjonen er ugyldig.');
    });

    it('should initialize signals with default values', () => {
      expect(component['isProcessing']()).toBe(false);
      expect(component['errorMessage']()).toBe(null);
      expect(component['successMessage']()).toBe(null);
      expect(component['householdName']()).toBe(null);
    });
  });

  describe('Authentication State', () => {
    it('should show unauthenticated state when user is not logged in', () => {
      mockAuthService.isAuthenticated.set(false);
      fixture.detectChanges();

      expect(component['isAuthenticated']()).toBe(false);
    });

    it('should show authenticated state when user is logged in', () => {
      mockAuthService.isAuthenticated.set(true);
      fixture.detectChanges();

      expect(component['isAuthenticated']()).toBe(true);
    });
  });

  describe('URL Generation', () => {
    it('should compute correct login URL with returnUrl', () => {
      const expectedUrl = '/login?returnUrl=%2Finvitations%2Faccept%2Ftest-token-123';
      expect(component['loginUrl']()).toBe(expectedUrl);
    });

    it('should compute correct register URL with returnUrl', () => {
      const expectedUrl = '/register?returnUrl=%2Finvitations%2Faccept%2Ftest-token-123';
      expect(component['registerUrl']()).toBe(expectedUrl);
    });

    it('should return base login URL when no token', () => {
      component['token'].set(null);
      expect(component['loginUrl']()).toBe('/login');
    });

    it('should return base register URL when no token', () => {
      component['token'].set(null);
      expect(component['registerUrl']()).toBe('/register');
    });
  });

  describe('Accept Invitation', () => {
    beforeEach(() => {
      mockAuthService.isAuthenticated.set(true);
      fixture.detectChanges();
    });

    it('should not accept if no token', async () => {
      component['token'].set(null);
      await component['acceptInvitation']();
      expect(mockInvitationService.acceptInvitation).not.toHaveBeenCalled();
    });

    it('should not accept if already processing', async () => {
      component['isProcessing'].set(true);
      await component['acceptInvitation']();
      expect(mockInvitationService.acceptInvitation).not.toHaveBeenCalled();
    });

    it('should call invitation service with correct token', async () => {
      mockInvitationService.acceptInvitation.mockResolvedValue({
        household: { id: 'h1', name: 'Test Household' },
      });

      await component['acceptInvitation']();

      expect(mockInvitationService.acceptInvitation).toHaveBeenCalledWith('test-token-123');
    });

    it('should set success message on successful acceptance', async () => {
      mockInvitationService.acceptInvitation.mockResolvedValue({
        household: { id: 'h1', name: 'Test Household' },
      });

      await component['acceptInvitation']();

      expect(component['successMessage']()).toBe('Du er nå med i «Test Household».');
      expect(component['householdName']()).toBe('Test Household');
    });

    it('should set isProcessing during acceptance', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockInvitationService.acceptInvitation.mockReturnValue(promise);

      const acceptPromise = component['acceptInvitation']();
      expect(component['isProcessing']()).toBe(true);

      resolvePromise!({ household: { id: 'h1', name: 'Test' } });
      await acceptPromise;

      expect(component['isProcessing']()).toBe(false);
    });

    it('should navigate to home after successful acceptance', async () => {
      mockInvitationService.acceptInvitation.mockResolvedValue({
        household: { id: 'h1', name: 'Test Household' },
      });

      await component['acceptInvitation']();
      // Wait for navigation timeout (2 second delay in component)
      await new Promise((resolve) => setTimeout(resolve, 2100));

      expect(router.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should clear error message on new acceptance attempt', async () => {
      component['errorMessage'].set('Previous error');
      mockInvitationService.acceptInvitation.mockResolvedValue({
        household: { id: 'h1', name: 'Test' },
      });

      await component['acceptInvitation']();

      expect(component['errorMessage']()).toBe(null);
    });
  });

  describe('Decline Invitation', () => {
    beforeEach(() => {
      mockAuthService.isAuthenticated.set(true);
      fixture.detectChanges();
      vi.spyOn(TestBed.inject(ConfirmDialogService), 'confirm').mockResolvedValue(true);
    });

    it('should not decline if no token', async () => {
      component['token'].set(null);
      await component['declineInvitation']();
      expect(mockInvitationService.declineInvitation).not.toHaveBeenCalled();
    });

    it('should not decline if already processing', async () => {
      component['isProcessing'].set(true);
      await component['declineInvitation']();
      expect(mockInvitationService.declineInvitation).not.toHaveBeenCalled();
    });

    it('should show confirmation dialog before declining', async () => {
      mockInvitationService.declineInvitation.mockResolvedValue({});
      await component['declineInvitation']();
      expect(TestBed.inject(ConfirmDialogService).confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Avslå invitasjonen?', danger: true }),
      );
    });

    it('should not decline if user cancels confirmation', async () => {
      vi.spyOn(TestBed.inject(ConfirmDialogService), 'confirm').mockResolvedValue(false);
      await component['declineInvitation']();
      expect(mockInvitationService.declineInvitation).not.toHaveBeenCalled();
    });

    it('should call invitation service on confirmed decline', async () => {
      mockInvitationService.declineInvitation.mockResolvedValue({});
      await component['declineInvitation']();
      expect(mockInvitationService.declineInvitation).toHaveBeenCalledWith('test-token-123');
    });

    it('should set success message on successful decline', async () => {
      mockInvitationService.declineInvitation.mockResolvedValue({});
      await component['declineInvitation']();
      expect(component['successMessage']()).toBe('Invitasjonen er avslått.');
    });

    it('should navigate to home after successful decline', async () => {
      mockInvitationService.declineInvitation.mockResolvedValue({});
      await component['declineInvitation']();
      // Wait for navigation timeout (2 second delay in component)
      await new Promise((resolve) => setTimeout(resolve, 2100));
      expect(router.navigate).toHaveBeenCalledWith(['/home']);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuthService.isAuthenticated.set(true);
      fixture.detectChanges();
    });

    it('should handle 404 error (not found)', async () => {
      mockInvitationService.acceptInvitation.mockRejectedValue({ status: 404 });
      await component['acceptInvitation']();
      expect(component['errorMessage']()).toBe(
        'Fant ikke invitasjonen, eller den er allerede brukt.',
      );
    });

    it('should handle 403 error (wrong email)', async () => {
      mockInvitationService.acceptInvitation.mockRejectedValue({ status: 403 });
      await component['acceptInvitation']();
      expect(component['errorMessage']()).toBe('Denne invitasjonen er ikke til din e-postadresse.');
    });

    it('shows Norwegian, not the backend English, on a 400 with message', async () => {
      mockInvitationService.acceptInvitation.mockRejectedValue({
        status: 400,
        error: { message: 'Token expired' },
      });
      await component['acceptInvitation']();
      expect(component['errorMessage']()).toBe(
        'Invitasjonen har utløpt eller gjelder ikke lenger.',
      );
    });

    it('should handle 400 error without message', async () => {
      mockInvitationService.acceptInvitation.mockRejectedValue({ status: 400 });
      await component['acceptInvitation']();
      expect(component['errorMessage']()).toBe(
        'Invitasjonen har utløpt eller gjelder ikke lenger.',
      );
    });

    it('should handle 409 error (already member)', async () => {
      mockInvitationService.acceptInvitation.mockRejectedValue({ status: 409 });
      await component['acceptInvitation']();
      expect(component['errorMessage']()).toBe('Du er allerede med i denne husstanden.');
    });

    it('shows Norwegian, not the backend English, on an unknown error with message', async () => {
      mockInvitationService.acceptInvitation.mockRejectedValue({
        status: 500,
        error: { message: 'Server error' },
      });
      await component['acceptInvitation']();
      expect(component['errorMessage']()).toBe('Noe gikk galt. Prøv igjen.');
    });

    it('should handle unknown error without message', async () => {
      mockInvitationService.acceptInvitation.mockRejectedValue({ status: 500 });
      await component['acceptInvitation']();
      expect(component['errorMessage']()).toBe('Noe gikk galt. Prøv igjen.');
    });

    it('should reset isProcessing on error', async () => {
      mockInvitationService.acceptInvitation.mockRejectedValue({ status: 500 });
      await component['acceptInvitation']();
      expect(component['isProcessing']()).toBe(false);
    });
  });
});
