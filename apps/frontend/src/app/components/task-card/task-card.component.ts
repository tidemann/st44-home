import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Assignment } from '@st44/types';

/**
 * Reusable task card component for displaying individual task assignments
 *
 * Shows task title, description, status badge, and completion action.
 * Used in both child and parent task views.
 */
@Component({
  selector: 'app-task-card',
  imports: [CommonModule],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardComponent {
  /**
   * Task assignment to display
   */
  task = input.required<Assignment>();

  /**
   * Event emitted when user clicks "Mark Complete" button
   */
  complete = output<string>();

  /**
   * Computed: Is this task overdue?
   * (pending status and date is in the past)
   */
  isOverdue = computed(() => {
    const t = this.task();
    if (t.status !== 'pending') return false;

    const taskDate = new Date(t.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    return taskDate < today;
  });

  /**
   * Handle completion button click
   */
  onCompleteClick(): void {
    this.complete.emit(this.task().id);
  }
}
