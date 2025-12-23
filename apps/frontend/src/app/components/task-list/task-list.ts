import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Task, Child } from '@st44/types';
import { TaskService } from '../../services/task.service';
import { ChildrenService } from '../../services/children.service';
import { HouseholdService } from '../../services/household.service';

type SortOption = 'created' | 'title' | 'ruleType';

@Component({
  selector: 'app-task-list',
  imports: [CommonModule],
  templateUrl: './task-list.html',
  styleUrl: './task-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskList implements OnInit {
  protected taskService = inject(TaskService);
  private childrenService = inject(ChildrenService);
  private householdService = inject(HouseholdService);

  // Signals
  protected showActiveOnly = signal<boolean>(true);
  protected sortBy = signal<SortOption>('created');
  protected taskToDelete = signal<Task | null>(null);
  protected children = signal<Child[]>([]);

  // Computed: filtered and sorted tasks
  protected displayedTasks = computed(() => {
    let tasks = this.showActiveOnly() ? this.taskService.activeTasks() : this.taskService.tasks();

    // Sort
    const sort = this.sortBy();
    if (sort === 'title') {
      tasks = [...tasks].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'ruleType') {
      tasks = [...tasks].sort((a, b) => a.ruleType.localeCompare(b.ruleType));
    } else {
      // Default: created (newest first)
      tasks = [...tasks].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return tasks;
  });

  ngOnInit(): void {
    this.loadChildren();
    this.loadTasks();
  }

  private async loadChildren(): Promise<void> {
    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) return;

    try {
      const childrenList = await this.childrenService.listChildren(householdId);
      this.children.set(childrenList);
    } catch (error) {
      console.error('Failed to load children:', error);
    }
  }

  protected loadTasks(): void {
    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) return;

    this.taskService.getTasks(householdId, this.showActiveOnly()).subscribe();
  }

  protected onFilterChange(activeOnly: boolean): void {
    this.showActiveOnly.set(activeOnly);
    this.loadTasks();
  }

  protected onSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.sortBy.set(target.value as SortOption);
  }

  protected onEdit(task: Task): void {
    // TODO: Implement edit functionality
    console.log('Edit task:', task);
  }

  protected onDeleteClick(task: Task): void {
    this.taskToDelete.set(task);
  }

  protected confirmDelete(): void {
    const task = this.taskToDelete();
    if (!task) return;

    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) return;

    this.taskService.deleteTask(householdId, task.id).subscribe({
      next: () => {
        this.taskToDelete.set(null);
      },
      error: () => {
        this.taskToDelete.set(null);
      },
    });
  }

  protected cancelDelete(): void {
    this.taskToDelete.set(null);
  }

  protected onToggleActive(task: Task): void {
    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) return;

    // Update task with all current properties plus toggled active status
    this.taskService
      .updateTask(householdId, task.id, {
        name: task.name,
        description: task.description || undefined,
        points: task.points,
        ruleType: task.ruleType,
        ruleConfig: task.ruleConfig || undefined,
        active: !task.active,
      })
      .subscribe();
  }

  protected getChildrenNames(task: Task): string {
    const childIds = task.ruleConfig?.assignedChildren;
    if (!childIds || childIds.length === 0) return 'All children';

    const children = this.children();
    const names = childIds
      .map((id: string) => children.find((c) => c.id === id)?.name)
      .filter((name: string | undefined): name is string => !!name);

    return names.length > 0 ? names.join(', ') : 'Unknown';
  }

  protected getRuleTypeLabel(ruleType: string): string {
    const labels: Record<string, string> = {
      daily: 'Daily',
      repeating: 'Repeating',
      weekly_rotation: 'Weekly Rotation',
    };
    return labels[ruleType] || ruleType;
  }

  protected getRepeatDaysLabel(repeatDays: number[] | undefined): string {
    if (!repeatDays || repeatDays.length === 0) return '';

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return repeatDays.map((d) => dayNames[d] || '?').join(', ');
  }

  protected getRotationTypeLabel(rotationType: string | undefined): string {
    if (!rotationType) return '';

    const labels: Record<string, string> = {
      odd_even_week: 'Odd/Even Week',
      alternating: 'Alternating',
    };
    return labels[rotationType] || rotationType;
  }
}
