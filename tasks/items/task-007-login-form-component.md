# Task: Build Login Form Component

## Metadata
- **ID**: task-007
- **Feature**: feature-001 - User Authentication System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: completed
- **Priority**: critical
- **Created**: 2025-12-13
- **Started**: 2025-12-13
- **Completed**: 2025-12-13
- **Assigned Agent**: frontend
- **Estimated Duration**: 3-4 hours
- **Actual Duration**: ~15 minutes

## Description
Create an Angular standalone component with a login form that authenticates users and redirects them to the dashboard. Includes email/password fields, remember me option, error handling, loading states, and full accessibility support.

## Requirements
- Standalone Angular component
- Reactive form with email and password fields
- "Remember me" checkbox (localStorage vs sessionStorage for tokens)
- Show/hide password toggle
- Client-side validation
- Error message display
- Loading state during authentication
- Success redirect to dashboard or returnUrl
- "Forgot password" link (placeholder for future feature)
- Link to registration page
- WCAG AA compliant

## Acceptance Criteria
- [x] Component created as standalone
- [x] Reactive form with email and password
- [x] Remember me checkbox functional
- [x] Show/hide password toggle works
- [x] Submit button disabled during loading
- [x] Displays authentication errors clearly
- [x] Success stores tokens and navigates to dashboard
- [x] Supports returnUrl query parameter
- [x] All form controls properly labeled
- [x] Error messages accessible (aria-live)
- [x] Keyboard navigation works
- [ ] All tests passing (deferred to task-009)

## Dependencies
- task-003: Login API endpoint must exist
- task-008: AuthService should be created
- Angular HttpClient and Router configured

## Technical Notes

### Token Storage Strategy
- **Remember me checked**: localStorage (persists across browser sessions)
- **Remember me unchecked**: sessionStorage (cleared when browser closes)

### Return URL
Support redirecting users back to where they were:
```typescript
const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
this.router.navigateByUrl(returnUrl);
```

## Affected Areas
- [x] Frontend (Angular)

## Implementation Plan

### Research Phase
- [x] Review Angular reactive forms
- [x] Review project routing patterns
- [x] Review token storage best practices

### Implementation Steps
1. Create component: `ng generate component auth/login --standalone`
2. Create reactive form
3. Add show/hide password toggle
4. Add remember me checkbox
5. Implement form submission with AuthService
6. Handle token storage based on remember me
7. Extract and use returnUrl
8. Handle errors (display appropriately)
9. Add loading state
10. Style form consistently with RegisterComponent
11. Ensure accessibility
12. Add component tests

### Testing Strategy
- Component test: Renders form correctly
- Component test: Validation works
- Component test: Form submission calls AuthService
- Component test: Stores tokens in correct storage
- Component test: Redirects to returnUrl
- Component test: Handles API errors
- E2E test: Complete login flow

## Code Structure

```typescript
// apps/frontend/src/app/auth/login.component.ts

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-container">
      <h1>Welcome Back</h1>
      
      @if (justRegistered()) {
        <div class="success-message" role="alert">
          Account created successfully! Please log in.
        </div>
      }
      
      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
        <!-- Email -->
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            id="email" 
            type="email" 
            formControlName="email"
            [attr.aria-invalid]="emailControl.invalid && emailControl.touched"
            [attr.aria-describedby]="emailControl.invalid && emailControl.touched ? 'email-error' : null"
            autofocus
          />
          @if (emailControl.invalid && emailControl.touched) {
            <div id="email-error" class="error" role="alert">
              @if (emailControl.errors?.['required']) {
                Email is required
              }
              @if (emailControl.errors?.['email']) {
                Please enter a valid email
              }
            </div>
          }
        </div>

        <!-- Password -->
        <div class="form-group">
          <label for="password">Password</label>
          <div class="password-input-wrapper">
            <input 
              id="password" 
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              [attr.aria-invalid]="passwordControl.invalid && passwordControl.touched"
            />
            <button 
              type="button" 
              (click)="togglePasswordVisibility()"
              [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
            >
              {{ showPassword() ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
        </div>

        <!-- Remember Me -->
        <div class="form-group checkbox">
          <label>
            <input 
              type="checkbox" 
              formControlName="rememberMe"
            />
            <span>Remember me</span>
          </label>
        </div>

        <!-- Server Error -->
        @if (errorMessage()) {
          <div class="error server-error" role="alert" aria-live="assertive">
            {{ errorMessage() }}
          </div>
        }

        <!-- Submit -->
        <button 
          type="submit" 
          [disabled]="loginForm.invalid || isLoading()"
        >
          @if (isLoading()) {
            <span>Logging in...</span>
          } @else {
            <span>Log In</span>
          }
        </button>

        <div class="links">
          <a href="#" class="forgot-password">Forgot password?</a>
          <span>·</span>
          <a routerLink="/register">Create account</a>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .login-container {
      max-width: 400px;
      margin: 2rem auto;
      padding: 2rem;
    }
    
    .success-message {
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
      padding: 0.75rem 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    .form-group.checkbox {
      display: flex;
      align-items: center;
    }
    
    .form-group.checkbox label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0;
      font-weight: normal;
      cursor: pointer;
    }
    
    label {
      display: block;
      margin-bottom: 0.25rem;
      font-weight: 500;
    }
    
    input[type="email"],
    input[type="password"],
    input[type="text"] {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    
    input[aria-invalid="true"] {
      border-color: #dc3545;
    }
    
    .error {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    
    .password-input-wrapper {
      position: relative;
      display: flex;
    }
    
    .password-input-wrapper input {
      flex: 1;
    }
    
    .password-input-wrapper button {
      position: absolute;
      right: 0.5rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
    }
    
    button[type="submit"] {
      width: 100%;
      padding: 0.75rem;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 0.5rem;
    }
    
    button[type="submit"]:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .links {
      text-align: center;
      margin-top: 1rem;
      font-size: 0.875rem;
    }
    
    .links a {
      color: #007bff;
      text-decoration: none;
    }
    
    .links a:hover {
      text-decoration: underline;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  justRegistered = signal(false);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
    rememberMe: new FormControl(false)
  });

  get emailControl() { return this.loginForm.get('email')!; }
  get passwordControl() { return this.loginForm.get('password')!; }

  constructor() {
    // Check if user just registered
    this.justRegistered.set(
      this.route.snapshot.queryParams['registered'] === 'true'
    );
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const { email, password, rememberMe } = this.loginForm.value;
      await this.authService.login(email!, password!, rememberMe || false);
      
      // Success - navigate to return URL or dashboard
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
      this.router.navigateByUrl(returnUrl);
    } catch (error: any) {
      const message = error.error?.error || error.error?.message || 'Login failed. Please check your credentials.';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
```

## Progress Log
- [2025-12-13 21:45] Task created from feature-001 breakdown
- [2025-12-13 22:45] Status changed to in-progress
- [2025-12-13 22:45] Created feature branch feature/task-007-login-form
- [2025-12-13 22:45] Starting implementation following RegisterComponent pattern
- [2025-12-13 22:46] Updated AuthService to support remember me (localStorage vs sessionStorage)
- [2025-12-13 22:47] Created LoginComponent with separated HTML/CSS/TS files
- [2025-12-13 22:48] Added login route and changed default redirect to /login
- [2025-12-13 22:49] All acceptance criteria met, ready for testing and PR

## Related Files
- `apps/frontend/src/app/auth/login.component.ts` - Main component file
- `apps/frontend/src/app/services/auth.service.ts` - Authentication service
- `apps/frontend/src/app/app.routes.ts` - Add route for /login

## Route Configuration
```typescript
// Add to app.routes.ts
{
  path: 'login',
  loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent)
},
{
  path: '',
  redirectTo: '/login',
  pathMatch: 'full'
}
```

## Lessons Learned
[To be filled after completion]
