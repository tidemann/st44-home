import {
  Component,
  OnInit,
  signal,
  inject,
  input,
  output,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import type { Task, Child } from '@st44/types';
import { TaskService } from '../../services/task.service';
import { ChildrenService } from '../../services/children.service';
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
  private childrenService = inject(ChildrenService);

  householdId = input.required<string>();
  task = input<Task | null>(null);
  formClose = output<void>();

  form: FormGroup;
  isSubmitting = signal(false);
  errorMessage = signal('');
  selectedDays = signal<number[]>([]);
  selectedCandidates = signal<string[]>([]);
  children = signal<Child[]>([]);
  formReady = signal(false);

  // Computed signal for button text
  buttonText = computed(() => {
    if (this.isSubmitting()) {
      return 'Saving...';
    }
    return this.task() ? 'Save' : 'Create';
  });

  // Minimum deadline is current datetime
  get minDeadline(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  constructor() {
    // Initialize form in constructor to ensure it's always defined
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      points: [10, [Validators.required, Validators.min(0)]],
      ruleType: ['daily', Validators.required],
      deadline: [''], // For single tasks
    });

    // Watch ruleType changes to clear day selection and candidates
    this.form.get('ruleType')?.valueChanges.subscribe(() => {
      this.selectedDays.set([]);
      this.selectedCandidates.set([]);
    });

    // Mark form as ready after initialization
    this.formReady.set(true);
  }

  async ngOnInit() {
    // Load children for candidate selection
    try {
      const childrenList = await this.childrenService.listChildren(this.householdId());
      this.children.set(childrenList);
    } catch (error) {
      console.error('Failed to load children:', error);
    }

    // Populate form if editing existing task
    const currentTask = this.task();
    if (currentTask) {
      this.populateForm(currentTask);
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

  toggleCandidate(childId: string) {
    const candidates = this.selectedCandidates();
    if (candidates.includes(childId)) {
      this.selectedCandidates.set(candidates.filter((id) => id !== childId));
    } else {
      this.selectedCandidates.set([...candidates, childId]);
    }
  }

  isCandidateSelected(childId: string): boolean {
    return this.selectedCandidates().includes(childId);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.errorMessage.set('Please fill all required fields');
      return;
    }

    const formValues = this.form.getRawValue();
    const ruleType = formValues.ruleType;

    if (ruleType === 'repeating' && this.selectedDays().length === 0) {
      this.errorMessage.set('Please select at least one day');
      return;
    }

    if (ruleType === 'single' && this.selectedCandidates().length === 0) {
      this.errorMessage.set('Please select at least one candidate');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const formData = {
      name: formValues.name || '',
      description: formValues.description || '',
      points: Number(formValues.points) || 0,
      ruleType: formValues.ruleType || 'daily',
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
        console.error('Error details:', JSON.stringify(error, null, 2));
      },
    });
  }

  private getRuleConfig() {
    const formValues = this.form.getRawValue();
    const ruleType = formValues.ruleType;

    if (ruleType === 'repeating') {
      return {
        repeatDays: this.selectedDays(),
        assignedChildren: [] as string[], // TODO: Implement proper child selection
      };
    }
    if (ruleType === 'weekly_rotation') {
      return {
        rotationType: 'alternating' as const,
        assignedChildren: [] as string[], // TODO: Implement proper child selection
      };
    }
    if (ruleType === 'single') {
      // For single tasks, candidates are tracked separately via task_candidates table
      // The assignedChildren here is used for initial candidate creation
      return {
        assignedChildren: this.selectedCandidates(),
      };
    }
    return null;
  }

  getDeadline(): string | null {
    const formValues = this.form.getRawValue();
    if (formValues.ruleType === 'single' && formValues.deadline) {
      // Convert date input value to ISO string
      return new Date(formValues.deadline).toISOString();
    }
    return null;
  }

  onCancel() {
    this.formClose.emit();
  }
}
