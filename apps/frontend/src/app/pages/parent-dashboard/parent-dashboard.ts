import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HouseholdService } from '../../services/household.service';
import { DashboardService, DashboardSummary, WeekSummary } from '../../services/dashboard.service';
import { HouseholdSwitcherComponent } from '../../components/household-switcher/household-switcher';

/**
 * Parent Dashboard Component
 *
 * Landing page for admin/parent users showing:
 * - Household name with switcher
 * - Week summary (total, completed, pending, overdue tasks)
 * - Per-child completion rates with progress bars
 * - Quick action buttons
 */
@Component({
  selector: 'app-parent-dashboard',
  imports: [RouterLink, HouseholdSwitcherComponent],
  templateUrl: './parent-dashboard.html',
  styleUrl: './parent-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentDashboardComponent implements OnInit {
  private router = inject(Router);
  private householdService = inject(HouseholdService);
  private dashboardService = inject(DashboardService);

  // State
  dashboard = signal<DashboardSummary | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');

  // Computed values
  household = computed(() => this.dashboard()?.household ?? null);
  weekSummary = computed(() => this.dashboard()?.weekSummary ?? this.emptyWeekSummary());
  children = computed(() => this.dashboard()?.children ?? []);
  hasChildren = computed(() => this.children().length > 0);
  hasTasks = computed(() => this.weekSummary().total > 0);

  async ngOnInit() {
    await this.loadDashboard();
  }

  async loadDashboard() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const householdId = this.householdService.getActiveHouseholdId();

      if (!householdId) {
        // No household selected - redirect to create
        await this.router.navigate(['/household/create']);
        return;
      }

      const data = await this.dashboardService.getDashboard(householdId);
      this.dashboard.set(data);
    } catch (error: unknown) {
      const httpError = error as { status?: number };

      if (httpError?.status === 401) {
        await this.router.navigate(['/login']);
        return;
      } else if (httpError?.status === 403) {
        this.errorMessage.set('You do not have access to this household.');
      } else if (httpError?.status === 404) {
        // Household not found - clear selection and redirect
        await this.router.navigate(['/household/create']);
        return;
      } else {
        this.errorMessage.set('Failed to load dashboard. Please try again.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async onHouseholdChanged() {
    await this.loadDashboard();
  }

  getCompletionClass(rate: number): string {
    if (rate >= 70) return 'completion-high';
    if (rate >= 40) return 'completion-medium';
    return 'completion-low';
  }

  private emptyWeekSummary(): WeekSummary {
    return {
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
      completionRate: 0,
    };
  }
}
