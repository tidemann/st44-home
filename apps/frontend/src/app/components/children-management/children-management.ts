import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Child } from '@st44/types';
import { ChildrenService } from '../../services/children.service';
import { HouseholdService } from '../../services/household.service';

@Component({
  selector: 'app-children-management',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './children-management.html',
  styleUrl: './children-management.css',
})
export class ChildrenManagementComponent implements OnInit {
  private childrenService = inject(ChildrenService);
  private householdService = inject(HouseholdService);
  private fb = inject(FormBuilder);

  children = signal<Child[]>([]);
  isLoading = signal(false);
  isAdding = signal(false);
  editingId = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  currentYear = new Date().getFullYear();

  // Add child form
  addForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    birthYear: [
      this.currentYear - 5,
      [Validators.required, Validators.min(2000), Validators.max(this.currentYear)],
    ],
  });

  // Edit child form
  editForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    birthYear: [
      this.currentYear,
      [Validators.required, Validators.min(2000), Validators.max(this.currentYear)],
    ],
  });

  ngOnInit() {
    this.loadChildren();
  }

  /**
   * Load all children for the active household
   */
  async loadChildren() {
    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) {
      this.errorMessage.set('No active household selected');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const children = await this.childrenService.listChildren(householdId);
      this.children.set(children);
    } catch (error) {
      console.error('Failed to load children:', error);
      this.errorMessage.set('Failed to load children. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Toggle add form visibility
   */
  toggleAddForm() {
    this.isAdding.update((val) => !val);
    if (!this.isAdding()) {
      this.addForm.reset({
        name: '',
        birthYear: this.currentYear - 5,
      });
    }
  }

  /**
   * Add a new child
   */
  async addChild() {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all required fields correctly.');
      return;
    }

    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) {
      this.errorMessage.set('No active household selected');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = {
        name: this.addForm.value.name!,
        birthYear: this.addForm.value.birthYear!,
      };

      await this.childrenService.createChild(householdId, data);
      this.showSuccessMessage('Child added successfully');
      this.addForm.reset({
        name: '',
        birthYear: this.currentYear - 5,
      });
      this.isAdding.set(false);
      await this.loadChildren();
    } catch (error) {
      console.error('Failed to add child:', error);
      this.errorMessage.set('Failed to add child. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Start editing a child
   */
  startEdit(child: Child) {
    this.editingId.set(child.id);
    this.editForm.patchValue({
      name: child.name,
      birthYear: child.birthYear,
    });
  }

  /**
   * Cancel editing
   */
  cancelEdit() {
    this.editingId.set(null);
    this.editForm.reset();
  }

  /**
   * Save edited child
   */
  async saveEdit(childId: string) {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) {
      this.errorMessage.set('No active household selected');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = {
        name: this.editForm.value.name!,
        birthYear: this.editForm.value.birthYear!,
      };

      await this.childrenService.updateChild(householdId, childId, data);
      this.showSuccessMessage('Child updated successfully');
      this.editingId.set(null);
      await this.loadChildren();
    } catch (error) {
      console.error('Failed to update child:', error);
      this.errorMessage.set('Failed to update child. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Delete a child with confirmation
   */
  async deleteChild(child: Child) {
    const confirmed = confirm(
      `Are you sure you want to remove ${child.name}? This action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) {
      this.errorMessage.set('No active household selected');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.childrenService.deleteChild(householdId, child.id);
      this.showSuccessMessage(`${child.name} removed successfully`);
      await this.loadChildren();
    } catch (error) {
      console.error('Failed to delete child:', error);
      this.errorMessage.set('Failed to remove child. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Calculate child age from birth year
   */
  getAge(birthYear: number | null): number {
    if (!birthYear) return 0;
    return this.currentYear - birthYear;
  }

  /**
   * Show success message and auto-clear
   */
  private showSuccessMessage(message: string) {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(null), 3000);
  }
}
