import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Child, Task } from '@st44/types';
import { AssignmentService } from '../../services/assignment.service';

@Component({
  selector: 'app-manual-assignment-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './manual-assignment-modal.html',
  styleUrls: ['./manual-assignment-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManualAssignmentModalComponent implements OnInit {
  private readonly assignmentService = inject(AssignmentService);

  // Inputs
  tasks = input.required<Task[]>();
  children = input.required<Child[]>();
  householdId = input.required<string>();

  // Outputs
  closeModal = output<void>();
  assignmentCreated = output<void>();

  // State
  protected selectedTaskId = signal<string | null>(null);
  protected selectedChildId = signal<string | null>(null);
  protected selectedDate = signal<string>('');
  protected isSubmitting = signal(false);
  protected errorMessage = signal<string | null>(null);
  protected successMessage = signal<string | null>(null);

  ngOnInit(): void {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    this.selectedDate.set(today);
  }

  // Computed
  protected canSubmit = computed(() => {
    return (
      this.selectedTaskId() !== null &&
      this.selectedChildId() !== null &&
      this.selectedDate() !== '' &&
      !this.isSubmitting()
    );
  });

  // Methods
  protected async onSubmit(): Promise<void> {
    const taskId = this.selectedTaskId();
    const childId = this.selectedChildId();
    const date = this.selectedDate();

    if (!taskId || !childId || !date) {
      this.errorMessage.set('Please select a task, child, and date');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.assignmentService.createManualAssignment({
        taskId,
        childId,
        date,
      });

      const task = this.tasks().find((t) => t.id === taskId);
      const child = this.children().find((c) => c.id === childId);
      this.successMessage.set(
        `Successfully assigned "${task?.name}" to ${child?.name} for ${date}`,
      );

      // Emit success event
      this.assignmentCreated.emit();

      // Close modal after brief delay to show success message
      setTimeout(() => {
        this.closeModal.emit();
      }, 1500);
    } catch (error: unknown) {
      const httpError = error as { status?: number; error?: { error?: string } };

      if (httpError?.status === 409) {
        this.errorMessage.set('This assignment already exists');
      } else if (httpError?.status === 403) {
        this.errorMessage.set('You do not have permission to create assignments');
      } else if (httpError?.status === 404) {
        this.errorMessage.set('Task or child not found');
      } else {
        this.errorMessage.set('Failed to create assignment. Please try again.');
      }
    } finally {
      this.isSubmitting.set(false);
    }
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

  protected getTaskName(taskId: string): string {
    const task = this.tasks().find((t) => t.id === taskId);
    return task ? task.name : 'Unknown';
  }

  protected getChildName(childId: string): string {
    const child = this.children().find((c) => c.id === childId);
    return child ? child.name : 'Unknown';
  }
}
