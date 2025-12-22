import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  AbstractControl,
} from '@angular/forms';
import { TaskService } from '../../services/task.service';
import type { Child } from '@st44/types';
import { ChildrenService } from '../../services/children.service';
import { HouseholdService } from '../../services/household.service';

@Component({
  selector: 'app-task-create',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-create.component.html',
  styleUrl: './task-create.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private childrenService = inject(ChildrenService);
  private householdService = inject(HouseholdService);

  // Signals
  successMessage = signal<string | null>(null);
  protected children = signal<Child[]>([]);

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

  ngOnInit(): void {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: [''],
      rule_type: ['daily', Validators.required],
      rotation_type: [''],
      repeat_days: this.fb.array([]),
      assigned_children: this.fb.array([]),
    });

    // Update validators when rule type changes
    this.taskForm.get('rule_type')?.valueChanges.subscribe((ruleType) => {
      this.updateValidators(ruleType);
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

  private updateValidators(ruleType: string): void {
    const rotationType = this.taskForm.get('rotation_type');
    const repeatDays = this.taskForm.get('repeat_days');
    const assignedChildren = this.taskForm.get('assigned_children');

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
    const repeatDays = this.taskForm.get('repeat_days') as FormArray;

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
    const assignedChildren = this.taskForm.get('assigned_children') as FormArray;

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
    const repeatDays = this.taskForm.get('repeat_days') as FormArray;
    return repeatDays.controls.some((ctrl) => ctrl.value === dayValue);
  }

  isChildSelected(childId: string): boolean {
    const assignedChildren = this.taskForm.get('assigned_children') as FormArray;
    return assignedChildren.controls.some((ctrl) => ctrl.value === childId);
  }

  onSubmit(): void {
    if (this.taskForm.invalid) return;

    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) {
      this.successMessage.set('No household selected. Please select a household first.');
      return;
    }

    const formData = {
      ...this.taskForm.value,
      repeat_days: (this.taskForm.get('repeat_days') as FormArray).value,
      assigned_children: (this.taskForm.get('assigned_children') as FormArray).value,
    };

    this.taskService.createTask(householdId, formData).subscribe({
      next: () => {
        this.successMessage.set('Task template created successfully!');
        this.resetForm();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: () => {
        // Error handled in service
      },
    });
  }

  onCancel(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.taskForm.reset({ rule_type: 'daily' });
    (this.taskForm.get('repeat_days') as FormArray).clear();
    (this.taskForm.get('assigned_children') as FormArray).clear();
  }

  protected get titleChars(): number {
    return this.taskForm.get('title')?.value?.length || 0;
  }

  protected get ruleType(): string {
    return this.taskForm.get('rule_type')?.value;
  }

  protected get taskServiceLoading(): boolean {
    return this.taskService.loading();
  }

  protected get taskServiceError(): string | null {
    return this.taskService.error();
  }
}
