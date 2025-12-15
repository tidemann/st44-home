# Task: Build Household Creation Flow (Frontend)

## Metadata
- **ID**: task-024
- **Feature**: feature-003 - Household Management
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: in-progress
- **Priority**: high
- **Created**: 2025-12-14
- **Assigned Agent**: frontend
- **Estimated Duration**: 4-5 hours

## Description
Build the frontend household creation flow for new users. After registration, users should be prompted to create their first household. The flow should be simple, welcoming, and guide users through setting up their household name. This is the entry point for multi-tenant functionality.

## Requirements
- Household creation form component
- Simple, welcoming UI for first-time users
- Household name validation (1-100 chars)
- Submit to POST /api/households endpoint
- Success: Save household ID, redirect to dashboard
- Error handling and user feedback
- WCAG AA compliant

## Acceptance Criteria
- [ ] HouseholdCreateComponent created (standalone)
- [ ] Reactive form with household name field
- [ ] Client-side validation (required, 1-100 chars)
- [ ] Submit calls HouseholdService.createHousehold()
- [ ] Success: Household ID stored, user redirected
- [ ] Error: Display user-friendly error message
- [ ] WCAG AA compliant (ARIA, keyboard nav, focus management)
- [ ] Loading state during API call
- [ ] Form disabled during submission

## Dependencies
- task-021: POST /api/households endpoint
- task-028: HouseholdService implementation
- feature-001: AuthService and authentication

## Technical Notes

### Component Structure
```typescript
// household-create.ts
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HouseholdService } from '../../services/household.service';

@Component({
  selector: 'app-household-create',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './household-create.html',
  styleUrl: './household-create.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HouseholdCreateComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private householdService = inject(HouseholdService);

  isLoading = signal(false);
  errorMessage = signal('');

  householdForm: FormGroup = this.fb.group({
    name: ['', [
      Validators.required,
      Validators.minLength(1),
      Validators.maxLength(100)
    ]]
  });

  async onSubmit() {
    if (this.householdForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const { name } = this.householdForm.value;
      const household = await this.householdService.createHousehold(name);
      
      // Store active household ID
      this.householdService.setActiveHousehold(household.id);
      
      // Redirect to dashboard
      await this.router.navigate(['/dashboard']);
      
    } catch (error: any) {
      this.isLoading.set(false);
      this.errorMessage.set(
        error?.message || 'Failed to create household. Please try again.'
      );
    }
  }
}
```

### Template
```html
<!-- household-create.html -->
<div class="household-create">
  <div class="household-create__header">
    <h1>Welcome! Let's set up your household</h1>
    <p>What should we call your household?</p>
  </div>

  <form [formGroup]="householdForm" (ngSubmit)="onSubmit()" class="household-create__form">
    <div class="form-group">
      <label for="household-name" class="form-label">Household Name</label>
      <input
        id="household-name"
        type="text"
        formControlName="name"
        class="form-input"
        placeholder="e.g., The Smith Family"
        [attr.aria-invalid]="householdForm.get('name')?.invalid && householdForm.get('name')?.touched"
        [attr.aria-describedby]="householdForm.get('name')?.invalid && householdForm.get('name')?.touched ? 'name-error' : null"
      />
      
      @if (householdForm.get('name')?.invalid && householdForm.get('name')?.touched) {
        <div id="name-error" class="form-error" role="alert">
          @if (householdForm.get('name')?.errors?.['required']) {
            <span>Household name is required</span>
          }
          @if (householdForm.get('name')?.errors?.['maxlength']) {
            <span>Household name must be less than 100 characters</span>
          }
        </div>
      }
    </div>

    @if (errorMessage()) {
      <div class="alert alert--error" role="alert">
        {{ errorMessage() }}
      </div>
    }

    <button
      type="submit"
      class="btn btn--primary"
      [disabled]="householdForm.invalid || isLoading()"
    >
      @if (isLoading()) {
        <span>Creating household...</span>
      } @else {
        <span>Create Household</span>
      }
    </button>
  </form>
</div>
```

### Routing
```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { HouseholdCreateComponent } from './components/household-create/household-create';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // ...other routes
  {
    path: 'household/create',
    component: HouseholdCreateComponent,
    canActivate: [authGuard]
  }
];
```

### Onboarding Flow
After successful registration:
1. User logs in automatically
2. Check if user has any households (GET /api/households)
3. If no households, redirect to '/household/create'
4. After creation, redirect to '/dashboard'

### Accessibility Requirements
- Label properly associated with input (for/id)
- ARIA attributes for error states
- Keyboard navigation support (tab, enter)
- Focus management (auto-focus on input)
- Error messages announced by screen readers (role="alert")
- Disabled state clearly indicated
- High contrast for text and borders

### Error Handling
```typescript
// Error messages
- 400: "Please check your household name"
- 401: "Session expired. Please log in again"
- 500: "Failed to create household. Please try again"
- Network error: "No internet connection. Please check your connection"
```

## Affected Areas
- [ ] Database (PostgreSQL)
- [ ] Backend (Fastify/Node.js)
- [x] Frontend (Angular)
- [ ] Infrastructure (Docker/Nginx)
- [ ] CI/CD
- [ ] Documentation

## Implementation Plan

### Step 1: Create Component Files
1. Create `src/app/components/household-create/`
2. Create household-create.ts (component)
3. Create household-create.html (template)
4. Create household-create.css (styles)

### Step 2: Build Form
1. Import ReactiveFormsModule
2. Create FormGroup with name field
3. Add validators (required, minLength, maxLength)
4. Setup form submission handler

### Step 3: Implement State Management
1. Use signals for isLoading, errorMessage
2. Handle form validation states
3. Display error messages conditionally

### Step 4: API Integration
1. Inject HouseholdService
2. Call createHousehold() on submit
3. Handle success (store household ID, redirect)
4. Handle errors (display message)

### Step 5: Template and Styling
1. Create welcoming header
2. Build form with proper labels
3. Add error message displays
4. Style loading state
5. Ensure responsive design

### Step 6: Accessibility
1. Add ARIA labels and descriptions
2. Implement keyboard navigation
3. Add role="alert" for errors
4. Test with screen reader
5. Verify color contrast

### Step 7: Routing Integration
1. Add route to app.routes.ts
2. Add authGuard to protect route
3. Update onboarding flow to redirect here

### Step 8: Testing
1. Component unit tests
2. Form validation tests
3. API integration tests
4. Error handling tests
5. Accessibility tests (AXE)
6. Keyboard navigation tests

## Testing Strategy
- Unit tests for component logic
- Form validation tests (required, length limits)
- Test API success and error cases
- Test loading states
- Test redirect after creation
- Accessibility tests with AXE
- Keyboard navigation tests
- Screen reader testing

## Progress Log
- [2025-12-14 16:45] Task created from feature-003 breakdown

## Related Files
- `apps/frontend/src/app/components/household-create/` - New directory
- `apps/frontend/src/app/services/household.service.ts` - API calls
- `apps/frontend/src/app/app.routes.ts` - Routing

## Lessons Learned
[To be filled after completion]
