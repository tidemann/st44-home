import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChildDetailsModal } from './child-details-modal';
import { ChildrenService } from '../../../services/children.service';
import type { Child } from '@st44/types';

describe('ChildDetailsModal', () => {
  let component: ChildDetailsModal;
  let fixture: ComponentFixture<ChildDetailsModal>;
  let mockChildrenService: Partial<ChildrenService>;

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

    await TestBed.configureTestingModule({
      imports: [ChildDetailsModal],
      providers: [{ provide: ChildrenService, useValue: mockChildrenService }],
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
});
