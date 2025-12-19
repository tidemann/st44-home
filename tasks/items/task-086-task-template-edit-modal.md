# Task: Task Template Edit Modal Component

## Metadata
- **ID**: task-086
- **Feature**: [feature-013-task-template-management](../features/feature-013-task-template-management.md)
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: in-progress
- **Priority**: high
- **Created**: 2025-12-19
- **Assigned Agent**: frontend-agent
- **Estimated Duration**: 6-7 hours

## Description
Build Angular component for editing existing task templates in a modal dialog. Pre-fill form with current values and update via API on save.

## Requirements

### Modal Features
- Opens as overlay/dialog
- Pre-fills form with task data
- Same form structure as create (task-084)
- Dynamic fields based on rule_type
- Save button updates task
- Cancel button closes without saving
- Close on Escape key
- Click outside to close (with unsaved changes warning)
- Success/error feedback

### Form Fields (same as create)
- Title (required, max 200)
- Description (optional)
- Rule Type (required)
- Rotation Type (if weekly_rotation)
- Repeat Days (if repeating)
- Assigned Children (if not daily)
- Active status toggle

### Validation
- Same validation as create component
- If rule_type changes, update required fields
- Show unsaved changes indicator

### UI/UX Requirements
- Modal overlay with backdrop
- Accessible modal (ARIA, focus trap)
- Form pre-populated with current values
- Visual feedback for changes
- Warning if closing with unsaved changes
- Loading state during save
- Success message on save
- Error message on failure

## Acceptance Criteria
- [ ] Component created as modal/dialog
- [ ] Receives task data as input
- [ ] Form pre-filled with task values
- [ ] Same dynamic behavior as create form
- [ ] Title field pre-filled and editable
- [ ] Description pre-filled if exists
- [ ] Rule type pre-selected, fields update accordingly
- [ ] Assigned children pre-selected
- [ ] Repeat days pre-selected if repeating
- [ ] Rotation type pre-selected if weekly_rotation
- [ ] Save button calls updateTask API
- [ ] Save disabled when invalid or loading
- [ ] Cancel button closes modal
- [ ] Escape key closes modal
- [ ] Click backdrop shows unsaved warning (if changed)
- [ ] Success message shown after save
- [ ] Error message shown if save fails
- [ ] Modal closes after successful save
- [ ] Component follows Angular standalone pattern
- [ ] Component uses ChangeDetectionStrategy.OnPush
- [ ] WCAG AA compliant (focus trap, ARIA labels)

## Technical Implementation

### Component Structure
```typescript
import { Component, ChangeDetectionStrategy, inject, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TaskService, TaskTemplate } from '../../services/task.service';
import { ChildrenService } from '../../services/children.service';
import { HouseholdService } from '../../services/household.service';

@Component({
  selector: 'app-task-edit',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-edit.component.html',
  styleUrl: './task-edit.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskEditComponent {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private childrenService = inject(ChildrenService);
  private householdService = inject(HouseholdService);
  
  // Inputs/Outputs
  task = input.required<TaskTemplate>();
  closed = output<void>();
  
  // Signals
  hasChanges = signal<boolean>(false);
  showUnsavedWarning = signal<boolean>(false);
  
  // Form
  taskForm: FormGroup;
  
  // Days of week
  daysOfWeek = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' }
  ];
  
  constructor() {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: [''],
      rule_type: ['daily', Validators.required],
      rotation_type: [''],
      repeat_days: [[]],
      assigned_children: [[]],
      active: [true]
    });
    
    // Watch for changes
    this.taskForm.valueChanges.subscribe(() => {
      this.hasChanges.set(true);
    });
    
    // Update validators when rule type changes
    this.taskForm.get('rule_type')?.valueChanges.subscribe(ruleType => {
      this.updateValidators(ruleType);
    });
    
    // Pre-fill form when task changes
    effect(() => {
      const task = this.task();
      this.taskForm.patchValue({
        title: task.title,
        description: task.description || '',
        rule_type: task.rule_type,
        rotation_type: task.rotation_type || '',
        repeat_days: task.repeat_days || [],
        assigned_children: task.assigned_children || [],
        active: task.active
      }, { emitEvent: false });
      
      this.hasChanges.set(false);
      this.updateValidators(task.rule_type);
    });
  }
  
  private updateValidators(ruleType: string): void {
    const rotationType = this.taskForm.get('rotation_type');
    const repeatDays = this.taskForm.get('repeat_days');
    const assignedChildren = this.taskForm.get('assigned_children');
    
    rotationType?.clearValidators();
    repeatDays?.clearValidators();
    assignedChildren?.clearValidators();
    
    if (ruleType === 'weekly_rotation') {
      rotationType?.setValidators(Validators.required);
      assignedChildren?.setValidators([Validators.required, Validators.minLength(2)]);
    } else if (ruleType === 'repeating') {
      repeatDays?.setValidators([Validators.required, Validators.minLength(1)]);
      assignedChildren?.setValidators([Validators.required, Validators.minLength(1)]);
    }
    
    rotationType?.updateValueAndValidity();
    repeatDays?.updateValueAndValidity();
    assignedChildren?.updateValueAndValidity();
  }
  
  onSave(): void {
    if (this.taskForm.invalid) return;
    
    const householdId = this.householdService.currentHouseholdId();
    if (!householdId) return;
    
    const formData = this.taskForm.value;
    const taskId = this.task().id;
    
    this.taskService.updateTask(householdId, taskId, formData).subscribe({
      next: () => {
        this.hasChanges.set(false);
        this.closed.emit();
      },
      error: () => {
        // Error handled in service
      }
    });
  }
  
  onCancel(): void {
    if (this.hasChanges()) {
      this.showUnsavedWarning.set(true);
    } else {
      this.closed.emit();
    }
  }
  
  confirmClose(): void {
    this.showUnsavedWarning.set(false);
    this.closed.emit();
  }
  
  cancelClose(): void {
    this.showUnsavedWarning.set(false);
  }
  
  onBackdropClick(): void {
    this.onCancel();
  }
  
  onEscapeKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onCancel();
    }
  }
  
  get titleChars(): number {
    return this.taskForm.get('title')?.value?.length || 0;
  }
  
  get ruleType(): string {
    return this.taskForm.get('rule_type')?.value;
  }
}
```

### Template Structure
```html
<div class="modal-overlay" (click)="onBackdropClick()" (keydown)="onEscapeKey($event)">
  <div
    class="modal-dialog"
    (click)="$event.stopPropagation()"
    role="dialog"
    aria-labelledby="modal-title"
    aria-modal="true"
  >
    <div class="modal-header">
      <h2 id="modal-title">Edit Task Template</h2>
      <button
        type="button"
        class="close-btn"
        (click)="onCancel()"
        aria-label="Close"
      >
        ×
      </button>
    </div>
    
    <form [formGroup]="taskForm" (ngSubmit)="onSave()">
      <div class="modal-body">
        <!-- Title -->
        <div class="form-group">
          <label for="title">
            Task Title <span class="required">*</span>
          </label>
          <input
            id="title"
            type="text"
            formControlName="title"
            [attr.aria-invalid]="taskForm.get('title')?.invalid && taskForm.get('title')?.touched"
          />
          <span class="char-count">{{ titleChars }}/200</span>
          @if (taskForm.get('title')?.invalid && taskForm.get('title')?.touched) {
            <p class="error" role="alert">Title is required (max 200 characters)</p>
          }
        </div>
        
        <!-- Description -->
        <div class="form-group">
          <label for="description">Description (Optional)</label>
          <textarea
            id="description"
            formControlName="description"
            rows="3"
          ></textarea>
        </div>
        
        <!-- Rule Type -->
        <div class="form-group">
          <label>Rule Type <span class="required">*</span></label>
          <div class="rule-types">
            <label class="rule-option">
              <input type="radio" formControlName="rule_type" value="daily" />
              <div>
                <strong>Daily</strong>
                <p>Every day</p>
              </div>
            </label>
            <label class="rule-option">
              <input type="radio" formControlName="rule_type" value="repeating" />
              <div>
                <strong>Repeating</strong>
                <p>Specific days</p>
              </div>
            </label>
            <label class="rule-option">
              <input type="radio" formControlName="rule_type" value="weekly_rotation" />
              <div>
                <strong>Weekly Rotation</strong>
                <p>Alternates weekly</p>
              </div>
            </label>
          </div>
        </div>
        
        <!-- Repeat Days (if repeating) -->
        @if (ruleType === 'repeating') {
          <div class="form-group">
            <label>Repeat On <span class="required">*</span></label>
            <div class="day-selector">
              @for (day of daysOfWeek; track day.value) {
                <label class="day-checkbox">
                  <input
                    type="checkbox"
                    [value]="day.value"
                    [checked]="taskForm.get('repeat_days')?.value?.includes(day.value)"
                  />
                  {{ day.label }}
                </label>
              }
            </div>
          </div>
        }
        
        <!-- Rotation Type (if weekly_rotation) -->
        @if (ruleType === 'weekly_rotation') {
          <div class="form-group">
            <label>Rotation Type <span class="required">*</span></label>
            <div class="rotation-types">
              <label>
                <input type="radio" formControlName="rotation_type" value="odd_even_week" />
                Odd/Even Week
              </label>
              <label>
                <input type="radio" formControlName="rotation_type" value="alternating" />
                Alternating
              </label>
            </div>
          </div>
        }
        
        <!-- Assigned Children (if not daily) -->
        @if (ruleType !== 'daily') {
          <div class="form-group">
            <label>Assign to Children <span class="required">*</span></label>
            <div class="children-selector">
              @for (child of childrenService.children(); track child.id) {
                <label class="child-checkbox">
                  <input
                    type="checkbox"
                    [value]="child.id"
                    [checked]="taskForm.get('assigned_children')?.value?.includes(child.id)"
                  />
                  {{ child.name }}
                </label>
              }
            </div>
          </div>
        }
        
        <!-- Active Status -->
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" formControlName="active" />
            Task is active
          </label>
          <p class="help-text">Inactive tasks won't create new assignments</p>
        </div>
        
        <!-- Messages -->
        @if (taskService.error()) {
          <div class="error-message" role="alert">{{ taskService.error() }}</div>
        }
      </div>
      
      <div class="modal-footer">
        <button type="button" (click)="onCancel()" class="btn-secondary">
          Cancel
        </button>
        <button
          type="submit"
          class="btn-primary"
          [disabled]="taskForm.invalid || taskService.loading() || !hasChanges()"
        >
          @if (taskService.loading()) {
            Saving...
          } @else {
            Save Changes
          }
        </button>
      </div>
    </form>
  </div>
  
  <!-- Unsaved Changes Warning -->
  @if (showUnsavedWarning()) {
    <div class="dialog-overlay">
      <div class="dialog" role="alertdialog" aria-labelledby="warning-title">
        <h3 id="warning-title">Unsaved Changes</h3>
        <p>You have unsaved changes. Are you sure you want to close?</p>
        <div class="dialog-actions">
          <button type="button" (click)="cancelClose()" class="btn-secondary">
            Keep Editing
          </button>
          <button type="button" (click)="confirmClose()" class="btn-danger">
            Discard Changes
          </button>
        </div>
      </div>
    </div>
  }
</div>
```

### Styling Guidelines
- Full-screen modal overlay
- Centered dialog with max-width
- Backdrop blur or darken
- Focus trap within modal
- Smooth open/close animations
- Scrollable body if content overflows
- Fixed footer with actions

## Dependencies
- task-083 (TaskService) ✅ Must be completed
- task-084 (Create form) ✅ Reuses same structure
- `ChildrenService` ✅ Already exists
- `HouseholdService` ✅ Already exists

## Testing Strategy
Unit tests should cover:
- Form pre-fills with task data
- Rule type change updates fields
- Validation works correctly
- Save button disabled when invalid/unchanged
- Save calls updateTask with correct data
- Cancel shows warning if changes exist
- Escape key triggers cancel
- Backdrop click triggers cancel
- Unsaved warning can be confirmed or canceled

## Files to Create
- `apps/frontend/src/app/components/task-edit/task-edit.component.ts`
- `apps/frontend/src/app/components/task-edit/task-edit.component.html`
- `apps/frontend/src/app/components/task-edit/task-edit.component.css`
- `apps/frontend/src/app/components/task-edit/task-edit.component.spec.ts`

## Progress Log
- [2025-12-19 21:27] Task status changed to in-progress
- [2025-12-19 21:27] Delegated to frontend-agent for implementation
- [2025-12-19] Task created for feature-013 breakdown
