import {
  Component,
  input,
  output,
  signal,
  inject,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormArray,
  AbstractControl,
} from '@angular/forms';
import { Modal } from '../modal/modal';
import type { Task, TaskRuleType, TaskRuleConfig, Child } from '@st44/types';
import { ChildrenService } from '../../../services/children.service';
import { HouseholdService } from '../../../services/household.service';

/**
 * Data structure for edit task submission
 */
export interface EditTaskData {
  name: string;
  points: number;
  ruleType: TaskRuleType;
  ruleConfig?: TaskRuleConfig;
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
   * Children service
   */
  private readonly childrenService = inject(ChildrenService);

  /**
   * Household service
   */
  private readonly householdService = inject(HouseholdService);

  /**
   * Available children for assignment
   */
  protected readonly children = signal<Child[]>([]);

  /**
   * Days of week for repeating tasks
   */
  protected readonly daysOfWeek = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];

  /**
   * Form group for edit task
   */
  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(255)]],
    points: [5, [Validators.required, Validators.min(1), Validators.max(1000)]],
    ruleType: ['daily' as TaskRuleType, [Validators.required]],
    rotationType: ['alternating' as 'odd_even_week' | 'alternating'],
    repeatDays: this.fb.array<number>([]),
    assignedChildren: this.fb.array<string>([]),
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

  /**
   * Rotation type options
   */
  protected readonly rotationOptions: { value: 'odd_even_week' | 'alternating'; label: string }[] =
    [
      { value: 'alternating', label: 'Alternating' },
      { value: 'odd_even_week', label: 'Odd/Even Week' },
    ];

  constructor() {
    // Update form when task changes
    effect(() => {
      const currentTask = this.task();
      if (currentTask) {
        this.prefillForm(currentTask);
        this.showDeleteConfirm.set(false);
      }
    });

    // Update validators when rule type changes
    this.form.get('ruleType')?.valueChanges.subscribe((ruleType) => {
      this.updateValidators(ruleType);
    });

    // Load children on init
    this.loadChildren();
  }

  /**
   * Load children from current household
   */
  private async loadChildren(): Promise<void> {
    const householdId = this.householdService.getActiveHouseholdId();
    if (householdId) {
      try {
        const childrenList = await this.childrenService.listChildren(householdId);
        this.children.set(childrenList);
      } catch (error) {
        console.error('Failed to load children:', error);
      }
    }
  }

  /**
   * Prefill form with task data
   */
  private prefillForm(task: Task): void {
    // Clear arrays
    (this.form.get('repeatDays') as FormArray).clear();
    (this.form.get('assignedChildren') as FormArray).clear();

    // Get rule config
    const ruleConfig = task.ruleConfig || {};
    const repeatDays = ruleConfig.repeatDays || [];
    const assignedChildren = ruleConfig.assignedChildren || [];
    const rotationType = ruleConfig.rotationType || 'alternating';

    // Populate repeatDays FormArray
    const repeatDaysArray = this.form.get('repeatDays') as FormArray;
    repeatDays.forEach((day: number) => repeatDaysArray.push(this.fb.control(day)));

    // Populate assignedChildren FormArray
    const assignedChildrenArray = this.form.get('assignedChildren') as FormArray;
    assignedChildren.forEach((childId: string) =>
      assignedChildrenArray.push(this.fb.control(childId)),
    );

    // Set form values
    this.form.patchValue({
      name: task.name,
      points: task.points,
      ruleType: task.ruleType,
      rotationType: rotationType,
    });

    // Update validators for current rule type
    this.updateValidators(task.ruleType);
  }

  /**
   * Update validators based on rule type
   */
  private updateValidators(ruleType: TaskRuleType | null): void {
    const rotationType = this.form.get('rotationType');
    const repeatDays = this.form.get('repeatDays');
    const assignedChildren = this.form.get('assignedChildren');

    // Clear all conditional validators
    rotationType?.clearValidators();
    repeatDays?.clearValidators();
    assignedChildren?.clearValidators();

    // Apply validators based on rule type
    if (ruleType === 'weekly_rotation') {
      rotationType?.setValidators(Validators.required);
      assignedChildren?.setValidators([Validators.required, this.minArrayLengthValidator(2)]);
    } else if (ruleType === 'repeating') {
      repeatDays?.setValidators([Validators.required, this.minArrayLengthValidator(1)]);
      assignedChildren?.setValidators([Validators.required, this.minArrayLengthValidator(1)]);
    }

    // Update validity
    rotationType?.updateValueAndValidity();
    repeatDays?.updateValueAndValidity();
    assignedChildren?.updateValueAndValidity();
  }

  /**
   * Validator for minimum array length
   */
  private minArrayLengthValidator(minLength: number) {
    return (control: AbstractControl) => {
      const arr = control.value as FormArray | unknown[];
      const length = Array.isArray(arr) ? arr.length : 0;
      return length >= minLength ? null : { minLength: { required: minLength, actual: length } };
    };
  }

  /**
   * Handle day selection change
   */
  onDayChange(dayValue: number, checked: boolean): void {
    const repeatDays = this.form.get('repeatDays') as FormArray;

    if (checked) {
      repeatDays.push(this.fb.control(dayValue));
    } else {
      const index = repeatDays.controls.findIndex((ctrl) => ctrl.value === dayValue);
      if (index >= 0) {
        repeatDays.removeAt(index);
      }
    }

    repeatDays.updateValueAndValidity();
  }

  /**
   * Handle child selection change
   */
  onChildChange(childId: string, checked: boolean): void {
    const assignedChildren = this.form.get('assignedChildren') as FormArray;

    if (checked) {
      assignedChildren.push(this.fb.control(childId));
    } else {
      const index = assignedChildren.controls.findIndex((ctrl) => ctrl.value === childId);
      if (index >= 0) {
        assignedChildren.removeAt(index);
      }
    }

    assignedChildren.updateValueAndValidity();
  }

  /**
   * Check if day is selected
   */
  isDaySelected(dayValue: number): boolean {
    const repeatDays = this.form.get('repeatDays') as FormArray;
    return repeatDays.controls.some((ctrl) => ctrl.value === dayValue);
  }

  /**
   * Check if child is selected
   */
  isChildSelected(childId: string): boolean {
    const assignedChildren = this.form.get('assignedChildren') as FormArray;
    return assignedChildren.controls.some((ctrl) => ctrl.value === childId);
  }

  /**
   * Get current rule type
   */
  protected get ruleType(): TaskRuleType | null {
    return this.form.get('ruleType')?.value || null;
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const formValue = this.form.value;
    const ruleType = formValue.ruleType!;

    // Build rule config based on rule type
    const ruleConfig = this.buildRuleConfig(ruleType);

    // Emit updated task data
    this.taskUpdated.emit({
      name: formValue.name!.trim(),
      points: formValue.points!,
      ruleType,
      ruleConfig,
    });
  }

  /**
   * Build rule config based on current form state
   */
  private buildRuleConfig(ruleType: TaskRuleType): TaskRuleConfig {
    if (ruleType === 'repeating') {
      return {
        repeatDays: (this.form.get('repeatDays') as FormArray).value as number[],
        assignedChildren: (this.form.get('assignedChildren') as FormArray).value as string[],
      };
    }

    if (ruleType === 'weekly_rotation') {
      return {
        rotationType: this.form.get('rotationType')?.value as 'odd_even_week' | 'alternating',
        assignedChildren: (this.form.get('assignedChildren') as FormArray).value as string[],
      };
    }

    return null;
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
