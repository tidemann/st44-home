import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TaskService, type MyTaskAssignment } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { TaskCardComponent } from '../../components/task-card/task-card';
import {
  EditTaskModal,
  type EditTaskData,
} from '../../components/modals/edit-task-modal/edit-task-modal';
import { ReassignTaskModal } from '../../components/modals/reassign-task-modal/reassign-task-modal';
import type { Task, Child, Assignment } from '@st44/types';
import { ApiService } from '../../services/api.service';
import { StorageService } from '../../services/storage.service';
import { STORAGE_KEYS } from '../../services/storage-keys';

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
 *
 * Navigation is handled by the parent MainLayout component.
 */
@Component({
  selector: 'app-tasks',
  imports: [TaskCardComponent, EditTaskModal, ReassignTaskModal],
  templateUrl: './tasks.html',
  styleUrl: './tasks.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tasks implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

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
   * My tasks from service (for 'mine' filter)
   */
  protected readonly myTasks = this.taskService.myTasks;

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
   * Task being edited
   */
  protected readonly editingTask = signal<Task | null>(null);

  /**
   * Reassign task modal state
   */
  protected readonly reassignModalOpen = signal(false);

  /**
   * Assignment being reassigned
   */
  protected readonly reassigningAssignment = signal<Assignment | null>(null);

  /**
   * Current user ID
   */
  protected readonly currentUserId = computed(() => this.authService.currentUser()?.id);

  /**
   * Active household ID from localStorage
   */
  protected readonly householdId = computed(() => {
    return this.storage.getString(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID) || '';
  });

  /**
   * Check if current user is a parent
   */
  protected readonly isParent = computed(() => this.authService.hasRole('parent'));

  /**
   * Filter tabs configuration - excludes 'My Tasks' for parents
   */
  protected readonly filterTabs = computed(() => {
    const allTabs: { id: TaskFilter; label: string }[] = [
      { id: 'all', label: 'All' },
      { id: 'mine', label: 'My Tasks' },
      { id: 'person', label: 'By Person' },
      { id: 'completed', label: 'Completed' },
    ];

    // Parents don't have tasks assigned to them, so hide "My Tasks"
    if (this.isParent()) {
      return allTabs.filter((tab) => tab.id !== 'mine');
    }

    return allTabs;
  });

  /**
   * Filtered tasks based on active filter
   * Returns Task[] for 'all', MyTaskAssignment[] for 'mine', Assignment[] for others
   */
  protected readonly filteredTasks = computed((): (Task | Assignment | MyTaskAssignment)[] => {
    const filter = this.activeFilter();
    const allTasks = this.tasks();
    const allAssignments = this.assignments();
    const myTasksList = this.myTasks();
    const personId = this.selectedPersonId();

    switch (filter) {
      case 'all':
        // Return all active task templates
        return allTasks.filter((t) => t.active);

      case 'mine':
        // Return my tasks from /children/me/tasks endpoint
        // Only show pending tasks for "My Tasks" filter
        return myTasksList.filter((t) => t.status === 'pending');

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

  ngOnInit(): void {
    // Load filter from URL query params or localStorage on init
    const queryFilter = this.route.snapshot.queryParams['filter'] as TaskFilter | undefined;
    const savedFilter = this.storage.getString(STORAGE_KEYS.TASKS_FILTER) as TaskFilter | undefined;
    const initialFilter = queryFilter || savedFilter || 'all';

    if (initialFilter && ['all', 'mine', 'person', 'completed'].includes(initialFilter)) {
      this.activeFilter.set(initialFilter);
    }

    // Load initial data
    this.loadTasks();
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

    // For 'mine' filter, use the /children/me/tasks endpoint
    if (filter === 'mine') {
      this.taskService.getMyTasks(household).subscribe({
        next: () => {
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load my tasks');
          this.loading.set(false);
          console.error('Load my tasks error:', err);
        },
      });
      return;
    }

    // Track pending requests to avoid race conditions
    let tasksCompleted = false;
    let assignmentsCompleted = filter === 'all'; // No assignments needed for 'all' filter

    const checkLoadingComplete = (): void => {
      if (tasksCompleted && assignmentsCompleted) {
        this.loading.set(false);
      }
    };

    // Load task templates
    this.taskService.getTasks(household, true).subscribe({
      next: () => {
        tasksCompleted = true;
        checkLoadingComplete();
      },
      error: (err) => {
        this.error.set('Failed to load tasks');
        tasksCompleted = true;
        checkLoadingComplete();
        console.error('Load tasks error:', err);
      },
    });

    // Load assignments if needed for person or completed filters
    if (filter === 'person' || filter === 'completed') {
      const personId = this.selectedPersonId();

      const assignmentFilters: {
        status?: 'pending' | 'completed';
        childId?: string;
      } = {};

      if (filter === 'person' && personId) {
        assignmentFilters.childId = personId;
      } else if (filter === 'completed') {
        assignmentFilters.status = 'completed';
      }

      this.taskService.getHouseholdAssignments(household, assignmentFilters).subscribe({
        next: () => {
          assignmentsCompleted = true;
          checkLoadingComplete();
        },
        error: (err) => {
          this.error.set('Failed to load assignments');
          assignmentsCompleted = true;
          checkLoadingComplete();
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
    if (this.activeFilter() === filter) {
      return;
    }

    // Update filter state
    this.activeFilter.set(filter);

    // Persist to localStorage
    this.storage.set(STORAGE_KEYS.TASKS_FILTER, filter);

    // Update URL query params
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filter },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    // Trigger change detection for OnPush
    this.cdr.markForCheck();

    // Load tasks for the new filter
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
   * Handle task reassign click
   */
  protected onTaskReassign(assignmentId: string): void {
    const assignment = this.assignments().find((a) => a.id === assignmentId);
    if (assignment) {
      // Load members if not already loaded
      if (this.members().length === 0) {
        this.loadMembers();
      }
      this.reassigningAssignment.set(assignment);
      this.reassignModalOpen.set(true);
    }
  }

  /**
   * Handle reassignment confirmation
   */
  protected onReassignConfirm(newChildId: string): void {
    const assignment = this.reassigningAssignment();
    if (!assignment) return;

    this.taskService.reassignTask(assignment.id, newChildId).subscribe({
      next: () => {
        this.reassignModalOpen.set(false);
        this.reassigningAssignment.set(null);
        this.loadTasks();
      },
      error: (err) => {
        this.error.set('Failed to reassign task');
        console.error('Reassign task error:', err);
      },
    });
  }

  /**
   * Handle reassign modal close
   */
  protected onReassignModalClose(): void {
    this.reassignModalOpen.set(false);
    this.reassigningAssignment.set(null);
  }
}
