import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { TaskTemplate } from '../../services/task.service';
import { CommonModule } from '@angular/common';
import { TaskFormComponent } from '../../components/task-form/task-form';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, TaskFormComponent],
  templateUrl: './task-list.html',
  styleUrl: './task-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private taskService = inject(TaskService);

  householdId = signal<string>('');
  tasks = this.taskService.tasks;
  isLoading = signal(false);
  errorMessage = signal('');
  showTaskForm = signal(false);
  editingTask = signal<TaskTemplate | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('householdId');
    if (!id) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.householdId.set(id);
    this.loadTasks();
  }

  private loadTasks() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.taskService.getTasks(this.householdId(), true).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to load tasks');
        console.error('Failed to load tasks:', error);
      },
    });
  }

  openCreateForm() {
    this.editingTask.set(null);
    this.showTaskForm.set(true);
  }

  openEditForm(task: TaskTemplate) {
    this.editingTask.set(task);
    this.showTaskForm.set(true);
  }

  closeForm() {
    this.showTaskForm.set(false);
    this.editingTask.set(null);
    this.loadTasks(); // Reload to show changes
  }

  deleteTask(task: TaskTemplate) {
    if (!confirm(`Delete task "${task.name}"?`)) {
      return;
    }

    this.taskService.deleteTask(this.householdId(), task.id).subscribe({
      next: () => {
        this.loadTasks();
      },
      error: (error) => {
        this.errorMessage.set('Failed to delete task');
        console.error('Failed to delete task:', error);
      },
    });
  }
}
