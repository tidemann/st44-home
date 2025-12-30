import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import type { Assignment } from '@st44/types';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { TaskCardComponent } from '../task-card/task-card';

/**
 * Child-facing task list component
 *
 * Displays a child's assigned tasks with filtering options (Today, This Week).
 * Provides one-tap completion action and progress tracking.
 * Mobile-optimized with large touch targets and clear visual feedback.
 */
@Component({
  selector: 'app-child-task-list',
  imports: [CommonModule, TaskCardComponent],
  templateUrl: './child-task-list.html',
  styleUrl: './child-task-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildTaskListComponent implements OnInit {
  private taskService = inject(TaskService);
  private authService = inject(AuthService);

  // State signals
  protected dateFilter = signal<'today' | 'week'>('today');
  protected childId = signal<string>('');

  // Computed: Get current user ID (assuming child is logged in user)
  protected loading = computed(() => this.taskService.assignmentsLoading());
  protected error = computed(() => this.taskService.assignmentsError());

  // Computed: Filter assignments by date range
  protected tasks = computed(() => {
    const assignments = this.taskService.assignments();
    const filter = this.dateFilter();
    return this.filterByDateRange(assignments, filter);
  });

  // Computed: Count completed tasks
  protected completedCount = computed(() => {
    return this.tasks().filter((t) => t.status === 'completed').length;
  });

  // Computed: Progress percentage
  protected progressPercent = computed(() => {
    const total = this.tasks().length;
    if (total === 0) return 0;
    return Math.round((this.completedCount() / total) * 100);
  });

  ngOnInit(): void {
    // Get child ID from auth context (assuming user is logged in as child)
    // In a real app, this would come from user context or route params
    const user = this.authService.currentUser();
    if (user?.id) {
      this.childId.set(user.id);
      this.loadTasks();
    }
  }

  /**
   * Change date filter and reload tasks
   */
  protected filterDate(filter: 'today' | 'week'): void {
    this.dateFilter.set(filter);
    this.loadTasks();
  }

  /**
   * Load tasks from API
   */
  private loadTasks(): void {
    const childId = this.childId();
    if (!childId) return;

    const date = this.dateFilter() === 'today' ? format(new Date(), 'yyyy-MM-dd') : undefined;
    const status = undefined; // Show all statuses

    this.taskService.getChildTasks(childId, date, status).subscribe({
      error: (err) => {
        console.error('Failed to load child tasks:', err);
      },
    });
  }

  /**
   * Handle task completion
   */
  protected onComplete(assignmentId: string): void {
    this.taskService.completeTask(assignmentId).subscribe({
      error: (err) => {
        console.error('Failed to complete task:', err);
        // Error is already set in service signal
      },
    });
  }

  /**
   * Filter assignments by date range
   */
  private filterByDateRange(tasks: Assignment[], filter: 'today' | 'week'): Assignment[] {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');

    if (filter === 'today') {
      return tasks.filter((t) => t.date === today);
    }

    // This week (Monday - Sunday)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return tasks.filter((t) =>
      isWithinInterval(parseISO(t.date), { start: weekStart, end: weekEnd }),
    );
  }
}
