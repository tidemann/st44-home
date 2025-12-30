import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  AbstractControl,
} from '@angular/forms';
import type { Task } from '@st44/types';
import { TaskService } from '../../services/task.service';
import type { Child } from '@st44/types';
import { ChildrenService } from '../../services/children.service';
import { HouseholdService } from '../../services/household.service';

@Component({
  selector: 'app-task-edit',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-edit.html',
  styleUrl: './task-edit.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskEditComponent {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private childrenService = inject(ChildrenService);
  private householdService = inject(HouseholdService);

  // Inputs/Outputs
  readonly task = input.required<Task>();
  readonly closed = output<void>();

  // Signals (public for testing)
  hasChanges = signal<boolean>(false);
  showUnsavedWarning = signal<boolean>(false);
  children = signal<Child[]>([]);

  // Form group
  taskForm!: FormGroup;

  // Days of week for repeating tasks
  protected readonly daysOfWeek = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];

  constructor() {
    // Initialize form
    this.taskForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: [''],
      ruleType: ['daily', Validators.required],
      rotationType: [''],
      repeatDays: this.fb.array([]),
      assignedChildren: this.fb.array([]),
      active: [true],
    });

    // Watch for changes
    this.taskForm.valueChanges.subscribe(() => {
      this.hasChanges.set(true);
    });

    // Update validators when rule type changes
    this.taskForm.get('ruleType')?.valueChanges.subscribe((ruleType) => {
      this.updateValidators(ruleType);
    });

    // Pre-fill form when task input changes
    effect(() => {
      const task = this.task();
      this.prefillForm(task);
    });

    // Load children for current household
    this.loadChildren();
  }

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

  private prefillForm(task: Task): void {
    // Clear arrays
    (this.taskForm.get('repeatDays') as FormArray).clear();
    (this.taskForm.get('assignedChildren') as FormArray).clear();

    // Get rule config
    const ruleConfig = task.ruleConfig || {};
    const repeatDays = ruleConfig.repeatDays || [];
    const assignedChildren = ruleConfig.assignedChildren || [];
    const rotationType = ruleConfig.rotationType || '';

    // Populate repeatDays FormArray
    const repeatDaysArray = this.taskForm.get('repeatDays') as FormArray;
    repeatDays.forEach((day: number) => repeatDaysArray.push(this.fb.control(day)));

    // Populate assignedChildren FormArray
    const assignedChildrenArray = this.taskForm.get('assignedChildren') as FormArray;
    assignedChildren.forEach((childId: string) =>
      assignedChildrenArray.push(this.fb.control(childId)),
    );

    // Set form values
    this.taskForm.patchValue(
      {
        name: task.name,
        description: task.description || '',
        ruleType: task.ruleType,
        rotationType: rotationType,
        active: task.active,
      },
      { emitEvent: false },
    );

    // Update validators for current rule type
    this.updateValidators(task.ruleType);

    // Reset change tracking
    this.hasChanges.set(false);
  }

  private updateValidators(ruleType: string): void {
    const rotationType = this.taskForm.get('rotationType');
    const repeatDays = this.taskForm.get('repeatDays');
    const assignedChildren = this.taskForm.get('assignedChildren');

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

  private minArrayLengthValidator(minLength: number) {
    return (control: AbstractControl) => {
      const arr = control.value as FormArray | unknown[];
      const length = Array.isArray(arr) ? arr.length : 0;
      return length >= minLength ? null : { minLength: { required: minLength, actual: length } };
    };
  }

  onDayChange(dayValue: number, checked: boolean): void {
    const repeatDays = this.taskForm.get('repeatDays') as FormArray;

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

  onChildChange(childId: string, checked: boolean): void {
    const assignedChildren = this.taskForm.get('assignedChildren') as FormArray;

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

  isDaySelected(dayValue: number): boolean {
    const repeatDays = this.taskForm.get('repeatDays') as FormArray;
    return repeatDays.controls.some((ctrl) => ctrl.value === dayValue);
  }

  isChildSelected(childId: string): boolean {
    const assignedChildren = this.taskForm.get('assignedChildren') as FormArray;
    return assignedChildren.controls.some((ctrl) => ctrl.value === childId);
  }

  onSave(): void {
    if (this.taskForm.invalid) return;

    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) return;

    const taskId = this.task().id;

    // Build request payload matching UpdateTaskRequest interface
    const updateData = {
      name: this.taskForm.get('name')?.value,
      description: this.taskForm.get('description')?.value || undefined,
      ruleType: this.taskForm.get('ruleType')?.value,
      ruleConfig: {
        rotationType: this.taskForm.get('rotationType')?.value || undefined,
        repeatDays: (this.taskForm.get('repeatDays') as FormArray).value,
        assignedChildren: (this.taskForm.get('assignedChildren') as FormArray).value,
      },
      active: this.taskForm.get('active')?.value,
    };

    this.taskService.updateTask(householdId, taskId, updateData).subscribe({
      next: () => {
        this.hasChanges.set(false);
        this.closed.emit();
      },
      error: () => {
        // Error handled in service
      },
    });
  }

  onCancel(): void {
    if (this.hasChanges()) {
      this.showUnsavedWarning.set(true);
    } else {
      this.closed.emit();
    }
  }

  confirmClose(): void {
    this.showUnsavedWarning.set(false);
    this.closed.emit();
  }

  cancelClose(): void {
    this.showUnsavedWarning.set(false);
  }

  onBackdropClick(): void {
    this.onCancel();
  }

  onEscapeKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
    }
  }

  protected get nameChars(): number {
    return this.taskForm.get('name')?.value?.length || 0;
  }

  protected get ruleType(): string {
    return this.taskForm.get('ruleType')?.value;
  }

  protected get taskServiceLoading(): boolean {
    return this.taskService.loading();
  }

  protected get taskServiceError(): string | null {
    return this.taskService.error();
  }
}
