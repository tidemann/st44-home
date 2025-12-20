import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { format, parseISO } from 'date-fns';
import { TaskService, TaskAssignment } from '../../services/task.service';
import { ChildrenService, Child } from '../../services/children.service';
import { HouseholdService } from '../../services/household.service';
import { ReassignModalComponent } from '../../components/reassign-modal/reassign-modal.component';

/**
 * Parent-facing task dashboard for viewing and managing all household tasks
 *
 * Features:
 * - View all household task assignments
 * - Filter by child, status, and date
 * - Overview statistics (completion rate, overdue count)
 * - Reassign tasks to different children
 * - Desktop and mobile responsive
 */
@Component({
  selector: 'app-parent-task-dashboard',
  imports: [CommonModule, FormsModule, ReassignModalComponent],
  templateUrl: './parent-task-dashboard.component.html',
  styleUrl: './parent-task-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentTaskDashboardComponent implements OnInit {
  private taskService = inject(TaskService);
  private childrenService = inject(ChildrenService);
  private householdService = inject(HouseholdService);

  // State
  protected householdId = computed(() => this.householdService.activeHousehold$() ?? '');
  protected children = signal<Child[]>([]);

  protected selectedChild = signal<string>('');
  protected selectedStatus = signal<string>('');
  protected dateFilter = signal<'today' | 'week'>('today');

  protected loading = computed(() => this.taskService.assignmentsLoading());
  protected error = computed(() => this.taskService.assignmentsError());

  protected showReassignModal = signal(false);
  protected selectedAssignment = signal<TaskAssignment | null>(null);

  // Computed: All assignments with child names
  protected assignments = computed(() => {
    const assignments = this.taskService.assignments();
    const children = this.children();

    // Enhance assignments with child names
    return assignments.map((a) => {
      const child = children.find((c) => c.id === a.child_id);
      return {
        ...a,
        childName: child?.name ?? 'Unassigned',
      };
    });
  });

  // Computed: Filtered assignments
  protected filteredAssignments = computed(() => {
    let filtered = this.assignments();

    // Filter by child
    const selectedChild = this.selectedChild();
    if (selectedChild) {
      filtered = filtered.filter((a) => a.child_id === selectedChild);
    }

    // Filter by status
    const selectedStatus = this.selectedStatus();
    if (selectedStatus === 'overdue') {
      filtered = filtered.filter((a) => a.status === 'pending' && new Date(a.date) < new Date());
    } else if (selectedStatus) {
      filtered = filtered.filter((a) => a.status === selectedStatus);
    }

    return filtered;
  });

  // Computed: Statistics
  protected completionRate = computed(() => {
    const all = this.assignments();
    if (all.length === 0) return 0;
    const completed = all.filter((a) => a.status === 'completed').length;
    return Math.round((completed / all.length) * 100);
  });

  protected overdueCount = computed(
    () =>
      this.assignments().filter((a) => a.status === 'pending' && new Date(a.date) < new Date())
        .length,
  );

  ngOnInit(): void {
    this.loadChildren();
    this.loadAssignments();
  }

  /**
   * Load children for the household
   */
  private async loadChildren(): Promise<void> {
    const householdId = this.householdId();
    if (!householdId) return;

    try {
      const children = await this.childrenService.listChildren(householdId);
      this.children.set(children);
    } catch (err) {
      console.error('Failed to load children:', err);
    }
  }

  /**
   * Load household task assignments
   */
  protected loadAssignments(): void {
    const householdId = this.householdId();
    if (!householdId) return;

    const filters: {
      date?: string;
      child_id?: string;
      status?: 'pending' | 'completed';
    } = {};

    // Date filter
    if (this.dateFilter() === 'today') {
      filters.date = format(new Date(), 'yyyy-MM-dd');
    }
    // For 'week', pass no date filter (backend returns whole week)

    this.taskService.getHouseholdAssignments(householdId, filters).subscribe({
      error: (err) => {
        console.error('Failed to load assignments:', err);
      },
    });
  }

  /**
   * Change date filter and reload assignments
   */
  protected filterByDate(filter: 'today' | 'week'): void {
    this.dateFilter.set(filter);
    this.loadAssignments();
  }

  /**
   * Apply client-side filters (child, status)
   * No API call needed - computed signal handles filtering
   */
  protected onChildChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedChild.set(select.value);
  }

  protected onStatusChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedStatus.set(select.value);
  }

  /**
   * Open reassign modal
   */
  protected openReassignModal(assignment: TaskAssignment): void {
    this.selectedAssignment.set(assignment);
    this.showReassignModal.set(true);
  }

  /**
   * Close reassign modal
   */
  protected closeReassignModal(): void {
    this.showReassignModal.set(false);
    this.selectedAssignment.set(null);
  }

  /**
   * Handle task reassignment
   */
  protected onReassign(event: { assignmentId: string; childId: string }): void {
    this.taskService.reassignTask(event.assignmentId, event.childId).subscribe({
      next: () => {
        this.closeReassignModal();
        this.loadAssignments(); // Reload to show updated assignment
      },
      error: (err) => {
        console.error('Failed to reassign task:', err);
        // Error already in taskService signal
      },
    });
  }

  /**
   * Format date for display
   */
  protected formatDate(date: string): string {
    return format(parseISO(date), 'MMM d');
  }
}
