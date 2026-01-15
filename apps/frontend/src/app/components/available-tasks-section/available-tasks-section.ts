import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SingleTaskService, type AvailableSingleTask } from '../../services/single-task.service';

/**
 * Available Tasks Section Component
 *
 * Displays available single tasks for the current child with accept/decline buttons.
 * Shows deadline information and allows children to accept or decline task offers.
 */
@Component({
  selector: 'app-available-tasks-section',
  imports: [CommonModule],
  templateUrl: './available-tasks-section.html',
  styleUrl: './available-tasks-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvailableTasksSectionComponent implements OnInit {
  private singleTaskService = inject(SingleTaskService);

  // State signals
  protected processingTaskId = signal<string | null>(null);
  protected actionError = signal<string | null>(null);

  // Service signals
  protected tasks = this.singleTaskService.availableTasks;
  protected loading = this.singleTaskService.availableLoading;
  protected error = this.singleTaskService.availableError;

  // Computed
  protected hasTasks = computed(() => this.tasks().length > 0);
  protected isProcessing = computed(() => this.processingTaskId() !== null);

  ngOnInit(): void {
    this.loadTasks();
  }

  /**
   * Load available tasks
   */
  protected loadTasks(): void {
    this.singleTaskService.loadAvailableTasks().subscribe({
      error: (err) => {
        console.error('Failed to load available tasks:', err);
      },
    });
  }

  /**
   * Accept a task
   */
  protected onAccept(task: AvailableSingleTask): void {
    if (this.processingTaskId()) return; // Prevent duplicate submissions

    this.processingTaskId.set(task.id);
    this.actionError.set(null);

    this.singleTaskService.acceptTask(task.householdId, task.id).subscribe({
      next: () => {
        this.processingTaskId.set(null);
        // Task automatically removed from list by service
      },
      error: (err) => {
        this.processingTaskId.set(null);
        const errorMsg =
          err?.error?.error ||
          $localize`:@@availableTasks.acceptFailed:Kunne ikke akseptere oppgave`;
        this.actionError.set(errorMsg);
        console.error('Failed to accept task:', err);
      },
    });
  }

  /**
   * Decline a task
   */
  protected onDecline(task: AvailableSingleTask): void {
    if (this.processingTaskId()) return; // Prevent duplicate submissions

    this.processingTaskId.set(task.id);
    this.actionError.set(null);

    this.singleTaskService.declineTask(task.householdId, task.id).subscribe({
      next: () => {
        this.processingTaskId.set(null);
        // Task automatically removed from list by service
      },
      error: (err) => {
        this.processingTaskId.set(null);
        const errorMsg =
          err?.error?.error || $localize`:@@availableTasks.declineFailed:Kunne ikke avvise oppgave`;
        this.actionError.set(errorMsg);
        console.error('Failed to decline task:', err);
      },
    });
  }

  /**
   * Get deadline display text
   */
  protected getDeadlineText(task: AvailableSingleTask): string {
    if (!task.hasDeadline) return '';

    const days = task.daysUntilDeadline ?? 0;
    if (days < 0) return $localize`:@@availableTasks.overdue:Forfalt`;
    if (days === 0) return $localize`:@@availableTasks.dueToday:Forfaller i dag`;
    if (days === 1) return $localize`:@@availableTasks.dueTomorrow:Forfaller i morgen`;
    return $localize`:@@availableTasks.dueInDays:Forfaller om ${days} dager`;
  }

  /**
   * Check if deadline is urgent (less than 2 days)
   */
  protected isDeadlineUrgent(task: AvailableSingleTask): boolean {
    if (!task.hasDeadline) return false;
    const days = task.daysUntilDeadline ?? 0;
    return days >= 0 && days < 2;
  }

  /**
   * Check if task is being processed
   */
  protected isTaskProcessing(taskId: string): boolean {
    return this.processingTaskId() === taskId;
  }
}
