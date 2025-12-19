# Task: Task Template Creation Form Component

## Metadata
- **ID**: task-084
- **Feature**: [feature-013-task-template-management](../features/feature-013-task-template-management.md)
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-19
- **Assigned Agent**: frontend-agent
- **Estimated Duration**: 8-10 hours

## Description
Build Angular component for creating task templates with a dynamic rule builder UI. The form adjusts fields based on selected rule type and provides clear explanations for each option.

## Requirements

### Component Features
- Reactive form with validation
- Dynamic fields based on rule_type selection
- Multi-select for assigning children
- Day-of-week selector for repeating tasks
- Rule type explanations and examples
- Form validation with error messages
- Submit button disabled when invalid
- Success/error feedback
- Cancel button to close form

### Rule Type Options
1. **Daily** - Task assigned every day
   - Simplest option
   - Optional: assign to specific children or all
   - Example: "Take out trash every day"

2. **Repeating** - Task on specific days of week
   - Select which days (Monday-Sunday)
   - Assign to specific children (required)
   - Rotates automatically among assigned children
   - Example: "Water plants on Monday, Wednesday, Friday"

3. **Weekly Rotation** - Alternates between children
   - **Odd/Even Week**: Child A on odd weeks, Child B on even weeks
   - **Alternating**: Child A this week, Child B next week, etc.
   - Requires 2+ children assigned
   - Example: "Clean room - alternates between Emma and Noah"

### Form Fields
- **Title** (required, max 200 chars)
  - Text input
  - Show character count
  
- **Description** (optional)
  - Textarea
  - Placeholder: "e.g., Empty all trash bins, including bathroom"

- **Rule Type** (required)
  - Radio buttons or select dropdown
  - Show description for each option
  
- **Assign Children** (required for repeating/rotation)
  - Multi-select checkboxes
  - Show child names from household
  - Minimum 1 for repeating, 2+ for rotation
  
- **Rotation Type** (required if weekly_rotation)
  - Radio buttons: Odd/Even Week | Alternating
  - Show explanation for each
  
- **Repeat Days** (required if repeating)
  - 7 checkboxes for days of week
  - Minimum 1 day required
  - Labels: Mon, Tue, Wed, Thu, Fri, Sat, Sun

### Validation Rules
- Title: Required, max 200 characters
- Rule Type: Required
- Assigned Children: 
  - Required if rule_type is 'repeating' or 'weekly_rotation'
  - Min 1 for repeating
  - Min 2 for weekly_rotation (odd_even_week)
- Rotation Type: Required if rule_type is 'weekly_rotation'
- Repeat Days: Required if rule_type is 'repeating', min 1 day

### UI/UX Requirements
- Form is accessible (WCAG AA)
- Clear labels and help text
- Validation errors shown inline
- Visual feedback for loading state
- Success message on creation
- Error message on failure
- Responsive design (mobile-friendly)

## Acceptance Criteria
- [ ] Component created at correct location
- [ ] Reactive form with all required fields
- [ ] Rule type selection updates visible fields dynamically
- [ ] Daily rule shows minimal fields (title, description, optional children)
- [ ] Repeating rule shows day selector and children (required)
- [ ] Weekly rotation shows rotation type and children (2+ required)
- [ ] Children multi-select loads from household context
- [ ] Day-of-week checkboxes for repeating tasks
- [ ] Rotation type radio buttons for weekly rotation
- [ ] Form validates all required fields per rule type
- [ ] Submit disabled when form invalid or loading
- [ ] Character count shown for title (X/200)
- [ ] Help text explains each rule type clearly
- [ ] Success message shown on successful creation
- [ ] Error message shown on API error
- [ ] Cancel button closes form without saving
- [ ] Form resets after successful creation
- [ ] Component follows Angular standalone pattern
- [ ] Component uses ChangeDetectionStrategy.OnPush
- [ ] Component uses inject() for services
- [ ] WCAG AA compliant (ARIA, keyboard nav, focus management)

## Technical Implementation

### Component Structure
```typescript
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { ChildrenService } from '../../services/children.service';
import { HouseholdService } from '../../services/household.service';

@Component({
  selector: 'app-task-create',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-create.component.html',
  styleUrl: './task-create.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskCreateComponent {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private childrenService = inject(ChildrenService);
  private householdService = inject(HouseholdService);
  
  // Signals
  successMessage = signal<string | null>(null);
  
  // Form group
  taskForm: FormGroup;
  
  // Days of week for repeating tasks
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
      assigned_children: [[]]
    });
    
    // Update validators when rule type changes
    this.taskForm.get('rule_type')?.valueChanges.subscribe(ruleType => {
      this.updateValidators(ruleType);
    });
  }
  
  private updateValidators(ruleType: string): void {
    const rotationType = this.taskForm.get('rotation_type');
    const repeatDays = this.taskForm.get('repeat_days');
    const assignedChildren = this.taskForm.get('assigned_children');
    
    // Clear all conditional validators
    rotationType?.clearValidators();
    repeatDays?.clearValidators();
    assignedChildren?.clearValidators();
    
    // Apply validators based on rule type
    if (ruleType === 'weekly_rotation') {
      rotationType?.setValidators(Validators.required);
      assignedChildren?.setValidators([Validators.required, Validators.minLength(2)]);
    } else if (ruleType === 'repeating') {
      repeatDays?.setValidators([Validators.required, Validators.minLength(1)]);
      assignedChildren?.setValidators([Validators.required, Validators.minLength(1)]);
    }
    
    // Update validity
    rotationType?.updateValueAndValidity();
    repeatDays?.updateValueAndValidity();
    assignedChildren?.updateValueAndValidity();
  }
  
  onSubmit(): void {
    if (this.taskForm.invalid) return;
    
    const householdId = this.householdService.currentHouseholdId();
    if (!householdId) {
      this.taskService.error.set('No household selected');
      return;
    }
    
    const formData = this.taskForm.value;
    
    this.taskService.createTask(householdId, formData).subscribe({
      next: () => {
        this.successMessage.set('Task template created successfully!');
        this.taskForm.reset({ rule_type: 'daily' });
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: () => {
        // Error handled in service
      }
    });
  }
  
  onCancel(): void {
    this.taskForm.reset({ rule_type: 'daily' });
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
<div class="task-create-form">
  <h2>Create Task Template</h2>
  
  <form [formGroup]="taskForm" (ngSubmit)="onSubmit()">
    <!-- Title -->
    <div class="form-group">
      <label for="title">
        Task Title <span class="required">*</span>
      </label>
      <input
        id="title"
        type="text"
        formControlName="title"
        placeholder="e.g., Take out trash"
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
        placeholder="e.g., Empty all trash bins, including bathroom"
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
            <p>Task assigned every day</p>
          </div>
        </label>
        <label class="rule-option">
          <input type="radio" formControlName="rule_type" value="repeating" />
          <div>
            <strong>Repeating</strong>
            <p>Task on specific days of the week</p>
          </div>
        </label>
        <label class="rule-option">
          <input type="radio" formControlName="rule_type" value="weekly_rotation" />
          <div>
            <strong>Weekly Rotation</strong>
            <p>Alternates between children each week</p>
          </div>
        </label>
      </div>
    </div>
    
    <!-- Repeat Days (shown if repeating) -->
    @if (ruleType === 'repeating') {
      <div class="form-group">
        <label>Repeat On <span class="required">*</span></label>
        <div class="day-selector">
          @for (day of daysOfWeek; track day.value) {
            <label class="day-checkbox">
              <input type="checkbox" [value]="day.value" />
              {{ day.label }}
            </label>
          }
        </div>
        @if (taskForm.get('repeat_days')?.invalid && taskForm.get('repeat_days')?.touched) {
          <p class="error" role="alert">Select at least one day</p>
        }
      </div>
    }
    
    <!-- Rotation Type (shown if weekly_rotation) -->
    @if (ruleType === 'weekly_rotation') {
      <div class="form-group">
        <label>Rotation Type <span class="required">*</span></label>
        <div class="rotation-types">
          <label class="rotation-option">
            <input type="radio" formControlName="rotation_type" value="odd_even_week" />
            <div>
              <strong>Odd/Even Week</strong>
              <p>Different child each calendar week</p>
            </div>
          </label>
          <label class="rotation-option">
            <input type="radio" formControlName="rotation_type" value="alternating" />
            <div>
              <strong>Alternating</strong>
              <p>Rotates every 7 days from start</p>
            </div>
          </label>
        </div>
      </div>
    }
    
    <!-- Assigned Children -->
    @if (ruleType !== 'daily') {
      <div class="form-group">
        <label>
          Assign to Children <span class="required">*</span>
          @if (ruleType === 'weekly_rotation') {
            <span class="help">(Select 2+ for rotation)</span>
          }
        </label>
        <div class="children-selector">
          @for (child of childrenService.children(); track child.id) {
            <label class="child-checkbox">
              <input type="checkbox" [value]="child.id" />
              {{ child.name }}
            </label>
          }
        </div>
        @if (taskForm.get('assigned_children')?.invalid && taskForm.get('assigned_children')?.touched) {
          <p class="error" role="alert">
            @if (ruleType === 'weekly_rotation') {
              Select at least 2 children for rotation
            } @else {
              Select at least 1 child
            }
          </p>
        }
      </div>
    }
    
    <!-- Messages -->
    @if (successMessage()) {
      <div class="success-message" role="status">{{ successMessage() }}</div>
    }
    @if (taskService.error()) {
      <div class="error-message" role="alert">{{ taskService.error() }}</div>
    }
    
    <!-- Actions -->
    <div class="form-actions">
      <button type="button" (click)="onCancel()" class="btn-secondary">
        Cancel
      </button>
      <button
        type="submit"
        class="btn-primary"
        [disabled]="taskForm.invalid || taskService.loading()"
      >
        @if (taskService.loading()) {
          Creating...
        } @else {
          Create Task
        }
      </button>
    </div>
  </form>
</div>
```

### Styling Guidelines
- Use CSS Grid or Flexbox for layout
- Consistent spacing and typography
- Clear visual hierarchy
- Disabled states for buttons
- Error messages in red
- Success messages in green
- Focus indicators for accessibility
- Responsive breakpoints for mobile

## Dependencies
- task-083 (TaskService) ✅ Must be completed first
- `ChildrenService` ✅ Already exists
- `HouseholdService` ✅ Already exists

## Testing Strategy
Unit tests should cover:
- Form initialization with default values
- Validators update when rule_type changes
- Daily rule shows minimal fields
- Repeating rule requires days and children
- Weekly rotation requires rotation type and 2+ children
- Submit disabled when invalid
- Successful creation calls service and resets form
- Error states displayed correctly
- Cancel button resets form

## Files to Create
- `apps/frontend/src/app/components/task-create/task-create.component.ts`
- `apps/frontend/src/app/components/task-create/task-create.component.html`
- `apps/frontend/src/app/components/task-create/task-create.component.css`
- `apps/frontend/src/app/components/task-create/task-create.component.spec.ts`

## Progress Log
- [2025-12-19] Task created for feature-013 breakdown
