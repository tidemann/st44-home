import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import type { Task, Assignment } from '@st44/types';

/**
 * Reusable task card component for displaying tasks and assignments
 *
 * Supports both Task templates (with points, recurrence rules) and Assignment instances (with status, dates).
 * Shows task name/title, recurrence/status, and points with interactive completion and edit actions.
 * Used throughout the Diddit! app for task management.
 */
@Component({
  selector: 'app-task-card',
  imports: [],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardComponent {
  /**
   * Task or Assignment data to display
   */
  task = input.required<Task | Assignment>();

  /**
   * Whether to show the complete button
   */
  showCompleteButton = input<boolean>(true);

  /**
   * Whether the card is clickable for editing
   */
  clickable = input<boolean>(true);

  /**
   * Computed: Whether the task is marked as completed
   */
  completed = computed(() => {
    const t = this.task();
    return 'status' in t ? t.status === 'completed' : false;
  });

  /**
   * Computed: Is this an Assignment (vs Task template)?
   */
  isAssignment = computed(() => {
    return 'status' in this.task();
  });

  /**
   * Computed: Is this assignment overdue?
   */
  isOverdue = computed(() => {
    const t = this.task();
    if (!('status' in t) || t.status !== 'pending') return false;

    const taskDate = new Date(t.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return taskDate < today;
  });

  /**
   * Computed: Task name or title
   */
  taskName = computed(() => {
    const t = this.task();
    return 'name' in t ? t.name : t.title;
  });

  /**
   * Computed: Task points (from Task template or Assignment with points)
   */
  taskPoints = computed(() => {
    const t = this.task();
    return 'points' in t ? t.points : undefined;
  });

  /**
   * Computed: Display text for recurrence rule or status
   */
  metaText = computed(() => {
    const t = this.task();

    // For assignments, show status or overdue
    if ('status' in t) {
      if (t.status === 'completed') return 'Completed';
      if (this.isOverdue()) return 'Overdue';
      return 'Pending';
    }

    // For task templates, show recurrence
    const ruleType = t.ruleType;
    switch (ruleType) {
      case 'daily':
        return 'Daily';
      case 'weekly_rotation':
        return 'Weekly Rotation';
      case 'repeating':
        return 'Repeating';
      default:
        return '';
    }
  });

  /**
   * Event emitted when user clicks the complete button
   */
  complete = output<string>();

  /**
   * Event emitted when user clicks the task card to edit
   */
  edit = output<string>();

  /**
   * Handle completion button click
   */
  onCompleteClick(event: Event): void {
    event.stopPropagation();
    this.complete.emit(this.task().id);
  }

  /**
   * Handle card click for editing
   */
  onCardClick(): void {
    if (this.clickable()) {
      this.edit.emit(this.task().id);
    }
  }

  /**
   * Handle keyboard events for accessibility
   */
  onKeyDown(event: KeyboardEvent): void {
    if (this.clickable() && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.edit.emit(this.task().id);
    }
  }
}
