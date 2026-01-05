import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AnalyticsService } from '../../services/analytics.service';
import { TaskService, type MyTaskAssignment } from '../../services/task.service';
import { SingleTaskService } from '../../services/single-task.service';
import { AvailableTasksSectionComponent } from '../../components/available-tasks-section/available-tasks-section';
import { StreakCounter } from '../../components/streak-counter/streak-counter';
import { ProgressSummary } from '../../components/progress-summary/progress-summary';
import { DailyPointsChart } from '../../components/daily-points-chart/daily-points-chart';
import type { ChildAnalytics } from '@st44/types';

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
  imports: [AvailableTasksSectionComponent, StreakCounter, ProgressSummary, DailyPointsChart],
  templateUrl: './child-dashboard.html',
  styleUrl: './child-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildDashboardComponent implements OnInit {
  private router = inject(Router);
  private analyticsService = inject(AnalyticsService);
  private taskService = inject(TaskService);
  private singleTaskService = inject(SingleTaskService);

  // Local state
  analytics = signal<ChildAnalytics | null>(null);
  errorMessage = signal('');
  completingTasks = signal<Set<string>>(new Set());

  // Use TaskService signals directly for reactive updates
  isLoading = this.taskService.myTasksLoading;
  childName = this.taskService.myTasksChildName;
  tasks = this.taskService.myTasks;
  totalPoints = this.taskService.myTasksTotalPoints;
  completedPoints = this.taskService.myTasksCompletedPoints;

  // Computed values derived from TaskService signals
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
  hasAvailableTasks = computed(() => this.singleTaskService.availableTasks().length > 0);

  async ngOnInit() {
    await this.loadMyTasks();
  }

  async loadMyTasks() {
    this.errorMessage.set('');

    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // Load tasks via TaskService (updates signals automatically)
      // and analytics in parallel
      await Promise.all([
        firstValueFrom(this.taskService.getMyTasks(undefined, today)),
        this.analyticsService.getChildAnalytics('week').then((data) => this.analytics.set(data)),
      ]);
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
    }
  }

  async onMarkDone(task: MyTaskAssignment) {
    // Add to completing set to show loading state on the button
    this.completingTasks.update((set) => new Set(set).add(task.id));

    try {
      // Complete task - signal updates automatically via optimistic update
      await this.taskService.completeTask(task.id);
      // No reload needed - TaskService updates myTasksResponseSignal optimistically
    } catch (error) {
      console.error('Failed to complete task:', error);
      this.errorMessage.set('Failed to mark task as done. Please try again.');
    } finally {
      // Remove from completing set
      this.completingTasks.update((set) => {
        const newSet = new Set(set);
        newSet.delete(task.id);
        return newSet;
      });
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
