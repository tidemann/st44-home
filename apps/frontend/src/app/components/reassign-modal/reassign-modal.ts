import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Child } from '@st44/types';
import { ChildrenService } from '../../services/children.service';
import type { Assignment } from '@st44/types';
import { TaskService } from '../../services/task.service';

@Component({
  selector: 'app-reassign-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './reassign-modal.html',
  styleUrls: ['./reassign-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReassignModalComponent {
  private readonly childrenService = inject(ChildrenService);
  private readonly taskService = inject(TaskService);

  // Inputs
  assignment = input.required<Assignment | null>();
  children = input.required<Child[]>();

  // Outputs
  closeModal = output<void>();
  reassign = output<{ assignmentId: string; childId: string }>();

  // State
  protected selectedChildId = signal<string | null>(null);
  protected isSubmitting = signal(false);
  protected errorMessage = signal<string | null>(null);

  // Computed
  protected availableChildren = computed(() => {
    const currentAssignment = this.assignment();
    if (!currentAssignment) return this.children();

    // Filter out the child who currently has the task
    return this.children().filter((child) => child.id !== currentAssignment.childId);
  });

  protected canSubmit = computed(() => {
    return this.selectedChildId() !== null && !this.isSubmitting();
  });

  // Methods
  protected onSubmit(): void {
    const childId = this.selectedChildId();
    const currentAssignment = this.assignment();

    if (!childId || !currentAssignment) {
      this.errorMessage.set('Please select a child');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    // Emit reassign event
    this.reassign.emit({
      assignmentId: currentAssignment.id,
      childId: childId,
    });
  }

  protected onCancel(): void {
    this.closeModal.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    // Close modal if clicking on backdrop (not on modal content)
    if (event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }

  protected getChildName(childId: string): string {
    const child = this.children().find((c) => c.id === childId);
    return child ? child.name : 'Unknown';
  }
}
