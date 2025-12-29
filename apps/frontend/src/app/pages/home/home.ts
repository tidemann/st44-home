import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { StatCard } from '../../components/stat-card/stat-card';
import { BottomNav } from '../../components/navigation/bottom-nav/bottom-nav';
import { SidebarNav } from '../../components/navigation/sidebar-nav/sidebar-nav';
import {
  QuickAddModal,
  type QuickAddTaskData,
} from '../../components/modals/quick-add-modal/quick-add-modal';
import {
  EditTaskModal,
  type EditTaskData,
} from '../../components/modals/edit-task-modal/edit-task-modal';
import { TaskService } from '../../services/task.service';
import { ChildrenService } from '../../services/children.service';
import { AuthService } from '../../services/auth.service';
import { HouseholdService } from '../../services/household.service';
import type { Task, Assignment, Child } from '@st44/types';
import type { SidebarUser } from '../../components/navigation/sidebar-nav/sidebar-nav';

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
 * - FAB button for quick-add (mobile only)
 * - Responsive navigation (BottomNav mobile, SidebarNav desktop)
 */
@Component({
  selector: 'app-home',
  imports: [TaskCardComponent, StatCard, BottomNav, SidebarNav, QuickAddModal, EditTaskModal],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private readonly router = inject(Router);
  private readonly taskService = inject(TaskService);
  private readonly childrenService = inject(ChildrenService);
  private readonly authService = inject(AuthService);
  private readonly householdService = inject(HouseholdService);

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

  // Modal state
  protected readonly quickAddOpen = signal(false);
  protected readonly editTaskOpen = signal(false);
  protected readonly selectedTask = signal<Task | null>(null);

  // Navigation state
  protected readonly activeScreen = signal<'home' | 'tasks' | 'family' | 'progress'>('home');

  // Computed values
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    return 'Good evening';
  });

  protected readonly hasTodayTasks = computed(() => this.todayTasks().length > 0);
  protected readonly hasUpcomingTasks = computed(() => this.upcomingTasks().length > 0);

  protected readonly sidebarUser = computed<SidebarUser>(() => ({
    name: this.userName(),
    avatar: '', // Will use initials
    household: this.householdName(),
  }));

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

      // Get user's household
      const households = await this.householdService.listHouseholds();
      if (households.length === 0) {
        this.error.set('No household found');
        return;
      }

      const household = households[0];
      this.householdId.set(household.id);
      this.householdName.set(household.name);
      this.userName.set(user.email.split('@')[0]); // Use email username for now

      // Load children, tasks, and stats in parallel
      const [childrenData] = await Promise.all([
        this.childrenService.listChildren(household.id),
        this.loadTodayTasks(household.id),
        this.loadUpcomingTasks(household.id),
        this.loadStats(household.id),
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
   * Load dashboard statistics
   */
  private async loadStats(householdId: string): Promise<void> {
    // For now, calculate stats from assignments
    // TODO: Create a dedicated stats endpoint
    this.taskService.getHouseholdAssignments(householdId).subscribe({
      next: (assignments) => {
        const pending = assignments.filter((a) => a.status === 'pending').length;
        const completed = assignments.filter((a) => a.status === 'completed').length;
        const total = assignments.length;
        const weekProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

        this.stats.set({
          activeCount: pending,
          weekProgress,
          totalPoints: completed * 10, // Placeholder calculation
        });
      },
      error: (err) => console.error('Failed to load stats:', err),
    });
  }

  /**
   * Handle task completion
   */
  protected onCompleteTask(taskId: string): void {
    this.taskService.completeTask(taskId).subscribe({
      next: () => {
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
      },
      error: (err) => {
        console.error('Failed to complete task:', err);
        this.error.set('Failed to complete task. Please try again.');
      },
    });
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
  protected onTaskUpdated(data: EditTaskData): void {
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
   * Handle quick-add task creation
   */
  protected onTaskCreated(data: QuickAddTaskData): void {
    const householdIdValue = this.householdId();
    if (!householdIdValue) return;

    this.taskService
      .createTask(householdIdValue, {
        name: data.name,
        points: data.points,
        ruleType: 'daily', // Default to daily for quick-add
      })
      .subscribe({
        next: () => {
          this.quickAddOpen.set(false);
          // Reload data to show new task
          this.loadData();
        },
        error: (err) => {
          console.error('Failed to create task:', err);
          this.error.set('Failed to create task. Please try again.');
        },
      });
  }

  /**
   * Show celebration animation (placeholder)
   */
  private showCelebration(): void {
    // Celebration animation is handled by CSS in task-card component
    // via the .completed class animation
  }

  /**
   * Handle navigation between screens
   */
  protected onNavigate(screen: 'home' | 'tasks' | 'family' | 'progress'): void {
    const routes: Record<string, string> = {
      home: '/home',
      tasks: '/household/all-tasks',
      family: '/family',
      progress: '/progress',
    };

    const route = routes[screen];
    if (route) {
      this.router.navigate([route]);
    }
  }

  /**
   * Open quick-add modal
   */
  protected openQuickAdd(): void {
    this.quickAddOpen.set(true);
  }

  /**
   * Close quick-add modal
   */
  protected closeQuickAdd(): void {
    this.quickAddOpen.set(false);
  }

  /**
   * Close edit task modal
   */
  protected closeEditTask(): void {
    this.editTaskOpen.set(false);
    this.selectedTask.set(null);
  }
}
