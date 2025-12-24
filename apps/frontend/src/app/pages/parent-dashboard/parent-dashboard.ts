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
import { ChildrenService } from '../../services/children.service';
import { AssignmentService } from '../../services/assignment.service';
import { HouseholdSwitcherComponent } from '../../components/household-switcher/household-switcher';
import { CreateChildAccountComponent } from '../../components/create-child-account/create-child-account.component';
import type { Child } from '@st44/types';

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
  imports: [RouterLink, HouseholdSwitcherComponent, CreateChildAccountComponent],
  templateUrl: './parent-dashboard.html',
  styleUrl: './parent-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentDashboardComponent implements OnInit {
  private router = inject(Router);
  private householdService = inject(HouseholdService);
  private dashboardService = inject(DashboardService);
  private childrenService = inject(ChildrenService);
  private assignmentService = inject(AssignmentService);

  // State
  dashboard = signal<DashboardSummary | null>(null);
  childrenList = signal<Child[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  selectedChildForAccount = signal<Child | null>(null);
  isGenerating = signal(false);
  generationMessage = signal('');

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

      // Load both dashboard summary and full children list
      const [data, children] = await Promise.all([
        this.dashboardService.getDashboard(householdId),
        this.childrenService.listChildren(householdId),
      ]);

      this.dashboard.set(data);
      this.childrenList.set(children);
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

  // Helper to find full child data by ID
  getChildById(childId: string): Child | undefined {
    return this.childrenList().find((c) => c.id === childId);
  }

  // Check if child has account
  hasAccount(childId: string): boolean {
    const child = this.getChildById(childId);
    return !!child?.userId;
  }

  // Show create account modal
  showCreateAccountModal(childId: string): void {
    const child = this.getChildById(childId);
    if (child) {
      this.selectedChildForAccount.set(child);
    }
  }

  // Handle account creation success
  async onAccountCreated(): Promise<void> {
    this.selectedChildForAccount.set(null);
    await this.loadDashboard(); // Reload to get updated userId
  }

  // Handle cancel
  onCreateAccountCancelled(): void {
    this.selectedChildForAccount.set(null);
  }

  // Generate today's assignments
  async generateTodaysTasks(): Promise<void> {
    const householdId = this.household()?.id;
    if (!householdId) {
      return;
    }

    this.isGenerating.set(true);
    this.generationMessage.set('');

    try {
      const result = await this.assignmentService.generateAssignments(householdId);

      if (result.generated > 0) {
        this.generationMessage.set(
          `Generated ${result.generated} task${result.generated === 1 ? '' : 's'} for today`,
        );
        // Reload dashboard to show new assignments
        await this.loadDashboard();
      } else {
        this.generationMessage.set('No new tasks to generate for today');
      }

      // Clear message after 3 seconds
      setTimeout(() => {
        this.generationMessage.set('');
      }, 3000);
    } catch (error: unknown) {
      const httpError = error as { status?: number; error?: { error?: string } };

      if (httpError?.status === 403) {
        this.generationMessage.set('You do not have permission to generate assignments');
      } else {
        this.generationMessage.set('Failed to generate assignments. Please try again.');
      }

      // Clear message after 5 seconds for errors
      setTimeout(() => {
        this.generationMessage.set('');
      }, 5000);
    } finally {
      this.isGenerating.set(false);
    }
  }
}
