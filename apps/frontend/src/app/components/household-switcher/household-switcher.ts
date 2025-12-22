import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { HouseholdService, HouseholdListItem } from '../../services/household.service';

@Component({
  selector: 'app-household-switcher',
  imports: [],
  templateUrl: './household-switcher.html',
  styleUrl: './household-switcher.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseholdSwitcherComponent implements OnInit {
  private router = inject(Router);
  private householdService = inject(HouseholdService);

  households = signal<HouseholdListItem[]>([]);
  activeHouseholdId = signal<string | null>(null);
  isOpen = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  async ngOnInit() {
    await this.loadHouseholds();
  }

  private async loadHouseholds() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const households = await this.householdService.listHouseholds();
      this.households.set(households);
      this.activeHouseholdId.set(this.householdService.getActiveHouseholdId());
    } catch (error: unknown) {
      const httpError = error as { status?: number };

      if (httpError?.status === 401) {
        await this.router.navigate(['/login']);
        return;
      }

      this.errorMessage.set('Failed to load households');
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleDropdown() {
    this.isOpen.set(!this.isOpen());
  }

  closeDropdown() {
    this.isOpen.set(false);
  }

  async switchHousehold(household: HouseholdListItem) {
    if (household.id === this.activeHouseholdId()) {
      this.closeDropdown();
      return;
    }

    this.householdService.setActiveHousehold(household.id);
    this.activeHouseholdId.set(household.id);
    this.closeDropdown();

    // Reload current page to reflect new household context
    const currentUrl = this.router.url;
    await this.router.navigateByUrl('/', { skipLocationChange: true });
    await this.router.navigateByUrl(currentUrl);
  }

  getActiveHousehold(): HouseholdListItem | undefined {
    const activeId = this.activeHouseholdId();
    return this.households().find((h) => h.id === activeId);
  }

  onKeyDown(event: KeyboardEvent, household: HouseholdListItem) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.switchHousehold(household);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDropdown();
    }
  }

  onToggleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleDropdown();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDropdown();
    }
  }
}
