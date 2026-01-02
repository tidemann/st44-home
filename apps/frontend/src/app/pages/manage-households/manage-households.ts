import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HouseholdService, type HouseholdListItem } from '../../services/household.service';
import { HouseholdStore } from '../../stores/household.store';
import { PageComponent } from '../../components/page/page';
import { Modal } from '../../components/modals/modal/modal';

/**
 * Manage Households Page
 *
 * Allows users to:
 * - View all households they belong to
 * - Create new households
 * - Edit household names (admin only)
 * - Leave households (unless only admin)
 * - Delete households (admin only)
 */
@Component({
  selector: 'app-manage-households',
  imports: [FormsModule, PageComponent, Modal],
  templateUrl: './manage-households.html',
  styleUrl: './manage-households.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageHouseholds implements OnInit {
  private readonly householdService = inject(HouseholdService);
  private readonly householdStore = inject(HouseholdStore);

  // State signals
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly actionInProgress = signal(false);

  // Data
  protected readonly households = this.householdStore.households;
  protected readonly activeHouseholdId = this.householdStore.activeHouseholdId;

  // Modal states
  protected readonly showCreateModal = signal(false);
  protected readonly showEditModal = signal(false);
  protected readonly showLeaveModal = signal(false);
  protected readonly showDeleteModal = signal(false);

  // Form data
  protected createHouseholdName = '';
  protected editHouseholdName = '';
  protected selectedHousehold = signal<HouseholdListItem | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadHouseholds();
  }

  /**
   * Load all households
   */
  protected async loadHouseholds(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);
      await this.householdStore.loadHouseholds({ forceRefresh: true });
    } catch (err) {
      console.error('Failed to load households:', err);
      this.error.set('Failed to load households. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Check if user can leave a household
   * Cannot leave if user is the only admin
   */
  protected canLeaveHousehold(household: HouseholdListItem): boolean {
    // Can always leave if not an admin
    if (household.role !== 'admin') return true;
    // Can leave if there are other admins (adminCount > 1)
    return (household.adminCount ?? 1) > 1;
  }

  /**
   * Check if user is admin of a household
   */
  protected isAdmin(household: HouseholdListItem): boolean {
    return household.role === 'admin';
  }

  /**
   * Switch to a different household
   */
  protected switchToHousehold(household: HouseholdListItem): void {
    this.householdStore.setActiveHousehold(household.id);
    this.showSuccess(`Switched to ${household.name}`);
  }

  // ==================
  // Create Household
  // ==================

  protected openCreateModal(): void {
    this.createHouseholdName = '';
    this.showCreateModal.set(true);
  }

  protected closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  protected async createHousehold(): Promise<void> {
    if (!this.createHouseholdName.trim()) {
      this.error.set('Please enter a household name');
      return;
    }

    try {
      this.actionInProgress.set(true);
      this.error.set(null);

      await this.householdService.createHousehold(this.createHouseholdName.trim());
      this.closeCreateModal();
      this.showSuccess('Household created successfully!');
    } catch (err) {
      console.error('Failed to create household:', err);
      this.error.set('Failed to create household. Please try again.');
    } finally {
      this.actionInProgress.set(false);
    }
  }

  // ==================
  // Edit Household
  // ==================

  protected openEditModal(household: HouseholdListItem): void {
    this.selectedHousehold.set(household);
    this.editHouseholdName = household.name;
    this.showEditModal.set(true);
  }

  protected closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedHousehold.set(null);
  }

  protected async saveHousehold(): Promise<void> {
    const household = this.selectedHousehold();
    if (!household) return;

    if (!this.editHouseholdName.trim()) {
      this.error.set('Please enter a household name');
      return;
    }

    try {
      this.actionInProgress.set(true);
      this.error.set(null);

      await this.householdService.updateHousehold(household.id, this.editHouseholdName.trim());
      this.closeEditModal();
      this.showSuccess('Household updated successfully!');
    } catch (err) {
      console.error('Failed to update household:', err);
      this.error.set('Failed to update household. Please try again.');
    } finally {
      this.actionInProgress.set(false);
    }
  }

  // ==================
  // Leave Household
  // ==================

  protected openLeaveModal(household: HouseholdListItem): void {
    this.selectedHousehold.set(household);
    this.showLeaveModal.set(true);
  }

  protected closeLeaveModal(): void {
    this.showLeaveModal.set(false);
    this.selectedHousehold.set(null);
  }

  protected async leaveHousehold(): Promise<void> {
    const household = this.selectedHousehold();
    if (!household) return;

    try {
      this.actionInProgress.set(true);
      this.error.set(null);

      await this.householdService.leaveHousehold(household.id);
      this.closeLeaveModal();
      this.showSuccess(`Left ${household.name}`);
    } catch (err: unknown) {
      console.error('Failed to leave household:', err);
      const errorObj = err as { message?: string };
      if (errorObj.message?.includes('ONLY_ADMIN')) {
        this.error.set(
          'You are the only admin. Transfer admin role to another member or delete the household.',
        );
      } else {
        this.error.set('Failed to leave household. Please try again.');
      }
    } finally {
      this.actionInProgress.set(false);
    }
  }

  // ==================
  // Delete Household
  // ==================

  protected openDeleteModal(household: HouseholdListItem): void {
    this.selectedHousehold.set(household);
    this.showDeleteModal.set(true);
  }

  protected closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.selectedHousehold.set(null);
  }

  protected async deleteHousehold(): Promise<void> {
    const household = this.selectedHousehold();
    if (!household) return;

    try {
      this.actionInProgress.set(true);
      this.error.set(null);

      await this.householdService.deleteHousehold(household.id);
      this.closeDeleteModal();
      this.showSuccess(`Deleted ${household.name}`);
    } catch (err) {
      console.error('Failed to delete household:', err);
      this.error.set('Failed to delete household. Please try again.');
    } finally {
      this.actionInProgress.set(false);
    }
  }

  // ==================
  // Helpers
  // ==================

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  protected dismissSuccess(): void {
    this.successMessage.set(null);
  }

  protected dismissError(): void {
    this.error.set(null);
  }

  /**
   * Get role badge class
   */
  protected getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'role-badge role-admin';
      case 'parent':
        return 'role-badge role-parent';
      case 'child':
        return 'role-badge role-child';
      default:
        return 'role-badge';
    }
  }
}
