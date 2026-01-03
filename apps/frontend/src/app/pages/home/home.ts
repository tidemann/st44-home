import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { TaskCardComponent } from '../../components/task-card/task-card';
import { StatCard } from '../../components/stat-card/stat-card';
import {
  TaskFormModal,
  type TaskFormData,
} from '../../components/modals/task-form-modal/task-form-modal';
import { CelebrationComponent } from '../../components/celebration/celebration';
import { FailedTasksSectionComponent } from '../../components/failed-tasks-section/failed-tasks-section';
import { WeekComparison } from '../../components/week-comparison/week-comparison';
import { ChildrenTrends } from '../../components/children-trends/children-trends';
import { TaskService } from '../../services/task.service';
import { ChildrenService } from '../../services/children.service';
import { AuthService } from '../../services/auth.service';
import { HouseholdService } from '../../services/household.service';
import { HouseholdStore } from '../../stores/household.store';
import { DashboardService } from '../../services/dashboard.service';
import { AnalyticsService } from '../../services/analytics.service';
import type { Task, Assignment, Child, HouseholdAnalytics } from '@st44/types';

/**
 * Dashboard stats for home screen
 */
interface DashboardStats {
  activeCount: number;
  weekProgress: number;
  totalPoints: number;
}

/**
 * Home/Dashboard Screen
 *
 * Default view showing:
 * - Personalized greeting based on time of day
 * - Quick stats (active tasks, week progress, points)
 * - Today's tasks filtered from assignments
 * - Coming up tasks (next 3 days)
 *
 * Navigation is handled by the parent MainLayout component.
 */
@Component({
  selector: 'app-home',
  imports: [
    TaskCardComponent,
    StatCard,
    TaskFormModal,
    CelebrationComponent,
    FailedTasksSectionComponent,
    WeekComparison,
    ChildrenTrends,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly childrenService = inject(ChildrenService);
  private readonly authService = inject(AuthService);
  private readonly householdService = inject(HouseholdService);
  private readonly householdStore = inject(HouseholdStore);
  private readonly dashboardService = inject(DashboardService);
  private readonly analyticsService = inject(AnalyticsService);

  // State signals
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly todayTasks = signal<Assignment[]>([]);
  protected readonly upcomingTasks = signal<Assignment[]>([]);
  protected readonly stats = signal<DashboardStats>({
    activeCount: 0,
    weekProgress: 0,
    totalPoints: 0,
  });
  protected readonly children = signal<Child[]>([]);
  protected readonly userName = signal<string>('there');
  protected readonly householdId = signal<string | null>(null);
  protected readonly householdName = signal<string>('My Family');
  protected readonly analytics = signal<HouseholdAnalytics | null>(null);

  // Modal state
  protected readonly editTaskOpen = signal(false);
  protected readonly selectedTask = signal<Task | null>(null);

  // Celebration state
  protected readonly showCelebrationAnimation = signal(false);

  // Computed values
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    return 'Good evening';
  });

  protected readonly hasTodayTasks = computed(() => this.todayTasks().length > 0);
  protected readonly hasUpcomingTasks = computed(() => this.upcomingTasks().length > 0);

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  /**
   * Load all data for the dashboard
   */
  protected async loadData(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);

      const user = this.authService.currentUser();
      if (!user) {
        this.error.set('User not authenticated');
        return;
      }

      // Get user's households
      const households = await this.householdService.listHouseholds();
      if (households.length === 0) {
        this.error.set('No household found');
        return;
      }

      // Get active household from store (respects user's selection from switcher)
      let activeHouseholdId = this.householdStore.activeHouseholdId();

      // If no active household, auto-activate the first one
      if (!activeHouseholdId) {
        await this.householdStore.autoActivateHousehold();
        activeHouseholdId = this.householdStore.activeHouseholdId();
      }

      // Find the active household in the list (fallback to first if not found)
      const household = households.find((h) => h.id === activeHouseholdId) || households[0];

      this.householdId.set(household.id);
      this.householdName.set(household.name);
      // Use firstName if available, fallback to email username
      this.userName.set(user.firstName || user.email.split('@')[0]);

      // Active household is already set - don't overwrite it
      // (either from switcher or from autoActivateHousehold above)

      // Load children, tasks, stats, and analytics in parallel
      const [childrenData] = await Promise.all([
        this.childrenService.listChildren(household.id),
        this.loadTodayTasks(household.id),
        this.loadUpcomingTasks(household.id),
        this.loadStats(household.id),
        this.loadAnalytics(household.id),
      ]);

      this.children.set(childrenData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      this.error.set('Failed to load dashboard. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Load today's task assignments
   */
  private async loadTodayTasks(householdId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    this.taskService
      .getHouseholdAssignments(householdId, { date: today, status: 'pending' })
      .subscribe({
        next: (assignments) => this.todayTasks.set(assignments),
        error: (err) => console.error('Failed to load today tasks:', err),
      });
  }

  /**
   * Load upcoming task assignments (next 3 days)
   */
  private async loadUpcomingTasks(householdId: string): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    this.taskService
      .getHouseholdAssignments(householdId, { date: tomorrowStr, status: 'pending' })
      .subscribe({
        next: (assignments) => this.upcomingTasks.set(assignments.slice(0, 3)),
        error: (err) => console.error('Failed to load upcoming tasks:', err),
      });
  }

  /**
   * Load dashboard statistics from dedicated endpoint
   */
  private async loadStats(householdId: string): Promise<void> {
    try {
      const dashboard = await this.dashboardService.getDashboard(householdId);
      const weekSummary = dashboard?.weekSummary;
      const children = dashboard?.children ?? [];

      this.stats.set({
        activeCount: weekSummary?.pending ?? 0,
        weekProgress: weekSummary?.completionRate ?? 0,
        totalPoints: children.reduce((sum, c) => {
          const tasks = Number(c.tasksCompleted) || 0;
          return sum + tasks * 10;
        }, 0),
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  /**
   * Load household analytics for trends and comparison
   */
  private async loadAnalytics(householdId: string): Promise<void> {
    try {
      const analytics = await this.analyticsService.getHouseholdAnalytics(householdId, 'week');
      this.analytics.set(analytics);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      // Analytics is optional - don't show error to user
    }
  }

  /**
   * Handle task completion
   */
  protected async onCompleteTask(taskId: string): Promise<void> {
    try {
      await this.taskService.completeTask(taskId);

      // Remove from today's tasks
      this.todayTasks.update((tasks) => tasks.filter((t) => t.id !== taskId));

      // Update stats
      this.stats.update((current) => ({
        ...current,
        activeCount: current.activeCount - 1,
        totalPoints: current.totalPoints + 10,
      }));

      // TODO: Add celebration animation
      this.showCelebration();
    } catch (err) {
      console.error('Failed to complete task:', err);
      this.error.set('Failed to complete task. Please try again.');
    }
  }

  /**
   * Handle task edit - open edit modal with task data
   */
  protected async onEditTask(taskId: string): Promise<void> {
    const householdIdValue = this.householdId();
    if (!householdIdValue) return;

    // Find task from assignments and load full task template
    this.taskService.getTask(householdIdValue, taskId).subscribe({
      next: (task) => {
        this.selectedTask.set(task);
        this.editTaskOpen.set(true);
      },
      error: (err) => {
        console.error('Failed to load task:', err);
        this.error.set('Failed to load task details.');
      },
    });
  }

  /**
   * Handle task update from edit modal
   */
  protected onTaskUpdated(data: TaskFormData): void {
    const task = this.selectedTask();
    const householdIdValue = this.householdId();
    if (!task || !householdIdValue) return;

    this.taskService.updateTask(householdIdValue, task.id, data).subscribe({
      next: () => {
        this.editTaskOpen.set(false);
        this.selectedTask.set(null);
        // Reload data to reflect changes
        this.loadData();
      },
      error: (err) => {
        console.error('Failed to update task:', err);
        this.error.set('Failed to update task. Please try again.');
      },
    });
  }

  /**
   * Handle task deletion from edit modal
   */
  protected onTaskDeleted(): void {
    const task = this.selectedTask();
    const householdIdValue = this.householdId();
    if (!task || !householdIdValue) return;

    this.taskService.deleteTask(householdIdValue, task.id).subscribe({
      next: () => {
        this.editTaskOpen.set(false);
        this.selectedTask.set(null);
        // Reload data to reflect changes
        this.loadData();
      },
      error: (err) => {
        console.error('Failed to delete task:', err);
        this.error.set('Failed to delete task. Please try again.');
      },
    });
  }

  /**
   * Show celebration animation when task is completed
   */
  private showCelebration(): void {
    this.showCelebrationAnimation.set(true);
  }

  /**
   * Handle celebration animation completion
   */
  protected onCelebrationDismissed(): void {
    this.showCelebrationAnimation.set(false);
  }

  /**
   * Close edit task modal
   */
  protected closeEditTask(): void {
    this.editTaskOpen.set(false);
    this.selectedTask.set(null);
  }
}
