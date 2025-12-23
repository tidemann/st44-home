import {
  Component,
  OnInit,
  signal,
  inject,
  input,
  output,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import type { Task } from '@st44/types';
import { TaskService } from '../../services/task.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-form.html',
  styleUrl: './task-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);

  householdId = input.required<string>();
  task = input<Task | null>(null);
  formClose = output<void>();

  form: FormGroup;
  isSubmitting = signal(false);
  errorMessage = signal('');
  selectedDays = signal<number[]>([]);

  // Computed signal for button text
  buttonText = computed(() => {
    if (this.isSubmitting()) {
      return 'Saving...';
    }
    return this.task() ? 'Save' : 'Create';
  });

  constructor() {
    // Initialize form in constructor to ensure it's always defined
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      points: [10, [Validators.required, Validators.min(0)]],
      ruleType: ['daily', Validators.required],
    });

    // Watch ruleType changes to clear day selection
    this.form.get('ruleType')?.valueChanges.subscribe(() => {
      this.selectedDays.set([]);
    });

    // Use effect to populate form when task input changes
    effect(() => {
      const currentTask = this.task();
      if (currentTask) {
        this.populateForm(currentTask);
      }
    });
  }

  ngOnInit() {
    // Form is already initialized in constructor
    // Just populate if task was already set
    if (this.task()) {
      this.populateForm(this.task()!);
    }
  }

  private populateForm(task: Task) {
    this.form.patchValue({
      name: task.name,
      description: task.description,
      points: task.points,
      ruleType: task.ruleType,
    });

    // Populate days if repeating
    if (task.ruleType === 'repeating' && task.ruleConfig?.repeatDays) {
      this.selectedDays.set(task.ruleConfig.repeatDays);
    }

    // Populate days if repeating (legacy support)
    if (task.ruleType === 'repeating' && task.ruleConfig && 'days' in task.ruleConfig) {
      const config = task.ruleConfig as unknown as { days?: number[] };
      if (config.days) {
        this.selectedDays.set(config.days);
      }
    }
  }

  toggleDay(day: number) {
    const days = this.selectedDays();
    if (days.includes(day)) {
      this.selectedDays.set(days.filter((d) => d !== day));
    } else {
      this.selectedDays.set([...days, day].sort());
    }
  }

  isDaySelected(day: number): boolean {
    return this.selectedDays().includes(day);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.errorMessage.set('Please fill all required fields');
      return;
    }

    const ruleType = this.form.value.ruleType;
    if (ruleType === 'repeating' && this.selectedDays().length === 0) {
      this.errorMessage.set('Please select at least one day');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const formData = {
      ...this.form.value,
      active: true,
      ruleConfig: this.getRuleConfig(),
    };

    const request$ = this.task()
      ? this.taskService.updateTask(this.householdId(), this.task()!.id, formData)
      : this.taskService.createTask(this.householdId(), formData);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.formClose.emit();
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Failed to save task');
        console.error('Failed to save task:', error);
      },
    });
  }

  private getRuleConfig() {
    const ruleType = this.form.value.ruleType;
    if (ruleType === 'repeating') {
      return {
        repeatDays: this.selectedDays(),
        assignedChildren: [], // TODO: Implement proper child selection
      };
    }
    if (ruleType === 'weekly_rotation') {
      return {
        rotationType: 'alternating',
        assignedChildren: [], // TODO: Implement proper child selection
      };
    }
    return null;
  }

  onCancel() {
    this.formClose.emit();
  }
}
