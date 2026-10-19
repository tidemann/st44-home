import {
  Component,
  input,
  output,
  signal,
  inject,
  effect,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormArray,
  AbstractControl,
} from '@angular/forms';
import { Modal } from '../modal/modal';
import { DidditMenu } from '../../../directives/diddit-menu.directive';
import { DidditDate } from '../../../directives/diddit-date.directive';
import type { Task, TaskRuleType, Child, CreateTaskRequest } from '@st44/types';

/**
 * Mode for the task form
 */
export type TaskFormMode = 'create' | 'edit';

/**
 * Day option configuration
 */
export interface DayOption {
  value: number;
  label: string;
  shortLabel: string;
}

/**
 * Data structure for task form submission
 */
export interface TaskFormData {
  name: string;
  description?: string;
  points: number;
  ruleType: TaskRuleType;
  ruleConfig: CreateTaskRequest['ruleConfig'];
}

/**
 * Unified Task Form Modal
 *
 * Single component for both creating and editing tasks.
 * Provides consistent UI/UX with:
 * - Same field layout and validation
 * - Title changes based on mode ("Create Task" vs "Edit Task")
 * - Submit button changes based on mode ("Create" vs "Save Changes")
 * - Pre-populated fields when editing
 * - Delete functionality only in edit mode
 *
 * Supports all 4 task types:
 * - Daily: Tasks assigned every day
 * - Repeating: Tasks on specific days of the week
 * - Weekly Rotation: Tasks that rotate between children
 * - Single: One-time tasks with optional deadline and candidates
 */
@Component({
  selector: 'app-task-form-modal',
  imports: [Modal, DidditMenu, DidditDate, ReactiveFormsModule],
  templateUrl: './task-form-modal.html',
  styleUrl: './task-form-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormModal {
  /**
   * Whether the modal is open
   */
  open = input<boolean>(false);

  /**
   * Mode: 'create' or 'edit'
   */
  mode = input<TaskFormMode>('create');

  /**
   * Task to edit (required in edit mode)
   */
  task = input<Task | null>(null);

  /**
   * Household ID (required for creating tasks)
   */
  householdId = input<string>('');

  /**
   * List of children for assignment options
   */
  children = input<Child[]>([]);

  /**
   * Event emitted when modal should close
   */
  closeRequested = output<void>();

  /**
   * Event emitted when form is submitted (create or edit)
   */
  formSubmitted = output<TaskFormData>();

  /**
   * Event emitted when task should be deleted (edit mode only)
   */
  taskDeleted = output<void>();

  /**
   * Form builder
   */
  private readonly fb = inject(FormBuilder);

  /**
   * DestroyRef for subscription cleanup
   */
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Task types configuration
   */
  readonly taskTypes: { value: TaskRuleType; label: string; description: string }[] = [
    {
      value: 'daily',
      label: $localize`:@@taskFormModal.typeDaily:Daglig`,
      description: $localize`:@@taskFormModal.typeDailyDescription:hver dag`,
    },
    {
      value: 'repeating',
      label: $localize`:@@taskFormModal.typeRepeating:Faste dager`,
      description: $localize`:@@taskFormModal.typeRepeatingDescription:på valgte ukedager`,
    },
    {
      value: 'weekly_rotation',
      label: $localize`:@@taskFormModal.typeRotation:Ukesrotasjon`,
      description: $localize`:@@taskFormModal.typeRotationDescription:barna bytter på`,
    },
    {
      value: 'single',
      label: $localize`:@@taskFormModal.typeSingle:Én gang`,
      description: $localize`:@@taskFormModal.typeSingleDescription:med frist`,
    },
  ];

  /**
   * Days of the week configuration
   */
  readonly daysOfWeek: DayOption[] = [
    {
      value: 1,
      label: $localize`:@@taskFormModal.monday:mandag`,
      shortLabel: $localize`:@@taskFormModal.mondayShort:Man`,
    },
    {
      value: 2,
      label: $localize`:@@taskFormModal.tuesday:tirsdag`,
      shortLabel: $localize`:@@taskFormModal.tuesdayShort:Tir`,
    },
    {
      value: 3,
      label: $localize`:@@taskFormModal.wednesday:onsdag`,
      shortLabel: $localize`:@@taskFormModal.wednesdayShort:Ons`,
    },
    {
      value: 4,
      label: $localize`:@@taskFormModal.thursday:torsdag`,
      shortLabel: $localize`:@@taskFormModal.thursdayShort:Tor`,
    },
    {
      value: 5,
      label: $localize`:@@taskFormModal.friday:fredag`,
      shortLabel: $localize`:@@taskFormModal.fridayShort:Fre`,
    },
    {
      value: 6,
      label: $localize`:@@taskFormModal.saturday:lørdag`,
      shortLabel: $localize`:@@taskFormModal.saturdayShort:Lør`,
    },
    {
      value: 0,
      label: $localize`:@@taskFormModal.sunday:søndag`,
      shortLabel: $localize`:@@taskFormModal.sundayShort:Søn`,
    },
  ];

  /**
   * Rotation types for weekly rotation tasks
   */
  readonly rotationTypes: { value: 'alternating' | 'odd_even_week'; label: string }[] = [
    {
      value: 'alternating',
      label: $localize`:@@taskFormModal.rotationAlternating:Bytter hver uke`,
    },
    {
      value: 'odd_even_week',
      label: $localize`:@@taskFormModal.rotationOddEven:Partalls- og oddetallsuker (etter ukenummer)`,
    },
  ];

  /**
   * Main form group
   */
  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(255)]],
    description: [''],
    points: [5, [Validators.required, Validators.min(1), Validators.max(1000)]],
    ruleType: ['daily' as TaskRuleType, [Validators.required]],
    deadline: [''],
    rotationType: ['alternating' as 'alternating' | 'odd_even_week'],
    repeatDays: this.fb.array<number>([]),
    assignedChildren: this.fb.array<string>([]),
  });

  /**
   * Submission loading state
   */
  protected readonly submitting = signal(false);

  /**
   * Error message
   */
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * The main action has been pressed on a form that is not complete (ST-1430 rule 4):
   * the unmet rules turn from hint to error, each under the field it concerns.
   */
  protected readonly submitAttempted = signal(false);

  /**
   * Delete confirmation state (edit mode only)
   */
  protected readonly showDeleteConfirm = signal(false);

  /**
   * «Avbryt» on the delete question. The modal only focuses its first element when it opens,
   * not when its content switches, so the safe answer is focused here when the question appears.
   */
  private readonly cancelDeleteButton = viewChild<ElementRef<HTMLButtonElement>>('cancelDelete');

  /**
   * Edit mode: every child the task was given to has been deleted (ST-914), so the
   * nightly job skips it. The parent must pick a new child or delete the task;
   * saving with no child would quietly turn it into a task for everyone.
   */
  protected readonly childrenGone = signal(false);

  /**
   * Modal title based on mode
   */
  protected readonly modalTitle = computed(() => {
    if (this.showDeleteConfirm()) {
      return $localize`:@@taskFormModal.deleteTitle:Slette oppgaven?`;
    }
    return this.mode() === 'create'
      ? $localize`:@@taskFormModal.createTitle:Ny oppgave`
      : $localize`:@@taskFormModal.editTitle:Rediger oppgave`;
  });

  /**
   * Submit button text based on mode
   */
  protected readonly submitButtonText = computed(() => {
    if (this.submitting()) {
      return $localize`:@@taskFormModal.saving:Lagrer …`;
    }
    return this.mode() === 'create'
      ? $localize`:@@taskFormModal.createButton:Legg til`
      : $localize`:@@taskFormModal.saveButton:Lagre`;
  });

  /**
   * Current rule type from form
   */
  protected readonly currentRuleType = computed(() => {
    return this.form.get('ruleType')?.value as TaskRuleType;
  });

  /**
   * Minimum deadline (current datetime) for single tasks
   */
  protected readonly minDeadline = computed(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  constructor() {
    effect(() => this.cancelDeleteButton()?.nativeElement.focus());

    // Watch ruleType changes to update validators and clear selections
    this.form
      .get('ruleType')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ruleType) => {
        this.updateValidators(ruleType);
        this.errorMessage.set(null);
      });

    // Pre-fill form when task changes (edit mode)
    effect(() => {
      const currentTask = this.task();
      const currentMode = this.mode();

      if (currentMode === 'edit' && currentTask) {
        this.prefillForm(currentTask);
        this.showDeleteConfirm.set(false);
      } else if (currentMode === 'create') {
        // Reset form for create mode
        this.resetForm();
      }
    });
  }

  /**
   * Pre-fill form with task data (edit mode)
   */
  private prefillForm(task: Task): void {
    // Clear arrays first
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

    // Populate assignedChildren FormArray. Deleted children stay in the stored
    // config; leave them out so they are neither counted nor saved again
    const childIds = new Set(this.children().map((child) => child.id));
    const remaining = assignedChildren.filter((childId: string) => childIds.has(childId));
    const assignedChildrenArray = this.form.get('assignedChildren') as FormArray;
    remaining.forEach((childId: string) => assignedChildrenArray.push(this.fb.control(childId)));
    this.childrenGone.set(
      task.ruleType !== 'single' && assignedChildren.length > 0 && remaining.length === 0,
    );

    // Set form values without emitting events
    this.form.patchValue(
      {
        name: task.name,
        description: task.description || '',
        points: task.points,
        ruleType: task.ruleType,
        rotationType: rotationType,
        deadline: '',
      },
      { emitEvent: false },
    );

    // Update validators for current rule type
    this.updateValidators(task.ruleType);
    this.errorMessage.set(null);
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
    } else if (ruleType === 'single') {
      assignedChildren?.setValidators([Validators.required, this.minArrayLengthValidator(1)]);
    }

    // Update validity
    rotationType?.updateValueAndValidity({ emitEvent: false });
    repeatDays?.updateValueAndValidity({ emitEvent: false });
    assignedChildren?.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Validator for minimum array length
   */
  private minArrayLengthValidator(minLength: number) {
    return (control: AbstractControl) => {
      const arr = control.value as unknown[];
      const length = Array.isArray(arr) ? arr.length : 0;
      return length >= minLength ? null : { minLength: { required: minLength, actual: length } };
    };
  }

  /**
   * Reset the form to initial state
   */
  private resetForm(): void {
    // Clear arrays first
    (this.form.get('repeatDays') as FormArray).clear();
    (this.form.get('assignedChildren') as FormArray).clear();

    this.form.reset(
      {
        name: '',
        description: '',
        points: 5,
        ruleType: 'daily',
        deadline: '',
        rotationType: 'alternating',
      },
      { emitEvent: false },
    );

    this.updateValidators('daily');
    this.errorMessage.set(null);
    this.showDeleteConfirm.set(false);
    this.childrenGone.set(false);
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
   * Check if a day is selected
   */
  isDaySelected(dayValue: number): boolean {
    const repeatDays = this.form.get('repeatDays') as FormArray;
    return repeatDays.controls.some((ctrl) => ctrl.value === dayValue);
  }

  /**
   * Check if a child is selected
   */
  isChildSelected(childId: string): boolean {
    const assignedChildren = this.form.get('assignedChildren') as FormArray;
    return assignedChildren.controls.some((ctrl) => ctrl.value === childId);
  }

  /**
   * Get current rule type (for template access)
   */
  protected get ruleType(): TaskRuleType | null {
    return this.form.get('ruleType')?.value || null;
  }

  /**
   * Get repeatDays form array
   */
  protected get repeatDaysArray(): FormArray {
    return this.form.get('repeatDays') as FormArray;
  }

  /**
   * Get assignedChildren form array
   */
  protected get assignedChildrenArray(): FormArray {
    return this.form.get('assignedChildren') as FormArray;
  }

  /**
   * Check if form is valid considering all validation rules
   */
  protected isFormValid(): boolean {
    if (this.form.invalid) return false;

    const ruleType = this.form.get('ruleType')?.value as TaskRuleType;
    const repeatDays = this.repeatDaysArray;
    const assignedChildren = this.assignedChildrenArray;

    // Repeating tasks require at least one day selected
    if (ruleType === 'repeating' && repeatDays.length === 0) {
      return false;
    }

    // Weekly rotation requires at least 2 children selected
    if (ruleType === 'weekly_rotation' && assignedChildren.length < 2) {
      return false;
    }

    // Single tasks require at least one candidate (child)
    if (ruleType === 'single' && assignedChildren.length === 0) {
      return false;
    }

    // Its children were deleted: a new child must be picked (or the task deleted)
    if (this.childrenGone() && assignedChildren.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.submitting()) {
      return;
    }

    // ST-1430 rule 4: the main action is never pale — the form is checked when you
    // press it, and every unmet rule shows under its own field.
    if (!this.isFormValid()) {
      this.submitAttempted.set(true);
      this.form.markAllAsTouched();
      return;
    }

    this.submitAttempted.set(false);
    this.submitting.set(true);
    this.errorMessage.set(null);

    const formValue = this.form.value;
    const ruleType = formValue.ruleType as TaskRuleType;

    const taskData: TaskFormData = {
      name: formValue.name!.trim(),
      description: formValue.description || undefined,
      points: formValue.points!,
      ruleType,
      ruleConfig: this.buildRuleConfig(ruleType),
    };

    // Add deadline for single tasks
    if (ruleType === 'single' && formValue.deadline) {
      (taskData.ruleConfig as { deadline?: string }).deadline = new Date(
        formValue.deadline,
      ).toISOString();
    }

    // Emit the form data - parent handles the API call
    this.formSubmitted.emit(taskData);

    // Reset submitting state (parent should close modal on success)
    this.submitting.set(false);
  }

  /**
   * Build rule config based on task type
   */
  private buildRuleConfig(ruleType: TaskRuleType): CreateTaskRequest['ruleConfig'] {
    const assignedChildren = this.assignedChildrenArray.value as string[];

    switch (ruleType) {
      case 'daily':
        return assignedChildren.length > 0 ? { assignedChildren } : { assignedChildren: [] };

      case 'repeating':
        return {
          repeatDays: this.repeatDaysArray.value as number[],
          assignedChildren,
        };

      case 'weekly_rotation':
        return {
          rotationType:
            (this.form.get('rotationType')?.value as 'alternating' | 'odd_even_week') ||
            'alternating',
          assignedChildren,
        };

      case 'single':
        return {
          assignedChildren,
        };

      default:
        return null;
    }
  }

  /**
   * Handle delete button click (edit mode only)
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

  /**
   * Set error message (can be called by parent on API error)
   */
  setError(message: string): void {
    this.errorMessage.set(message);
    this.submitting.set(false);
  }
}
