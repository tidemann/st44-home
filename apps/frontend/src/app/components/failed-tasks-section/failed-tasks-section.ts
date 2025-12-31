import {
  Component,
  computed,
  inject,
  input,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SingleTaskService, type FailedTask } from '../../services/single-task.service';

/**
 * Failed Tasks Section Component
 *
 * Displays tasks where all candidates declined or deadline expired.
 * Parent-facing component that shows tasks needing attention.
 */
@Component({
  selector: 'app-failed-tasks-section',
  imports: [CommonModule],
  templateUrl: './failed-tasks-section.html',
  styleUrl: './failed-tasks-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FailedTasksSectionComponent implements OnInit {
  private singleTaskService = inject(SingleTaskService);
  private router = inject(Router);

  // Input
  householdId = input.required<string>();

  // Service signals
  protected failedTasks = this.singleTaskService.failedTasks;
  protected expiredTasks = this.singleTaskService.expiredTasks;
  protected failedLoading = this.singleTaskService.failedLoading;
  protected expiredLoading = this.singleTaskService.expiredLoading;
  protected failedError = this.singleTaskService.failedError;
  protected expiredError = this.singleTaskService.expiredError;

  // Computed
  protected hasFailedTasks = computed(() => this.failedTasks().length > 0);
  protected hasExpiredTasks = computed(() => this.expiredTasks().length > 0);
  protected hasProblemTasks = computed(() => this.hasFailedTasks() || this.hasExpiredTasks());
  protected totalCount = computed(
    () => this.failedTasks().length + this.expiredTasks().length,
  );
  protected isLoading = computed(() => this.failedLoading() || this.expiredLoading());

  ngOnInit(): void {
    this.loadTasks();
  }

  /**
   * Load failed and expired tasks
   */
  protected loadTasks(): void {
    const id = this.householdId();
    if (!id) return;

    this.singleTaskService.loadFailedTasks(id).subscribe({
      error: (err) => {
        console.error('Failed to load failed tasks:', err);
      },
    });

    this.singleTaskService.loadExpiredTasks(id).subscribe({
      error: (err) => {
        console.error('Failed to load expired tasks:', err);
      },
    });
  }

  /**
   * Navigate to tasks page to manually assign
   */
  protected onAssignManually(taskId: string): void {
    // Navigate to tasks page with task selected for manual assignment
    this.router.navigate(['/tasks'], {
      queryParams: { assign: taskId },
    });
  }

  /**
   * Get days overdue for expired task
   */
  protected getDaysOverdue(task: FailedTask): number {
    if (!task.deadline) return 0;
    const deadline = new Date(task.deadline);
    const now = new Date();
    const diffMs = now.getTime() - deadline.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Format deadline date
   */
  protected formatDeadline(deadline: Date | null): string {
    if (!deadline) return '';
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  }
}
