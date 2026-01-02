import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { signal, WritableSignal } from '@angular/core';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ManageHouseholds } from './manage-households';
import { HouseholdService, type HouseholdListItem } from '../../services/household.service';
import { HouseholdStore } from '../../stores/household.store';
import { PageComponent } from '../../components/page/page';
import { Modal } from '../../components/modals/modal/modal';

// Mock data
const mockHouseholds: HouseholdListItem[] = [
  {
    id: 'household-1',
    name: 'Smith Family',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    role: 'admin',
    memberCount: 4,
    childrenCount: 2,
    adminCount: 2,
  },
  {
    id: 'household-2',
    name: 'Work House',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    role: 'parent',
    memberCount: 3,
    childrenCount: 1,
    adminCount: 1,
  },
  {
    id: 'household-3',
    name: 'Solo Admin House',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    role: 'admin',
    memberCount: 2,
    childrenCount: 1,
    adminCount: 1, // Only admin - cannot leave
  },
];

describe('ManageHouseholds', () => {
  let component: ManageHouseholds;
  let fixture: ComponentFixture<ManageHouseholds>;
  let mockHouseholdService: {
    createHousehold: Mock;
    updateHousehold: Mock;
    leaveHousehold: Mock;
    deleteHousehold: Mock;
  };
  let mockHouseholdStore: {
    households: WritableSignal<HouseholdListItem[]>;
    activeHouseholdId: WritableSignal<string | null>;
    loadHouseholds: Mock;
    setActiveHousehold: Mock;
  };

  // Shared signals that will be used across all tests
  let householdsSignal: WritableSignal<HouseholdListItem[]>;
  let activeHouseholdIdSignal: WritableSignal<string | null>;

  beforeEach(async () => {
    // Create mock signals for the store - these need to be created fresh each time
    householdsSignal = signal<HouseholdListItem[]>([]);
    activeHouseholdIdSignal = signal<string | null>('household-1');

    mockHouseholdStore = {
      households: householdsSignal,
      activeHouseholdId: activeHouseholdIdSignal,
      loadHouseholds: vi.fn().mockResolvedValue(undefined),
      setActiveHousehold: vi.fn(),
    };

    mockHouseholdService = {
      createHousehold: vi.fn(),
      updateHousehold: vi.fn(),
      leaveHousehold: vi.fn(),
      deleteHousehold: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ManageHouseholds, FormsModule, PageComponent, Modal],
      providers: [
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: HouseholdStore, useValue: mockHouseholdStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageHouseholds);
    component = fixture.componentInstance;
  });

  // Helper to access protected members
  const getProtected = <T>(key: string): T => (component as unknown as Record<string, T>)[key];

  const callProtected = <T>(key: string, ...args: unknown[]): T =>
    (component as unknown as Record<string, (...args: unknown[]) => T>)[key](...args);

  // ====================
  // DISPLAY TESTS
  // ====================
  describe('Display', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should start with loading state true', () => {
      // Component starts with loading=true
      expect(getProtected<WritableSignal<boolean>>('loading')()).toBe(true);
    });

    it('should set loading to false after ngOnInit', async () => {
      mockHouseholdStore.loadHouseholds.mockResolvedValue(undefined);
      await component.ngOnInit();
      expect(getProtected<WritableSignal<boolean>>('loading')()).toBe(false);
    });

    it('should call loadHouseholds on ngOnInit', async () => {
      await component.ngOnInit();
      expect(mockHouseholdStore.loadHouseholds).toHaveBeenCalledWith({ forceRefresh: true });
    });

    it('should read households from the store', async () => {
      householdsSignal.set(mockHouseholds);
      mockHouseholdStore.loadHouseholds.mockResolvedValue(undefined);

      await component.ngOnInit();

      // Verify component reads from store signal
      expect(getProtected<WritableSignal<HouseholdListItem[]>>('households')()).toEqual(
        mockHouseholds,
      );
    });

    it('should read activeHouseholdId from the store', () => {
      activeHouseholdIdSignal.set('test-id');

      expect(getProtected<WritableSignal<string | null>>('activeHouseholdId')()).toBe('test-id');
    });
  });

  // ====================
  // CREATE HOUSEHOLD TESTS
  // ====================
  describe('Create Household', () => {
    beforeEach(async () => {
      householdsSignal.set(mockHouseholds);
      mockHouseholdStore.loadHouseholds.mockResolvedValue(undefined);
      await component.ngOnInit();
    });

    it('should open create modal when openCreateModal is called', () => {
      callProtected('openCreateModal');
      expect(getProtected<WritableSignal<boolean>>('showCreateModal')()).toBe(true);
    });

    it('should reset createHouseholdName when opening modal', () => {
      (component as unknown as { createHouseholdName: string }).createHouseholdName = 'Old Name';
      callProtected('openCreateModal');
      expect((component as unknown as { createHouseholdName: string }).createHouseholdName).toBe(
        '',
      );
    });

    it('should validate household name as required', async () => {
      // Open modal
      callProtected('openCreateModal');
      fixture.detectChanges();

      // Try to create with empty name
      (component as unknown as { createHouseholdName: string }).createHouseholdName = '   ';
      mockHouseholdService.createHousehold.mockResolvedValue({
        id: 'new-id',
        name: 'Test',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      await callProtected('createHousehold');
      fixture.detectChanges();

      // Should show error for empty name
      expect(getProtected<WritableSignal<string | null>>('error')()).toBe(
        'Please enter a household name',
      );
      expect(mockHouseholdService.createHousehold).not.toHaveBeenCalled();
    });

    it('should call service.createHousehold on submit', async () => {
      mockHouseholdService.createHousehold.mockResolvedValue({
        id: 'new-id',
        name: 'New House',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      callProtected('openCreateModal');
      (component as unknown as { createHouseholdName: string }).createHouseholdName = 'New House';

      await callProtected('createHousehold');

      expect(mockHouseholdService.createHousehold).toHaveBeenCalledWith('New House');
    });

    it('should close modal on success', async () => {
      mockHouseholdService.createHousehold.mockResolvedValue({
        id: 'new-id',
        name: 'New House',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      callProtected('openCreateModal');
      (component as unknown as { createHouseholdName: string }).createHouseholdName = 'New House';

      await callProtected('createHousehold');
      fixture.detectChanges();

      expect(getProtected<WritableSignal<boolean>>('showCreateModal')()).toBe(false);
    });

    it('should show success message on creation', async () => {
      mockHouseholdService.createHousehold.mockResolvedValue({
        id: 'new-id',
        name: 'New House',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      callProtected('openCreateModal');
      (component as unknown as { createHouseholdName: string }).createHouseholdName = 'New House';

      await callProtected('createHousehold');
      fixture.detectChanges();

      expect(getProtected<WritableSignal<string | null>>('successMessage')()).toBe(
        'Household created successfully!',
      );
    });

    it('should show error message on failure', async () => {
      mockHouseholdService.createHousehold.mockRejectedValue(new Error('Network error'));

      callProtected('openCreateModal');
      (component as unknown as { createHouseholdName: string }).createHouseholdName = 'New House';

      await callProtected<Promise<void>>('createHousehold');

      expect(getProtected<WritableSignal<string | null>>('error')()).toBe(
        'Failed to create household. Please try again.',
      );
    });
  });

  // ====================
  // EDIT HOUSEHOLD TESTS
  // ====================
  describe('Edit Household', () => {
    beforeEach(async () => {
      householdsSignal.set(mockHouseholds);
      mockHouseholdStore.loadHouseholds.mockResolvedValue(undefined);
      await component.ngOnInit();
    });

    it('should open edit modal with current name', () => {
      callProtected('openEditModal', mockHouseholds[0]);

      expect(getProtected<WritableSignal<boolean>>('showEditModal')()).toBe(true);
      expect((component as unknown as { editHouseholdName: string }).editHouseholdName).toBe(
        'Smith Family',
      );
    });

    it('should set selectedHousehold when opening edit modal', () => {
      callProtected('openEditModal', mockHouseholds[0]);

      expect(getProtected<WritableSignal<HouseholdListItem | null>>('selectedHousehold')()).toEqual(
        mockHouseholds[0],
      );
    });

    it('should call service.updateHousehold on submit', async () => {
      mockHouseholdService.updateHousehold.mockResolvedValue({
        id: 'household-1',
        name: 'Updated Name',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      callProtected('openEditModal', mockHouseholds[0]);
      (component as unknown as { editHouseholdName: string }).editHouseholdName = 'Updated Name';

      await callProtected('saveHousehold');

      expect(mockHouseholdService.updateHousehold).toHaveBeenCalledWith(
        'household-1',
        'Updated Name',
      );
    });

    it('should close modal and show success on update', async () => {
      mockHouseholdService.updateHousehold.mockResolvedValue({
        id: 'household-1',
        name: 'Updated Name',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      callProtected('openEditModal', mockHouseholds[0]);
      (component as unknown as { editHouseholdName: string }).editHouseholdName = 'Updated Name';

      await callProtected('saveHousehold');
      fixture.detectChanges();

      expect(getProtected<WritableSignal<boolean>>('showEditModal')()).toBe(false);
      expect(getProtected<WritableSignal<string | null>>('successMessage')()).toBe(
        'Household updated successfully!',
      );
    });

    it('should validate household name for edit', async () => {
      callProtected('openEditModal', mockHouseholds[0]);
      (component as unknown as { editHouseholdName: string }).editHouseholdName = '   ';

      await callProtected<Promise<void>>('saveHousehold');

      expect(getProtected<WritableSignal<string | null>>('error')()).toBe(
        'Please enter a household name',
      );
      expect(mockHouseholdService.updateHousehold).not.toHaveBeenCalled();
    });
  });

  // ====================
  // LEAVE HOUSEHOLD TESTS
  // ====================
  describe('Leave Household', () => {
    beforeEach(async () => {
      householdsSignal.set(mockHouseholds);
      mockHouseholdStore.loadHouseholds.mockResolvedValue(undefined);
      await component.ngOnInit();
    });

    it('should open leave modal and set selected household', () => {
      callProtected('openLeaveModal', mockHouseholds[0]);

      expect(getProtected<WritableSignal<boolean>>('showLeaveModal')()).toBe(true);
      expect(
        getProtected<WritableSignal<HouseholdListItem | null>>('selectedHousehold')()?.name,
      ).toBe('Smith Family');
    });

    it('should call service.leaveHousehold on confirm', async () => {
      mockHouseholdService.leaveHousehold.mockResolvedValue(undefined);

      callProtected('openLeaveModal', mockHouseholds[0]);
      await callProtected('leaveHousehold');

      expect(mockHouseholdService.leaveHousehold).toHaveBeenCalledWith('household-1');
    });

    it('should close modal and show success on leave', async () => {
      mockHouseholdService.leaveHousehold.mockResolvedValue(undefined);

      callProtected('openLeaveModal', mockHouseholds[0]);
      await callProtected('leaveHousehold');
      fixture.detectChanges();

      expect(getProtected<WritableSignal<boolean>>('showLeaveModal')()).toBe(false);
      expect(getProtected<WritableSignal<string | null>>('successMessage')()).toBe(
        'Left Smith Family',
      );
    });

    it('should show specific error for ONLY_ADMIN error', async () => {
      const error = new Error('ONLY_ADMIN: Cannot leave');
      mockHouseholdService.leaveHousehold.mockRejectedValue(error);

      callProtected('openLeaveModal', mockHouseholds[0]);
      await callProtected<Promise<void>>('leaveHousehold');

      const errorMsg = getProtected<WritableSignal<string | null>>('error')();
      expect(errorMsg).toBeTruthy();
      expect(errorMsg).toContain('only admin');
    });
  });

  // ====================
  // DELETE HOUSEHOLD TESTS
  // ====================
  describe('Delete Household', () => {
    beforeEach(async () => {
      householdsSignal.set(mockHouseholds);
      mockHouseholdStore.loadHouseholds.mockResolvedValue(undefined);
      await component.ngOnInit();
    });

    it('should open delete modal and set selected household', () => {
      callProtected('openDeleteModal', mockHouseholds[0]);

      expect(getProtected<WritableSignal<boolean>>('showDeleteModal')()).toBe(true);
      expect(
        getProtected<WritableSignal<HouseholdListItem | null>>('selectedHousehold')()?.name,
      ).toBe('Smith Family');
    });

    it('should call service.deleteHousehold on confirm', async () => {
      mockHouseholdService.deleteHousehold.mockResolvedValue(undefined);

      callProtected('openDeleteModal', mockHouseholds[0]);
      await callProtected('deleteHousehold');

      expect(mockHouseholdService.deleteHousehold).toHaveBeenCalledWith('household-1');
    });

    it('should close modal and show success on delete', async () => {
      mockHouseholdService.deleteHousehold.mockResolvedValue(undefined);

      callProtected('openDeleteModal', mockHouseholds[0]);
      await callProtected('deleteHousehold');
      fixture.detectChanges();

      expect(getProtected<WritableSignal<boolean>>('showDeleteModal')()).toBe(false);
      expect(getProtected<WritableSignal<string | null>>('successMessage')()).toBe(
        'Deleted Smith Family',
      );
    });

    it('should show error message on delete failure', async () => {
      mockHouseholdService.deleteHousehold.mockRejectedValue(new Error('Delete failed'));

      callProtected('openDeleteModal', mockHouseholds[0]);
      await callProtected<Promise<void>>('deleteHousehold');

      expect(getProtected<WritableSignal<string | null>>('error')()).toBe(
        'Failed to delete household. Please try again.',
      );
    });
  });

  // ====================
  // PERMISSION LOGIC TESTS
  // ====================
  describe('Permission Logic', () => {
    it('canLeaveHousehold() should return false when only admin (adminCount=1)', () => {
      const soloAdminHousehold: HouseholdListItem = {
        id: 'test',
        name: 'Test',
        createdAt: '',
        updatedAt: '',
        role: 'admin',
        adminCount: 1,
      };

      const result = callProtected<boolean>('canLeaveHousehold', soloAdminHousehold);
      expect(result).toBe(false);
    });

    it('canLeaveHousehold() should return true for non-admin', () => {
      const parentHousehold: HouseholdListItem = {
        id: 'test',
        name: 'Test',
        createdAt: '',
        updatedAt: '',
        role: 'parent',
        adminCount: 1,
      };

      const result = callProtected<boolean>('canLeaveHousehold', parentHousehold);
      expect(result).toBe(true);
    });

    it('canLeaveHousehold() should return true when multiple admins exist', () => {
      const multiAdminHousehold: HouseholdListItem = {
        id: 'test',
        name: 'Test',
        createdAt: '',
        updatedAt: '',
        role: 'admin',
        adminCount: 2,
      };

      const result = callProtected<boolean>('canLeaveHousehold', multiAdminHousehold);
      expect(result).toBe(true);
    });

    it('canLeaveHousehold() should handle undefined adminCount (default to 1)', () => {
      const undefinedAdminCountHousehold: HouseholdListItem = {
        id: 'test',
        name: 'Test',
        createdAt: '',
        updatedAt: '',
        role: 'admin',
        adminCount: undefined,
      };

      const result = callProtected<boolean>('canLeaveHousehold', undefinedAdminCountHousehold);
      expect(result).toBe(false);
    });

    it('isAdmin() should return true only for admin role', () => {
      const adminHousehold: HouseholdListItem = {
        id: 'test',
        name: 'Test',
        createdAt: '',
        updatedAt: '',
        role: 'admin',
      };
      const parentHousehold: HouseholdListItem = {
        id: 'test',
        name: 'Test',
        createdAt: '',
        updatedAt: '',
        role: 'parent',
      };
      const childHousehold: HouseholdListItem = {
        id: 'test',
        name: 'Test',
        createdAt: '',
        updatedAt: '',
        role: 'child',
      };

      expect(callProtected<boolean>('isAdmin', adminHousehold)).toBe(true);
      expect(callProtected<boolean>('isAdmin', parentHousehold)).toBe(false);
      expect(callProtected<boolean>('isAdmin', childHousehold)).toBe(false);
    });
  });

  // ====================
  // SWITCH HOUSEHOLD TESTS
  // ====================
  describe('Switch Household', () => {
    beforeEach(async () => {
      householdsSignal.set(mockHouseholds);
      mockHouseholdStore.loadHouseholds.mockResolvedValue(undefined);
      await component.ngOnInit();
    });

    it('should call store.setActiveHousehold when switching', () => {
      callProtected('switchToHousehold', mockHouseholds[1]);

      expect(mockHouseholdStore.setActiveHousehold).toHaveBeenCalledWith('household-2');
    });

    it('should show success message when switching', () => {
      callProtected('switchToHousehold', mockHouseholds[1]);

      expect(getProtected<WritableSignal<string | null>>('successMessage')()).toBe(
        'Switched to Work House',
      );
    });
  });

  // ====================
  // HELPER METHODS TESTS
  // ====================
  describe('Helper Methods', () => {
    it('getRoleBadgeClass() should return correct class for admin', () => {
      const result = callProtected<string>('getRoleBadgeClass', 'admin');
      expect(result).toBe('role-badge role-admin');
    });

    it('getRoleBadgeClass() should return correct class for parent', () => {
      const result = callProtected<string>('getRoleBadgeClass', 'parent');
      expect(result).toBe('role-badge role-parent');
    });

    it('getRoleBadgeClass() should return correct class for child', () => {
      const result = callProtected<string>('getRoleBadgeClass', 'child');
      expect(result).toBe('role-badge role-child');
    });

    it('getRoleBadgeClass() should return default class for unknown role', () => {
      const result = callProtected<string>('getRoleBadgeClass', 'unknown');
      expect(result).toBe('role-badge');
    });

    it('dismissSuccess() should clear success message', () => {
      getProtected<WritableSignal<string | null>>('successMessage').set('Test message');
      callProtected('dismissSuccess');
      fixture.detectChanges();

      expect(getProtected<WritableSignal<string | null>>('successMessage')()).toBeNull();
    });

    it('dismissError() should clear error message', () => {
      getProtected<WritableSignal<string | null>>('error').set('Test error');
      callProtected('dismissError');
      fixture.detectChanges();

      expect(getProtected<WritableSignal<string | null>>('error')()).toBeNull();
    });
  });

  // ====================
  // ERROR STATE TESTS
  // ====================
  describe('Error State', () => {
    it('should set error when loading fails', async () => {
      householdsSignal.set([]);
      mockHouseholdStore.loadHouseholds.mockRejectedValue(new Error('Network error'));

      await component.ngOnInit();

      expect(getProtected<WritableSignal<string | null>>('error')()).toBe(
        'Failed to load households. Please try again.',
      );
    });

    it('should clear error when loadHouseholds starts', async () => {
      // Set an initial error
      getProtected<WritableSignal<string | null>>('error').set('Previous error');

      // Mock a successful load
      mockHouseholdStore.loadHouseholds.mockResolvedValue(undefined);

      // Trigger load
      await callProtected<Promise<void>>('loadHouseholds');

      // Error should be cleared even before load completes
      expect(getProtected<WritableSignal<string | null>>('error')()).toBeNull();
    });
  });

  // ====================
  // ACTION IN PROGRESS TESTS
  // ====================
  describe('Action In Progress', () => {
    beforeEach(async () => {
      householdsSignal.set(mockHouseholds);
      mockHouseholdStore.loadHouseholds.mockResolvedValue(undefined);
      await component.ngOnInit();
    });

    it('should set actionInProgress during create', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<{
        id: string;
        name: string;
        createdAt: string;
        updatedAt: string;
      }>((resolve) => {
        resolvePromise = () => resolve({ id: 'new', name: 'Test', createdAt: '', updatedAt: '' });
      });
      mockHouseholdService.createHousehold.mockReturnValue(promise);

      callProtected('openCreateModal');
      (component as unknown as { createHouseholdName: string }).createHouseholdName = 'Test';

      const createPromise = callProtected<Promise<void>>('createHousehold');

      // Should be in progress
      expect(getProtected<WritableSignal<boolean>>('actionInProgress')()).toBe(true);

      resolvePromise!();
      await createPromise;

      // Should be done
      expect(getProtected<WritableSignal<boolean>>('actionInProgress')()).toBe(false);
    });

    it('should set actionInProgress during delete', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockHouseholdService.deleteHousehold.mockReturnValue(promise);

      callProtected('openDeleteModal', mockHouseholds[0]);
      const deletePromise = callProtected<Promise<void>>('deleteHousehold');

      expect(getProtected<WritableSignal<boolean>>('actionInProgress')()).toBe(true);

      resolvePromise!();
      await deletePromise;

      expect(getProtected<WritableSignal<boolean>>('actionInProgress')()).toBe(false);
    });
  });
});
