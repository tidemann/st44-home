import {
  Component,
  input,
  output,
  signal,
  inject,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../modal/modal';
import type { Task, TaskRuleType } from '@st44/types';

/**
 * Data structure for edit task submission
 */
export interface EditTaskData {
  name: string;
  points: number;
  ruleType: TaskRuleType;
}

/**
 * Edit Task Modal
 *
 * Allows users to edit existing task templates with all fields:
 * - Task name (required)
 * - Points (required)
 * - Recurrence rule (required)
 *
 * Emits updated task data or delete event.
 */
@Component({
  selector: 'app-edit-task-modal',
  imports: [Modal, ReactiveFormsModule],
  templateUrl: './edit-task-modal.html',
  styleUrl: './edit-task-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditTaskModal {
  /**
   * Whether the modal is open
   */
  open = input<boolean>(false);

  /**
   * Task to edit
   */
  task = input<Task | null>(null);

  /**
   * Event emitted when modal should closeModal
   */
  closeRequested = output<void>();

  /**
   * Event emitted when task is updated
   */
  taskUpdated = output<EditTaskData>();

  /**
   * Event emitted when task should be deleted
   */
  taskDeleted = output<void>();

  /**
   * Form builder
   */
  private readonly fb = inject(FormBuilder);

  /**
   * Form group for edit task
   */
  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(255)]],
    points: [5, [Validators.required, Validators.min(1), Validators.max(1000)]],
    ruleType: ['daily' as TaskRuleType, [Validators.required]],
  });

  /**
   * Submission loading state
   */
  protected readonly submitting = signal(false);

  /**
   * Delete confirmation state
   */
  protected readonly showDeleteConfirm = signal(false);

  /**
   * Available recurrence options
   */
  protected readonly recurrenceOptions: { value: TaskRuleType; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'repeating', label: 'Repeating (Custom Days)' },
    { value: 'weekly_rotation', label: 'Weekly Rotation' },
  ];

  constructor() {
    // Update form when task changes
    effect(() => {
      const currentTask = this.task();
      if (currentTask) {
        this.form.patchValue({
          name: currentTask.name,
          points: currentTask.points,
          ruleType: currentTask.ruleType,
        });
        this.showDeleteConfirm.set(false);
      }
    });
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const formValue = this.form.value;

    // Emit updated task data
    this.taskUpdated.emit({
      name: formValue.name!.trim(),
      points: formValue.points!,
      ruleType: formValue.ruleType!,
    });
  }

  /**
   * Handle delete button click
   */
  onDeleteClick(): void {
    this.showDeleteConfirm.set(true);
  }

  /**
   * Confirm delete
   */
  onConfirmDelete(): void {
    this.taskDeleted.emit();
    this.showDeleteConfirm.set(false);
  }

  /**
   * Cancel delete
   */
  onCancelDelete(): void {
    this.showDeleteConfirm.set(false);
  }

  /**
   * Handle modal closeRequested
   */
  onClose(): void {
    this.showDeleteConfirm.set(false);
    this.closeRequested.emit();
  }

  /**
   * Handle cancel button click
   */
  onCancel(): void {
    this.onClose();
  }
}
