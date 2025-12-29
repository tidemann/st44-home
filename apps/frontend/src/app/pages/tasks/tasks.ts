import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  effect,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import {
  EditTaskModal,
  type EditTaskData,
} from '../../components/modals/edit-task-modal/edit-task-modal';
import {
  QuickAddModal,
  type QuickAddTaskData,
} from '../../components/modals/quick-add-modal/quick-add-modal';
import { BottomNav } from '../../components/navigation/bottom-nav/bottom-nav';
import { SidebarNav } from '../../components/navigation/sidebar-nav/sidebar-nav';
import type { Task, Child } from '@st44/types';
import { ApiService } from '../../services/api.service';

/**
 * Filter types for task display
 */
export type TaskFilter = 'all' | 'mine' | 'person' | 'completed';

/**
 * Tasks Screen Component
 *
 * Comprehensive task management interface with filtering:
 * - All Tasks: Display all household tasks
 * - My Tasks: Filter by current user's assignments
 * - By Person: Filter by selected person
 * - Completed: Show only completed tasks
 *
 * Features:
 * - Filter tabs with localStorage persistence
 * - URL query params for shareability
 * - Task completion inline
 * - Task editing via EditTaskModal
 * - Responsive navigation (BottomNav/SidebarNav)
 */
@Component({
  selector: 'app-tasks',
  imports: [TaskCardComponent, EditTaskModal, QuickAddModal, BottomNav, SidebarNav],
  templateUrl: './tasks.html',
  styleUrl: './tasks.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tasks {
  private readonly taskService = inject(TaskService);
  private readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /**
   * Active filter selection
   */
  protected readonly activeFilter = signal<TaskFilter>('all');

  /**
   * Selected person ID (when filter = 'person')
   */
  protected readonly selectedPersonId = signal<string | null>(null);

  /**
   * All tasks from service
   */
  protected readonly tasks = this.taskService.tasks;

  /**
   * Task assignments from service
   */
  protected readonly assignments = this.taskService.assignments;

  /**
   * Loading state
   */
  protected readonly loading = signal<boolean>(false);

  /**
   * Error state
   */
  protected readonly error = signal<string | null>(null);

  /**
   * Household members for person filter
   */
  protected readonly members = signal<Child[]>([]);

  /**
   * Edit task modal state
   */
  protected readonly editModalOpen = signal(false);

  /**
   * Quick-add modal state
   */
  protected readonly quickAddOpen = signal(false);

  /**
   * Task being edited
   */
  protected readonly editingTask = signal<Task | null>(null);

  /**
   * Current user ID
   */
  protected readonly currentUserId = computed(() => this.authService.currentUser()?.id);

  /**
   * User info for sidebar (computed from auth service)
   */
  protected readonly sidebarUser = computed(() => {
    const user = this.authService.currentUser();
    return {
      name: user?.email?.split('@')[0] || 'User',
      avatar: '👤',
      household: localStorage.getItem('activeHouseholdName') || 'My Household',
    };
  });

  /**
   * Active household ID from localStorage
   */
  protected readonly householdId = computed(() => {
    return localStorage.getItem('activeHouseholdId') || '';
  });

  /**
   * Filter tabs configuration
   */
  protected readonly filterTabs: { id: TaskFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'mine', label: 'My Tasks' },
    { id: 'person', label: 'By Person' },
    { id: 'completed', label: 'Completed' },
  ];

  /**
   * Filtered tasks based on active filter
   */
  protected readonly filteredTasks = computed(() => {
    const filter = this.activeFilter();
    const allTasks = this.tasks();
    const allAssignments = this.assignments();
    const userId = this.currentUserId();
    const personId = this.selectedPersonId();

    switch (filter) {
      case 'all':
        // Return all active task templates
        return allTasks.filter((t) => t.active);

      case 'mine':
        // Return assignments for current user that are pending
        if (!userId) return [];
        return allAssignments.filter((a) => a.childId === userId && a.status === 'pending');

      case 'person':
        // Return assignments for selected person
        if (!personId) return [];
        return allAssignments.filter((a) => a.childId === personId);

      case 'completed':
        // Return completed assignments
        return allAssignments.filter((a) => a.status === 'completed');

      default:
        return allTasks.filter((t) => t.active);
    }
  });

  /**
   * Empty state message based on active filter
   */
  protected readonly emptyMessage = computed(() => {
    const filter = this.activeFilter();
    switch (filter) {
      case 'all':
        return 'No tasks found. Create your first task to get started!';
      case 'mine':
        return 'No tasks assigned to you right now. Great job staying on top of things!';
      case 'person':
        return this.selectedPersonId()
          ? 'No tasks assigned to this person.'
          : 'Select a person to view their tasks.';
      case 'completed':
        return 'No completed tasks yet. Complete some tasks to see them here!';
      default:
        return 'No tasks found.';
    }
  });

  constructor() {
    // Load filter from URL query params or localStorage on init
    effect(
      () => {
        const queryFilter = this.route.snapshot.queryParams['filter'] as TaskFilter | undefined;
        const savedFilter = localStorage.getItem('tasksFilter') as TaskFilter | undefined;
        const initialFilter = queryFilter || savedFilter || 'all';

        if (initialFilter && ['all', 'mine', 'person', 'completed'].includes(initialFilter)) {
          this.activeFilter.set(initialFilter);
        }

        // Load initial data
        this.loadTasks();
      },
      { allowSignalWrites: true },
    );

    // Persist filter changes to localStorage and URL
    effect(() => {
      const filter = this.activeFilter();
      localStorage.setItem('tasksFilter', filter);

      // Update URL query params
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { filter },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  /**
   * Load tasks based on active filter
   */
  protected loadTasks(): void {
    const filter = this.activeFilter();
    const household = this.householdId();

    if (!household) {
      this.error.set('No household selected');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Load task templates
    this.taskService.getTasks(household, true).subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load tasks');
        this.loading.set(false);
        console.error('Load tasks error:', err);
      },
    });

    // Load assignments if needed
    if (filter === 'mine' || filter === 'person' || filter === 'completed') {
      const userId = this.currentUserId();
      const personId = this.selectedPersonId();

      const assignmentFilters: {
        status?: 'pending' | 'completed';
        childId?: string;
      } = {};

      if (filter === 'mine' && userId) {
        assignmentFilters.childId = userId;
        assignmentFilters.status = 'pending';
      } else if (filter === 'person' && personId) {
        assignmentFilters.childId = personId;
      } else if (filter === 'completed') {
        assignmentFilters.status = 'completed';
      }

      this.taskService.getHouseholdAssignments(household, assignmentFilters).subscribe({
        next: () => {
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load assignments');
          this.loading.set(false);
          console.error('Load assignments error:', err);
        },
      });
    }

    // Load household members for person filter dropdown
    if (filter === 'person') {
      this.loadMembers();
    }
  }

  /**
   * Load household members
   */
  private loadMembers(): void {
    const household = this.householdId();
    if (!household) return;

    this.apiService
      .get<{ children: Child[] }>(`/households/${household}/children`)
      .then((response) => {
        this.members.set(response.children);
      })
      .catch((err) => {
        console.error('Load members error:', err);
      });
  }

  /**
   * Handle filter tab click
   */
  protected onFilterClick(filter: TaskFilter): void {
    if (this.activeFilter() === filter) return;

    this.activeFilter.set(filter);
    this.loadTasks();
  }

  /**
   * Handle person selection change
   */
  protected onPersonChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedPersonId.set(select.value || null);
    this.loadTasks();
  }

  /**
   * Handle task completion
   */
  protected onTaskComplete(taskId: string): void {
    this.taskService.completeTask(taskId).subscribe({
      next: () => {
        // Reload tasks to reflect completion
        this.loadTasks();
      },
      error: (err) => {
        this.error.set('Failed to complete task');
        console.error('Complete task error:', err);
      },
    });
  }

  /**
   * Handle task edit click
   */
  protected onTaskEdit(taskId: string): void {
    const task = this.tasks().find((t) => t.id === taskId);
    if (task) {
      this.editingTask.set(task);
      this.editModalOpen.set(true);
    }
  }

  /**
   * Handle task update from modal
   */
  protected onTaskUpdate(data: EditTaskData): void {
    const task = this.editingTask();
    const household = this.householdId();

    if (!task || !household) return;

    this.taskService.updateTask(household, task.id, data).subscribe({
      next: () => {
        this.editModalOpen.set(false);
        this.editingTask.set(null);
        this.loadTasks();
      },
      error: (err) => {
        this.error.set('Failed to update task');
        console.error('Update task error:', err);
      },
    });
  }

  /**
   * Handle task delete from modal
   */
  protected onTaskDelete(): void {
    const task = this.editingTask();
    const household = this.householdId();

    if (!task || !household) return;

    this.taskService.deleteTask(household, task.id).subscribe({
      next: () => {
        this.editModalOpen.set(false);
        this.editingTask.set(null);
        this.loadTasks();
      },
      error: (err) => {
        this.error.set('Failed to delete task');
        console.error('Delete task error:', err);
      },
    });
  }

  /**
   * Handle modal close
   */
  protected onModalClose(): void {
    this.editModalOpen.set(false);
    this.editingTask.set(null);
  }

  /**
   * Handle navigation
   */
  protected onNavigate(screen: 'home' | 'tasks' | 'family' | 'progress'): void {
    const routes: Record<string, string> = {
      home: '/home',
      tasks: '/household/all-tasks',
      family: '/family',
      progress: '/progress',
    };

    const route = routes[screen];
    if (route) {
      this.router.navigate([route]);
    }
  }

  /**
   * Check if filter is active
   */
  protected isFilterActive(filter: TaskFilter): boolean {
    return this.activeFilter() === filter;
  }

  /**
   * Open quick-add modal
   */
  protected openQuickAdd(): void {
    // Load members if not already loaded
    if (this.members().length === 0) {
      this.loadMembers();
    }
    this.quickAddOpen.set(true);
  }

  /**
   * Close quick-add modal
   */
  protected closeQuickAdd(): void {
    this.quickAddOpen.set(false);
  }

  /**
   * Handle quick-add task creation
   */
  protected onTaskCreated(data: QuickAddTaskData): void {
    const household = this.householdId();
    if (!household) return;

    this.taskService
      .createTask(household, {
        name: data.name,
        points: data.points,
        ruleType: 'daily', // Default to daily for quick-add
      })
      .subscribe({
        next: () => {
          this.quickAddOpen.set(false);
          // Reload tasks to show new task
          this.loadTasks();
        },
        error: (err) => {
          this.error.set('Failed to create task. Please try again.');
          console.error('Create task error:', err);
        },
      });
  }
}
