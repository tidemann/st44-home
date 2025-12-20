# Task: Parent Task Dashboard Component

## Metadata
- **ID**: task-098
- **Feature**: [feature-015-task-viewing-completion](../features/feature-015-task-viewing-completion.md)
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-20
- **Estimated Duration**: 5-6 hours
- **Agent Assignment**: frontend-agent

## Description
Build the parent-facing task dashboard that shows all household tasks across all children. Includes filtering by child/status/date, reassignment capability, and overview statistics.

## Requirements

### Component Features
- Display all household task assignments
- Filter by child, status, and date
- Show child name with each task
- Reassign tasks to different children
- Overview statistics (completion rate, overdue count)
- Bulk actions (future: reassign multiple)
- Desktop and mobile responsive

### UI/UX
- Table/card view toggle
- Clear visual hierarchy
- At-a-glance status overview
- Quick filters (Today, This Week, Overdue)
- Child selector dropdown
- Status badges
- Reassignment modal/dropdown

### Component Structure
```typescript
@Component({
  selector: 'app-parent-task-dashboard',
  template: `
    <div class="task-dashboard">
      <header>
        <h2>Household Tasks</h2>
        <div class="stats">
          <div class="stat">
            <span class="value">{{ completionRate() }}%</span>
            <span class="label">Completion Rate</span>
          </div>
          <div class="stat">
            <span class="value">{{ overdueCount() }}</span>
            <span class="label">Overdue</span>
          </div>
        </div>
      </header>

      <div class="filters">
        <select [(ngModel)]="selectedChild" (change)="applyFilters()">
          <option value="">All Children</option>
          @for (child of children(); track child.id) {
            <option [value]="child.id">{{ child.name }}</option>
          }
        </select>

        <select [(ngModel)]="selectedStatus" (change)="applyFilters()">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>

        <div class="date-buttons">
          <button (click)="filterByDate('today')" [class.active]="dateFilter() === 'today'">Today</button>
          <button (click)="filterByDate('week')" [class.active]="dateFilter() === 'week'">This Week</button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading">Loading assignments...</div>
      }

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }

      @if (filteredAssignments().length === 0 && !loading()) {
        <div class="empty-state">
          <p>No tasks found for selected filters</p>
        </div>
      }

      <div class="assignments-grid">
        @for (assignment of filteredAssignments(); track assignment.id) {
          <div class="assignment-card">
            <div class="task-info">
              <h3>{{ assignment.title }}</h3>
              <p class="child-name">{{ assignment.childName }}</p>
              @if (assignment.description) {
                <p class="description">{{ assignment.description }}</p>
              }
            </div>

            <div class="task-meta">
              <span class="date">{{ formatDate(assignment.date) }}</span>
              <span class="status-badge" [class]="assignment.status">
                {{ assignment.status }}
              </span>
            </div>

            <div class="actions">
              @if (assignment.status === 'pending') {
                <button (click)="openReassignModal(assignment)">
                  Reassign
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>

    @if (showReassignModal()) {
      <app-reassign-modal
        [assignment]="selectedAssignment()"
        [children]="children()"
        (reassign)="onReassign($event)"
        (cancel)="closeReassignModal()"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParentTaskDashboardComponent {
  private taskService = inject(TaskService);
  private householdService = inject(HouseholdService);

  // State
  householdId = computed(() => this.householdService.currentHousehold()?.id ?? '');
  children = signal<Child[]>([]);
  assignments = signal<TaskAssignment[]>([]);
  
  selectedChild = '';
  selectedStatus = '';
  dateFilter = signal<'today' | 'week'>('today');
  
  loading = signal(false);
  error = signal<string | null>(null);

  showReassignModal = signal(false);
  selectedAssignment = signal<TaskAssignment | null>(null);

  // Computed
  filteredAssignments = computed(() => {
    let filtered = this.assignments();

    // Filter by child
    if (this.selectedChild) {
      filtered = filtered.filter(a => a.childId === this.selectedChild);
    }

    // Filter by status
    if (this.selectedStatus === 'overdue') {
      filtered = filtered.filter(a => 
        a.status === 'pending' && new Date(a.date) < new Date()
      );
    } else if (this.selectedStatus) {
      filtered = filtered.filter(a => a.status === this.selectedStatus);
    }

    return filtered;
  });

  completionRate = computed(() => {
    const all = this.assignments();
    if (all.length === 0) return 0;
    const completed = all.filter(a => a.status === 'completed').length;
    return Math.round((completed / all.length) * 100);
  });

  overdueCount = computed(() => 
    this.assignments().filter(a => 
      a.status === 'pending' && new Date(a.date) < new Date()
    ).length
  );

  ngOnInit() {
    this.loadChildren();
    this.loadAssignments();
  }

  loadChildren() {
    this.householdService.getChildren(this.householdId()).subscribe({
      next: (children) => this.children.set(children),
      error: (err) => console.error('Failed to load children', err)
    });
  }

  loadAssignments() {
    this.loading.set(true);
    this.error.set(null);

    const filters = {
      date: this.dateFilter() === 'today' ? format(new Date(), 'yyyy-MM-dd') : undefined
    };

    this.taskService.getHouseholdAssignments(this.householdId(), filters).subscribe({
      next: (assignments) => {
        this.assignments.set(assignments);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  filterByDate(filter: 'today' | 'week') {
    this.dateFilter.set(filter);
    this.loadAssignments();
  }

  applyFilters() {
    // Filters applied via computed signal
  }

  openReassignModal(assignment: TaskAssignment) {
    this.selectedAssignment.set(assignment);
    this.showReassignModal.set(true);
  }

  closeReassignModal() {
    this.showReassignModal.set(false);
    this.selectedAssignment.set(null);
  }

  onReassign(event: { assignmentId: string; childId: string }) {
    this.taskService.reassignTask(event.assignmentId, event.childId).subscribe({
      next: () => {
        this.closeReassignModal();
        this.loadAssignments(); // Reload to show updated assignment
      },
      error: (err) => {
        this.error.set('Failed to reassign task');
      }
    });
  }

  formatDate(date: string): string {
    return format(parseISO(date), 'MMM d');
  }
}
```

### Reassign Modal Component
```typescript
@Component({
  selector: 'app-reassign-modal',
  template: `
    <div class="modal-overlay" (click)="cancel.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <h3>Reassign Task</h3>
        <p>{{ assignment().title }}</p>
        
        <select [(ngModel)]="selectedChildId">
          <option value="">Select child...</option>
          @for (child of children(); track child.id) {
            <option [value]="child.id">{{ child.name }}</option>
          }
        </select>

        <div class="modal-actions">
          <button (click)="cancel.emit()">Cancel</button>
          <button 
            (click)="onReassign()" 
            [disabled]="!selectedChildId"
          >
            Reassign
          </button>
        </div>
      </div>
    </div>
  `
})
export class ReassignModalComponent {
  assignment = input.required<TaskAssignment>();
  children = input.required<Child[]>();
  reassign = output<{ assignmentId: string; childId: string }>();
  cancel = output<void>();

  selectedChildId = '';

  onReassign() {
    if (this.selectedChildId) {
      this.reassign.emit({
        assignmentId: this.assignment().id,
        childId: this.selectedChildId
      });
    }
  }
}
```

## Acceptance Criteria
- [ ] Component displays all household assignments
- [ ] Shows child name with each assignment
- [ ] Filter dropdown for children (All, or specific child)
- [ ] Filter dropdown for status (All, Pending, Completed, Overdue)
- [ ] Date filter buttons (Today, This Week)
- [ ] Completion rate statistic displayed
- [ ] Overdue count displayed
- [ ] Reassign button for pending tasks
- [ ] Reassign modal with child selector
- [ ] Successfully reassigns task via API
- [ ] Loading state during API calls
- [ ] Error handling with user messages
- [ ] Empty state when no tasks match filters
- [ ] Mobile and desktop responsive
- [ ] Accessible (ARIA, keyboard navigation)
- [ ] Component tested with unit tests

## Dependencies
- task-096 ✅ TaskService with reassignment method
- task-094 ✅ Backend household assignments API
- task-095 ✅ Backend reassignment API
- Existing HouseholdService for children data

## Technical Notes

### Routing
```typescript
{
  path: 'household/tasks',
  component: ParentTaskDashboardComponent,
  canActivate: [authGuard, parentGuard]
}
```

### Statistics Calculations
- Completion rate: (completed / total) * 100
- Overdue: status=pending AND date < today
- Today's tasks: date = today
- Week's tasks: date between Monday-Sunday

### Styling
- Grid layout for cards (responsive columns)
- Status badges: color-coded (green=completed, red=overdue, blue=pending)
- Modal overlay with backdrop
- Hover states on interactive elements

### Accessibility
```html
<button 
  (click)="openReassignModal(assignment)"
  aria-label="Reassign {{ assignment.title }} to different child"
>
  Reassign
</button>
```

## Implementation Plan
1. Create ParentTaskDashboardComponent in `apps/frontend/src/app/features/tasks/`
2. Create ReassignModalComponent
3. Implement filtering logic (child, status, date)
4. Add statistics calculations
5. Connect to TaskService and HouseholdService
6. Style grid layout and cards
7. Add modal functionality
8. Add ARIA attributes
9. Add unit tests
10. Test responsiveness

## Progress Log
- [2025-12-20 00:05] Task created for feature-015 breakdown
