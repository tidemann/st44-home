import { Component, input, output, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../modal/modal';
import type { Child } from '@st44/types';

/**
 * Data structure for quick-add task submission
 */
export interface QuickAddTaskData {
  name: string;
  assignedChildId: string;
  points: number;
}

/**
 * Quick-Add Task Modal
 *
 * Allows users to quickly create a new task with minimal fields:
 * - Task name (required)
 * - Assign to child (required)
 * - Points (optional, default: 5)
 *
 * Emits task data on submit for parent component to handle API call.
 */
@Component({
  selector: 'app-quick-add-modal',
  imports: [Modal, ReactiveFormsModule],
  templateUrl: './quick-add-modal.html',
  styleUrl: './quick-add-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickAddModal {
  /**
   * Whether the modal is open
   */
  open = input<boolean>(false);

  /**
   * List of children to assign task to
   */
  children = input.required<Child[]>();

  /**
   * Event emitted when modal should closeModal
   */
  closeRequested = output<void>();

  /**
   * Event emitted when task is created
   */
  taskCreated = output<QuickAddTaskData>();

  /**
   * Form builder
   */
  private readonly fb = inject(FormBuilder);

  /**
   * Form group for quick-add task
   */
  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(255)]],
    assignedChildId: ['', [Validators.required]],
    points: [5, [Validators.required, Validators.min(1), Validators.max(1000)]],
  });

  /**
   * Submission loading state
   */
  protected readonly submitting = signal(false);

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const formValue = this.form.value;

    // Emit task data
    this.taskCreated.emit({
      name: formValue.name!.trim(),
      assignedChildId: formValue.assignedChildId!,
      points: formValue.points!,
    });

    // Reset form
    this.form.reset({ points: 5 });
  }

  /**
   * Handle modal closeRequested
   */
  onClose(): void {
    this.form.reset({ points: 5 });
    this.closeRequested.emit();
  }

  /**
   * Handle cancel button click
   */
  onCancel(): void {
    this.onClose();
  }
}
