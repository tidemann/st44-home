import {
  Component,
  input,
  output,
  signal,
  inject,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../modal/modal';
import { TaskService } from '../../../services/task.service';
import type { Child, CreateTaskRequest } from '@st44/types';

/**
 * Task type options
 */
export type TaskType = 'daily' | 'repeating' | 'weekly_rotation' | 'single';

/**
 * Day configuration for repeating tasks
 */
export interface DayOption {
  value: number;
  label: string;
  shortLabel: string;
}

/**
 * Data structure for create task submission
 */
export interface CreateTaskData {
  name: string;
  description: string;
  points: number;
  ruleType: TaskType;
  ruleConfig: CreateTaskRequest['ruleConfig'];
  deadline?: string;
}

/**
 * Create Task Modal
 *
 * Full-featured task creation modal supporting all 4 task types:
 * - Daily: Tasks assigned every day
 * - Repeating: Tasks on specific days of the week
 * - Weekly Rotation: Tasks that rotate between children
 * - Single: One-time tasks with optional deadline and candidates
 *
 * Used from sidebar "Add Task" button to allow creating any type of task.
 */
@Component({
  selector: 'app-create-task-modal',
  imports: [Modal, ReactiveFormsModule],
  templateUrl: './create-task-modal.html',
  styleUrl: './create-task-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTaskModal implements OnInit {
  /**
   * Whether the modal is open
   */
  open = input<boolean>(false);

  /**
   * Household ID for task creation
   */
  householdId = input.required<string>();

  /**
   * List of children for assignment options
   */
  children = input.required<Child[]>();

  /**
   * Event emitted when modal should close
   */
  closeRequested = output<void>();

  /**
   * Event emitted when task is successfully created
   */
  taskCreated = output<void>();

  /**
   * Form builder
   */
  private readonly fb = inject(FormBuilder);

  /**
   * Task service
   */
  private readonly taskService = inject(TaskService);

  /**
   * Task types configuration
   */
  readonly taskTypes: { value: TaskType; label: string; description: string }[] = [
    { value: 'daily', label: 'Daily', description: 'Assigned every day' },
    { value: 'repeating', label: 'Repeating', description: 'On specific days of the week' },
    { value: 'weekly_rotation', label: 'Weekly Rotation', description: 'Rotates between children' },
    { value: 'single', label: 'Single', description: 'One-time task with deadline' },
  ];

  /**
   * Days of the week configuration
   */
  readonly daysOfWeek: DayOption[] = [
    { value: 1, label: 'Monday', shortLabel: 'Mon' },
    { value: 2, label: 'Tuesday', shortLabel: 'Tue' },
    { value: 3, label: 'Wednesday', shortLabel: 'Wed' },
    { value: 4, label: 'Thursday', shortLabel: 'Thu' },
    { value: 5, label: 'Friday', shortLabel: 'Fri' },
    { value: 6, label: 'Saturday', shortLabel: 'Sat' },
    { value: 0, label: 'Sunday', shortLabel: 'Sun' },
  ];

  /**
   * Rotation types for weekly rotation tasks
   */
  readonly rotationTypes: { value: 'alternating' | 'odd_even_week'; label: string }[] = [
    { value: 'alternating', label: 'Alternating (switch each week)' },
    { value: 'odd_even_week', label: 'Odd/Even Week (based on week number)' },
  ];

  /**
   * Main form group
   */
  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(255)]],
    description: [''],
    points: [5, [Validators.required, Validators.min(1), Validators.max(1000)]],
    ruleType: ['daily' as TaskType, [Validators.required]],
    deadline: [''],
    rotationType: ['alternating'],
  });

  /**
   * Selected days for repeating tasks
   */
  protected readonly selectedDays = signal<number[]>([]);

  /**
   * Selected children for assignment
   */
  protected readonly selectedChildren = signal<string[]>([]);

  /**
   * Selected candidates for single tasks
   */
  protected readonly selectedCandidates = signal<string[]>([]);

  /**
   * Submission loading state
   */
  protected readonly submitting = signal(false);

  /**
   * Error message
   */
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * Minimum deadline (current datetime)
   */
  protected readonly minDeadline = computed(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  /**
   * Current rule type
   */
  protected readonly currentRuleType = computed(() => {
    return this.form.get('ruleType')?.value as TaskType;
  });

  /**
   * Validation for the current form state.
   * Note: This method directly checks form state rather than using computed signals
   * because reactive form values are not signal-reactive.
   */
  protected isFormValid(): boolean {
    if (this.form.invalid) return false;

    const ruleType = this.form.get('ruleType')?.value as TaskType;

    // Repeating tasks require at least one day selected
    if (ruleType === 'repeating' && this.selectedDays().length === 0) {
      return false;
    }

    // Weekly rotation requires at least 2 children selected
    if (ruleType === 'weekly_rotation' && this.selectedChildren().length < 2) {
      return false;
    }

    // Single tasks require at least one candidate
    if (ruleType === 'single' && this.selectedCandidates().length === 0) {
      return false;
    }

    return true;
  }

  ngOnInit(): void {
    // Watch ruleType changes to clear selections
    this.form.get('ruleType')?.valueChanges.subscribe(() => {
      this.selectedDays.set([]);
      this.selectedChildren.set([]);
      this.selectedCandidates.set([]);
      this.errorMessage.set(null);
    });
  }

  /**
   * Toggle day selection for repeating tasks
   */
  toggleDay(day: number): void {
    const days = this.selectedDays();
    if (days.includes(day)) {
      this.selectedDays.set(days.filter((d) => d !== day));
    } else {
      this.selectedDays.set([...days, day].sort());
    }
  }

  /**
   * Check if a day is selected
   */
  isDaySelected(day: number): boolean {
    return this.selectedDays().includes(day);
  }

  /**
   * Toggle child selection for rotation tasks
   */
  toggleChild(childId: string): void {
    const children = this.selectedChildren();
    if (children.includes(childId)) {
      this.selectedChildren.set(children.filter((id) => id !== childId));
    } else {
      this.selectedChildren.set([...children, childId]);
    }
  }

  /**
   * Check if a child is selected for rotation
   */
  isChildSelected(childId: string): boolean {
    return this.selectedChildren().includes(childId);
  }

  /**
   * Toggle candidate selection for single tasks
   */
  toggleCandidate(childId: string): void {
    const candidates = this.selectedCandidates();
    if (candidates.includes(childId)) {
      this.selectedCandidates.set(candidates.filter((id) => id !== childId));
    } else {
      this.selectedCandidates.set([...candidates, childId]);
    }
  }

  /**
   * Check if a child is selected as candidate
   */
  isCandidateSelected(childId: string): boolean {
    return this.selectedCandidates().includes(childId);
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (!this.isFormValid() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const formValue = this.form.value;
    const ruleType = formValue.ruleType as TaskType;

    const taskData: CreateTaskRequest = {
      name: formValue.name!.trim(),
      description: formValue.description || undefined,
      points: formValue.points!,
      ruleType,
      ruleConfig: this.buildRuleConfig(ruleType),
    };

    // Add deadline for single tasks
    if (ruleType === 'single' && formValue.deadline) {
      // The deadline will be handled via ruleConfig or separate field
      // For now, we'll store it in ruleConfig
      (taskData.ruleConfig as { deadline?: string }).deadline = new Date(
        formValue.deadline,
      ).toISOString();
    }

    this.taskService.createTask(this.householdId(), taskData).subscribe({
      next: () => {
        this.submitting.set(false);
        this.resetForm();
        this.taskCreated.emit();
        this.closeRequested.emit();
      },
      error: (error) => {
        this.submitting.set(false);
        this.errorMessage.set('Failed to create task. Please try again.');
        console.error('Failed to create task:', error);
      },
    });
  }

  /**
   * Build rule config based on task type
   */
  private buildRuleConfig(ruleType: TaskType): CreateTaskRequest['ruleConfig'] {
    switch (ruleType) {
      case 'daily':
        return {
          assignedChildren: [],
        };

      case 'repeating':
        return {
          repeatDays: this.selectedDays(),
          assignedChildren: [],
        };

      case 'weekly_rotation':
        return {
          rotationType:
            (this.form.get('rotationType')?.value as 'alternating' | 'odd_even_week') ||
            'alternating',
          assignedChildren: this.selectedChildren(),
        };

      case 'single':
        return {
          assignedChildren: this.selectedCandidates(),
        };

      default:
        return null;
    }
  }

  /**
   * Reset the form to initial state
   */
  private resetForm(): void {
    this.form.reset({
      name: '',
      description: '',
      points: 5,
      ruleType: 'daily',
      deadline: '',
      rotationType: 'alternating',
    });
    this.selectedDays.set([]);
    this.selectedChildren.set([]);
    this.selectedCandidates.set([]);
    this.errorMessage.set(null);
  }

  /**
   * Handle modal close
   */
  onClose(): void {
    this.resetForm();
    this.closeRequested.emit();
  }

  /**
   * Handle cancel button click
   */
  onCancel(): void {
    this.onClose();
  }
}
