# Task: Task Template List Component

## Metadata
- **ID**: task-085
- **Feature**: [feature-013-task-template-management](../features/feature-013-task-template-management.md)
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: in-progress
- **Priority**: high
- **Created**: 2025-12-19
- **Assigned Agent**: frontend-agent | orchestrator-agent
- **Estimated Duration**: 5-6 hours

## Description
Build Angular component to display all task templates for a household with filtering, sorting, and quick actions (edit, delete, toggle active status).

## Requirements

### Display Features
- List all task templates for current household
- Show task title, description preview, rule type
- Visual indicators for rule type (icons or badges)
- Show assigned children names
- Display active/inactive status
- Empty state when no tasks exist
- Loading state while fetching
- Error state if load fails

### Filtering & Sorting
- Toggle filter: Active only | Show all
- Sort options:
  - Created date (newest first - default)
  - Title (A-Z)
  - Rule type
- Search by task title (optional enhancement)

### Actions per Task
- **Edit** button - Opens edit modal
- **Delete** button - Soft delete with confirmation
- **Toggle Active** - Enable/disable without deleting

### UI/UX Requirements
- Responsive card or list layout
- Clear visual hierarchy
- Loading spinner while fetching
- Empty state with helpful message
- Confirmation dialog for delete
- Success/error toast messages
- Accessible (WCAG AA)

## Acceptance Criteria
- [ ] Component created at correct location
- [ ] Loads tasks on init using TaskService
- [ ] Displays all task properties clearly
- [ ] Shows rule type with visual indicator (icon/badge)
- [ ] Shows assigned children names (comma-separated)
- [ ] Active/inactive status clearly visible
- [ ] Filter toggle works (active only / show all)
- [ ] Sort dropdown changes order correctly
- [ ] Edit button opens task edit modal/form
- [ ] Delete button shows confirmation dialog
- [ ] Delete confirmation actually deletes task
- [ ] Toggle active button switches active state
- [ ] Empty state shown when no tasks
- [ ] Loading state shown while fetching
- [ ] Error message shown if fetch fails
- [ ] Success message shown after edit/delete
- [ ] Component follows Angular standalone pattern
- [ ] Component uses ChangeDetectionStrategy.OnPush
- [ ] Component uses inject() for services
- [ ] WCAG AA compliant

## Technical Implementation

### Component Structure
```typescript
import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService, TaskTemplate } from '../../services/task.service';
import { ChildrenService } from '../../services/children.service';
import { HouseholdService } from '../../services/household.service';

type SortOption = 'created' | 'title' | 'rule_type';

@Component({
  selector: 'app-task-list',
  imports: [CommonModule],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskListComponent {
  private taskService = inject(TaskService);
  private childrenService = inject(ChildrenService);
  private householdService = inject(HouseholdService);
  
  // Signals
  showActiveOnly = signal<boolean>(true);
  sortBy = signal<SortOption>('created');
  taskToDelete = signal<TaskTemplate | null>(null);
  
  // Computed: filtered and sorted tasks
  displayedTasks = computed(() => {
    let tasks = this.showActiveOnly()
      ? this.taskService.activeTasks()
      : this.taskService.tasks();
    
    // Sort
    const sort = this.sortBy();
    if (sort === 'title') {
      tasks = [...tasks].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'rule_type') {
      tasks = [...tasks].sort((a, b) => a.rule_type.localeCompare(b.rule_type));
    } else {
      // Default: created (newest first)
      tasks = [...tasks].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    
    return tasks;
  });
  
  ngOnInit(): void {
    this.loadTasks();
  }
  
  loadTasks(): void {
    const householdId = this.householdService.currentHouseholdId();
    if (!householdId) return;
    
    this.taskService.getTasks(householdId, this.showActiveOnly()).subscribe();
  }
  
  onFilterChange(activeOnly: boolean): void {
    this.showActiveOnly.set(activeOnly);
    this.loadTasks();
  }
  
  onSortChange(sort: SortOption): void {
    this.sortBy.set(sort);
  }
  
  onEdit(task: TaskTemplate): void {
    // Emit event or navigate to edit view
    // Implementation depends on routing strategy
  }
  
  onDeleteClick(task: TaskTemplate): void {
    this.taskToDelete.set(task);
  }
  
  confirmDelete(): void {
    const task = this.taskToDelete();
    if (!task) return;
    
    const householdId = this.householdService.currentHouseholdId();
    if (!householdId) return;
    
    this.taskService.deleteTask(householdId, task.id).subscribe({
      next: () => {
        this.taskToDelete.set(null);
      },
      error: () => {
        this.taskToDelete.set(null);
      }
    });
  }
  
  cancelDelete(): void {
    this.taskToDelete.set(null);
  }
  
  onToggleActive(task: TaskTemplate): void {
    const householdId = this.householdService.currentHouseholdId();
    if (!householdId) return;
    
    this.taskService.updateTask(householdId, task.id, {
      active: !task.active
    }).subscribe();
  }
  
  getChildrenNames(childIds: number[] | null): string {
    if (!childIds || childIds.length === 0) return 'All children';
    
    const children = this.childrenService.children();
    const names = childIds
      .map(id => children.find(c => c.id === id)?.name)
      .filter(name => name);
    
    return names.join(', ') || 'Unknown';
  }
  
  getRuleTypeLabel(ruleType: string): string {
    const labels: Record<string, string> = {
      'daily': 'Daily',
      'repeating': 'Repeating',
      'weekly_rotation': 'Weekly Rotation'
    };
    return labels[ruleType] || ruleType;
  }
  
  getRepeatDaysLabel(repeatDays: number[] | null): string {
    if (!repeatDays) return '';
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return repeatDays.map(d => dayNames[d]).join(', ');
  }
}
```

### Template Structure
```html
<div class="task-list">
  <div class="list-header">
    <h2>Task Templates</h2>
    
    <!-- Filters & Sort -->
    <div class="controls">
      <div class="filter-toggle">
        <label>
          <input
            type="radio"
            name="filter"
            [checked]="showActiveOnly()"
            (change)="onFilterChange(true)"
          />
          Active only
        </label>
        <label>
          <input
            type="radio"
            name="filter"
            [checked]="!showActiveOnly()"
            (change)="onFilterChange(false)"
          />
          Show all
        </label>
      </div>
      
      <div class="sort-control">
        <label for="sort">Sort by:</label>
        <select id="sort" (change)="onSortChange($event.target.value)">
          <option value="created">Newest first</option>
          <option value="title">Title (A-Z)</option>
          <option value="rule_type">Rule type</option>
        </select>
      </div>
    </div>
  </div>
  
  <!-- Loading State -->
  @if (taskService.loading()) {
    <div class="loading" role="status">
      <p>Loading tasks...</p>
    </div>
  }
  
  <!-- Error State -->
  @if (taskService.error()) {
    <div class="error" role="alert">
      <p>{{ taskService.error() }}</p>
      <button (click)="loadTasks()">Try again</button>
    </div>
  }
  
  <!-- Empty State -->
  @if (!taskService.loading() && displayedTasks().length === 0) {
    <div class="empty-state">
      <p>No task templates yet.</p>
      <p>Create your first task to get started!</p>
    </div>
  }
  
  <!-- Task List -->
  @if (!taskService.loading() && displayedTasks().length > 0) {
    <div class="task-cards">
      @for (task of displayedTasks(); track task.id) {
        <div class="task-card" [class.inactive]="!task.active">
          <div class="task-header">
            <h3>{{ task.title }}</h3>
            <span class="rule-badge" [attr.data-rule]="task.rule_type">
              {{ getRuleTypeLabel(task.rule_type) }}
            </span>
          </div>
          
          @if (task.description) {
            <p class="description">{{ task.description }}</p>
          }
          
          <div class="task-details">
            <div class="detail-row">
              <strong>Assigned to:</strong>
              <span>{{ getChildrenNames(task.assigned_children) }}</span>
            </div>
            
            @if (task.rule_type === 'repeating' && task.repeat_days) {
              <div class="detail-row">
                <strong>Days:</strong>
                <span>{{ getRepeatDaysLabel(task.repeat_days) }}</span>
              </div>
            }
            
            @if (task.rule_type === 'weekly_rotation' && task.rotation_type) {
              <div class="detail-row">
                <strong>Rotation:</strong>
                <span>{{ task.rotation_type === 'odd_even_week' ? 'Odd/Even Week' : 'Alternating' }}</span>
              </div>
            }
          </div>
          
          <div class="task-actions">
            <button
              type="button"
              (click)="onEdit(task)"
              class="btn-secondary btn-sm"
              [attr.aria-label]="'Edit ' + task.title"
            >
              Edit
            </button>
            <button
              type="button"
              (click)="onToggleActive(task)"
              class="btn-secondary btn-sm"
              [attr.aria-label]="(task.active ? 'Disable ' : 'Enable ') + task.title"
            >
              {{ task.active ? 'Disable' : 'Enable' }}
            </button>
            <button
              type="button"
              (click)="onDeleteClick(task)"
              class="btn-danger btn-sm"
              [attr.aria-label]="'Delete ' + task.title"
            >
              Delete
            </button>
          </div>
        </div>
      }
    </div>
  }
  
  <!-- Delete Confirmation Dialog -->
  @if (taskToDelete()) {
    <div class="dialog-overlay" (click)="cancelDelete()">
      <div class="dialog" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="dialog-title">
        <h3 id="dialog-title">Delete Task Template?</h3>
        <p>
          Are you sure you want to delete "<strong>{{ taskToDelete()?.title }}</strong>"?
          This will remove the template but preserve existing task assignments.
        </p>
        <div class="dialog-actions">
          <button type="button" (click)="cancelDelete()" class="btn-secondary">
            Cancel
          </button>
          <button type="button" (click)="confirmDelete()" class="btn-danger">
            Delete
          </button>
        </div>
      </div>
    </div>
  }
</div>
```

### Styling Guidelines
- Card layout with shadows for depth
- Rule type badges with different colors
- Inactive tasks visually muted (opacity/gray)
- Responsive grid (1 col mobile, 2-3 cols desktop)
- Dialog overlay with backdrop
- Smooth transitions for state changes

## Dependencies
- task-083 (TaskService) ✅ Must be completed
- `ChildrenService` ✅ Already exists
- `HouseholdService` ✅ Already exists

## Testing Strategy
Unit tests should cover:
- Tasks load on init
- Filter toggle updates display
- Sort dropdown changes order
- Edit button triggers correct action
- Delete shows confirmation dialog
- Confirm delete calls service
- Toggle active updates task status
- Children names display correctly
- Empty state shows when no tasks
- Loading/error states render correctly

## Files to Create
- `apps/frontend/src/app/components/task-list/task-list.component.ts`
- `apps/frontend/src/app/components/task-list/task-list.component.html`
- `apps/frontend/src/app/components/task-list/task-list.component.css`
- `apps/frontend/src/app/components/task-list/task-list.component.spec.ts`

## Progress Log
- [2025-12-19] Task created for feature-013 breakdown
