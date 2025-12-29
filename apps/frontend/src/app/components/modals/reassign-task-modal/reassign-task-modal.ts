import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Modal } from '../modal/modal';
import type { Child } from '@st44/types';

/**
 * Reassign Task Modal
 *
 * Allows users to reassign a task assignment to a different child.
 * Shows a dropdown of available children in the household.
 *
 * Emits the selected child ID when reassignment is confirmed.
 */
@Component({
  selector: 'app-reassign-task-modal',
  imports: [Modal, FormsModule],
  templateUrl: './reassign-task-modal.html',
  styleUrl: './reassign-task-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReassignTaskModal {
  /**
   * Whether the modal is open
   */
  open = input<boolean>(false);

  /**
   * Task/assignment name for display
   */
  taskName = input<string>('');

  /**
   * Current child ID (to exclude from selection)
   */
  currentChildId = input<string | null>(null);

  /**
   * Available children to reassign to
   */
  children = input<Child[]>([]);

  /**
   * Event emitted when modal should close
   */
  closeRequested = output<void>();

  /**
   * Event emitted when reassignment is confirmed
   */
  reassigned = output<string>();

  /**
   * Selected child ID
   */
  protected selectedChildId = signal<string | null>(null);

  /**
   * Error message
   */
  protected error = signal<string | null>(null);

  /**
   * Handle child selection change
   */
  protected onChildChange(childId: string): void {
    this.selectedChildId.set(childId);
    this.error.set(null);
  }

  /**
   * Handle form submission
   */
  protected onSubmit(): void {
    const childId = this.selectedChildId();

    if (!childId) {
      this.error.set('Please select a child');
      return;
    }

    this.reassigned.emit(childId);
    this.selectedChildId.set(null);
    this.error.set(null);
  }

  /**
   * Handle cancel/close
   */
  protected onCancel(): void {
    this.selectedChildId.set(null);
    this.error.set(null);
    this.closeRequested.emit();
  }
}
