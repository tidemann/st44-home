# Task: Child Task List Component

## Metadata
- **ID**: task-097
- **Feature**: [feature-015-task-viewing-completion](../features/feature-015-task-viewing-completion.md)
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-20
- **Estimated Duration**: 4-5 hours
- **Agent Assignment**: frontend-agent

## Description
Build the child-facing task list component that shows a child's assigned tasks for today/week. Includes filtering, completion actions, and mobile-optimized UI.

## Requirements

### Component Features
- Display child's assigned tasks
- Filter by date (Today, This Week, All)
- Show task status (pending, completed, overdue)
- One-tap completion action
- Visual feedback (colors, icons)
- Empty states ("No tasks today!")
- Loading and error states

### UI/UX
- Mobile-first design (primary use case)
- Large touch targets (min 44x44px)
- Clear visual hierarchy
- Gamified completion (animations optional)
- Progress indicator ("3 of 5 tasks complete")
- Encouraging messages

### Component Structure
```typescript
@Component({
  selector: 'app-child-task-list',
  template: `
    <div class="task-list">
      <header>
        <h2>My Tasks</h2>
        <div class="filter-buttons">
          <button (click)="filterDate('today')" [class.active]="dateFilter() === 'today'">Today</button>
          <button (click)="filterDate('week')" [class.active]="dateFilter() === 'week'">This Week</button>
        </div>
      </header>

      @if (loading()) {
        <div class="loading">Loading tasks...</div>
      }

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }

      @if (tasks().length === 0 && !loading()) {
        <div class="empty-state">
          <p>🎉 No tasks today! Great job!</p>
        </div>
      }

      @if (tasks().length > 0) {
        <div class="progress">
          <span>{{ completedCount() }} of {{ tasks().length }} complete</span>
          <progress [value]="completedCount()" [max]="tasks().length"></progress>
        </div>

        <div class="task-cards">
          @for (task of tasks(); track task.id) {
            <app-task-card 
              [task]="task"
              (complete)="onComplete($event)"
            />
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChildTaskListComponent {
  private taskService = inject(TaskService);
  private childId = signal<string>(''); // Get from route or context

  // State
  dateFilter = signal<'today' | 'week'>('today');
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed
  tasks = computed(() => {
    const filter = this.dateFilter();
    // Filter logic based on date
    return this.taskService.childTasks$().filter(t => /* date logic */);
  });

  completedCount = computed(() => 
    this.tasks().filter(t => t.status === 'completed').length
  );

  ngOnInit() {
    this.loadTasks();
  }

  filterDate(filter: 'today' | 'week') {
    this.dateFilter.set(filter);
    this.loadTasks();
  }

  loadTasks() {
    this.loading.set(true);
    this.error.set(null);

    const date = this.dateFilter() === 'today' ? format(new Date(), 'yyyy-MM-dd') : undefined;

    this.taskService.getChildTasks(this.childId(), date).subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  onComplete(assignmentId: string) {
    this.taskService.completeTask(assignmentId).subscribe({
      error: (err) => {
        this.error.set('Failed to complete task');
      }
    });
  }
}
```

### TaskCard Component (Reusable)
```typescript
@Component({
  selector: 'app-task-card',
  template: `
    <div class="task-card" [class.completed]="task().status === 'completed'" [class.overdue]="isOverdue()">
      <div class="task-info">
        <h3>{{ task().title }}</h3>
        @if (task().description) {
          <p>{{ task().description }}</p>
        }
      </div>

      <div class="task-status">
        @if (task().status === 'completed') {
          <span class="badge completed">✓ Done</span>
        } @else if (isOverdue()) {
          <span class="badge overdue">⚠ Overdue</span>
        } @else {
          <button class="complete-btn" (click)="complete.emit(task().id)">
            Mark Complete
          </button>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskCardComponent {
  task = input.required<TaskAssignment>();
  complete = output<string>();

  isOverdue = computed(() => {
    const t = this.task();
    return t.status === 'pending' && new Date(t.date) < new Date();
  });
}
```

## Acceptance Criteria
- [ ] Component displays child's assigned tasks
- [ ] Filter buttons for "Today" and "This Week"
- [ ] Shows task title and description
- [ ] Status badges (completed, overdue, pending)
- [ ] "Mark Complete" button for pending tasks
- [ ] Progress indicator shows X of Y complete
- [ ] Empty state when no tasks
- [ ] Loading spinner during API call
- [ ] Error message on API failure
- [ ] Optimistic UI update on completion
- [ ] Mobile responsive (touch-friendly)
- [ ] Accessible (ARIA labels, keyboard navigation)
- [ ] Component tested with unit tests

## Dependencies
- task-096 ✅ TaskService with completion method
- task-094 ✅ Backend API for child tasks
- task-095 ✅ Backend completion endpoint

## Technical Notes

### Routing
Add route in `app.routes.ts`:
```typescript
{
  path: 'tasks',
  component: ChildTaskListComponent,
  canActivate: [authGuard]
}
```

### Child ID Source
- Option 1: From route parameter (`/children/:id/tasks`)
- Option 2: From user context (if logged in as child)
- Option 3: From household context (parent selecting child view)

Recommendation: User context for child users, household context for parent preview

### Date Filtering
```typescript
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

filterByDateRange(tasks: TaskAssignment[], filter: 'today' | 'week'): TaskAssignment[] {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');

  if (filter === 'today') {
    return tasks.filter(t => t.date === today);
  }

  // This week (Monday - Sunday)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  return tasks.filter(t => 
    isWithinInterval(parseISO(t.date), { start: weekStart, end: weekEnd })
  );
}
```

### Styling
Use Tailwind classes or CSS:
- Completed: Green background, checkmark icon
- Overdue: Red/orange border, warning icon
- Pending: Blue accent
- Touch targets: min 48px height on mobile

### Accessibility
```html
<button 
  (click)="complete.emit(task().id)"
  aria-label="Mark {{ task().title }} as complete"
  class="complete-btn"
>
  Mark Complete
</button>
```

## Implementation Plan
1. Create ChildTaskListComponent in `apps/frontend/src/app/features/tasks/`
2. Create TaskCardComponent (reusable)
3. Implement date filtering logic
4. Add loading and error states
5. Connect to TaskService
6. Style mobile-first
7. Add ARIA attributes
8. Add unit tests
9. Test on mobile device/emulator

## Progress Log
- [2025-12-20 00:00] Task created for feature-015 breakdown
