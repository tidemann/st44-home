import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService, MyTasksResponse, ChildTask } from '../../services/dashboard.service';
import { TaskService } from '../../services/task.service';

/**
 * Child Dashboard Component
 *
 * Landing page for child users showing:
 * - Friendly greeting with child name
 * - Today's task assignments
 * - Points earned vs total available
 * - Simple one-tap task completion
 *
 * Optimized for children with large buttons, clear text, and visual feedback.
 */
@Component({
  selector: 'app-child-dashboard',
  imports: [],
  templateUrl: './child-dashboard.html',
  styleUrl: './child-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildDashboardComponent implements OnInit {
  private router = inject(Router);
  private dashboardService = inject(DashboardService);
  private taskService = inject(TaskService);

  // State
  childDashboard = signal<MyTasksResponse | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');
  completingTasks = signal<Set<string>>(new Set());

  // Computed values
  childName = computed(() => this.childDashboard()?.childName ?? '');
  tasks = computed(() => this.childDashboard()?.tasks ?? []);
  totalPoints = computed(() => this.childDashboard()?.totalPointsToday ?? 0);
  completedPoints = computed(() => this.childDashboard()?.completedPoints ?? 0);
  progressPercent = computed(() => {
    const total = this.totalPoints();
    if (total === 0) return 0;
    return Math.round((this.completedPoints() / total) * 100);
  });
  hasTasks = computed(() => this.tasks().length > 0);
  allCompleted = computed(() => {
    const tasks = this.tasks();
    return tasks.length > 0 && tasks.every((t) => t.status === 'completed');
  });
  pendingTasks = computed(() => this.tasks().filter((t) => t.status === 'pending'));
  completedTasks = computed(() => this.tasks().filter((t) => t.status === 'completed'));

  async ngOnInit() {
    await this.loadMyTasks();
  }

  async loadMyTasks() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      const data = await this.dashboardService.getMyTasks(today);
      this.childDashboard.set(data);
    } catch (error: unknown) {
      const httpError = error as { status?: number };

      if (httpError?.status === 401) {
        await this.router.navigate(['/child-login']);
        return;
      } else if (httpError?.status === 403) {
        this.errorMessage.set('Oops! It looks like you need to be a child to see this page.');
      } else if (httpError?.status === 404) {
        this.errorMessage.set("We couldn't find your profile. Please ask a parent for help.");
      } else {
        this.errorMessage.set("We couldn't load your tasks right now. Please try again!");
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async onMarkDone(task: ChildTask) {
    // Add to completing set to show loading state
    const completing = new Set(this.completingTasks());
    completing.add(task.id);
    this.completingTasks.set(completing);

    try {
      await this.taskService.completeTask(task.id);
      // Reload dashboard to get updated data
      await this.loadMyTasks();
    } catch (error) {
      console.error('Failed to complete task:', error);
      this.errorMessage.set('Failed to mark task as done. Please try again.');
    } finally {
      // Remove from completing set
      const completing = new Set(this.completingTasks());
      completing.delete(task.id);
      this.completingTasks.set(completing);
    }
  }

  isCompleting(taskId: string): boolean {
    return this.completingTasks().has(taskId);
  }

  getProgressClass(): string {
    const percent = this.progressPercent();
    if (percent >= 70) return 'progress-high';
    if (percent >= 40) return 'progress-medium';
    return 'progress-low';
  }
}
