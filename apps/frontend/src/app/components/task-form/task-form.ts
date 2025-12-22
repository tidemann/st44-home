import {
  Component,
  OnInit,
  signal,
  inject,
  input,
  output,
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

  form!: FormGroup;
  isSubmitting = signal(false);
  errorMessage = signal('');
  selectedDays = signal<number[]>([]);

  ngOnInit() {
    this.initForm();
    if (this.task()) {
      this.populateForm(this.task()!);
    }
  }

  private initForm() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      points: [0, [Validators.required, Validators.min(0)]],
      rule_type: ['daily', Validators.required],
    });

    // Watch rule_type changes to clear day selection
    this.form.get('rule_type')?.valueChanges.subscribe(() => {
      this.selectedDays.set([]);
    });
  }

  private populateForm(task: Task) {
    this.form.patchValue({
      name: task.name,
      description: task.description,
      points: task.points,
      rule_type: task.rule_type,
    });

    // Populate days if repeating
    if (task.rule_type === 'repeating' && task.rule_config) {
      const config = task.rule_config as { days?: number[] };
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

    const ruleType = this.form.value.rule_type;
    if (ruleType === 'repeating' && this.selectedDays().length === 0) {
      this.errorMessage.set('Please select at least one day');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const formData = {
      ...this.form.value,
      household_id: this.householdId(),
      active: true,
      rule_config: this.getRuleConfig(),
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
    const ruleType = this.form.value.rule_type;
    if (ruleType === 'repeating') {
      return {
        repeat_days: this.selectedDays(),
        assigned_children: [], // TODO: Implement proper child selection
      };
    }
    if (ruleType === 'weekly_rotation') {
      return {
        rotation_type: 'alternating',
        assigned_children: [], // TODO: Implement proper child selection
      };
    }
    return null;
  }

  onCancel() {
    this.formClose.emit();
  }
}
