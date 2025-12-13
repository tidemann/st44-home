# Task: Build Registration Form Component

## Metadata
- **ID**: task-006
- **Feature**: feature-001 - User Authentication System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-13
- **Assigned Agent**: frontend
- **Estimated Duration**: 4-5 hours

## Description
Create an Angular standalone component with a registration form that allows new users to create an account. Includes client-side validation, password strength indicator, error handling, and accessibility features.

## Requirements
- Standalone Angular component
- Reactive form with email and password fields
- Password confirmation field
- Real-time email validation
- Password strength indicator
- Client-side validation matching backend rules
- Error message display
- Loading state during submission
- Success redirect to login or dashboard
- WCAG AA compliant (keyboard navigation, ARIA labels, focus management)

## Acceptance Criteria
- [ ] Component created as standalone
- [ ] Reactive form with FormGroup
- [ ] Email field with email validator
- [ ] Password field with strength requirements validator
- [ ] Confirm password field with matching validator
- [ ] Password strength indicator (weak/medium/strong)
- [ ] Show/hide password toggle
- [ ] Submit button disabled during loading
- [ ] Displays server errors (duplicate email, etc.)
- [ ] Success navigates to login page
- [ ] All form controls have proper labels
- [ ] Error messages are accessible (aria-live)
- [ ] Keyboard navigation works correctly
- [ ] All tests passing
- [ ] Component documented in AGENTS.md if establishing new patterns

## Dependencies
- task-002: Registration API endpoint must exist
- task-008: AuthService should be created (or stub it)
- Angular HttpClient configured

## Technical Notes

### Form Structure
```typescript
registerForm = new FormGroup({
  email: new FormControl('', [Validators.required, Validators.email]),
  password: new FormControl('', [
    Validators.required,
    Validators.minLength(8),
    this.passwordStrengthValidator
  ]),
  confirmPassword: new FormControl('', [Validators.required])
}, { validators: this.passwordMatchValidator });
```

### Password Strength Logic
```typescript
getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z\d]/.test(password)) strength++;
  
  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
}
```

## Affected Areas
- [x] Frontend (Angular)

## Implementation Plan

### Research Phase
- [x] Review Angular standalone component patterns
- [x] Review reactive forms best practices
- [x] Review project's form validation conventions

### Implementation Steps
1. Create component: `ng generate component auth/register --standalone`
2. Create reactive form with validators
3. Implement password strength validator
4. Implement password match validator
5. Create password strength indicator component (or inline)
6. Add show/hide password toggle
7. Implement form submission with AuthService
8. Handle success (navigate to login)
9. Handle errors (display appropriately)
10. Add loading state
11. Style form (TailwindCSS if configured)
12. Ensure accessibility (ARIA labels, keyboard nav)
13. Add component tests

### Testing Strategy
- Unit test: Password strength calculation
- Unit test: Form validation (email, password, matching)
- Unit test: Form submission calls AuthService
- Component test: Renders form correctly
- Component test: Shows validation errors
- Component test: Handles API errors
- E2E test: Complete registration flow

## Code Structure

```typescript
// apps/frontend/src/app/auth/register.component.ts

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="register-container">
      <h1>Create Account</h1>
      
      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
        <!-- Email -->
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            id="email" 
            type="email" 
            formControlName="email"
            [attr.aria-invalid]="emailControl.invalid && emailControl.touched"
            [attr.aria-describedby]="emailControl.invalid && emailControl.touched ? 'email-error' : null"
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
              [attr.aria-describedby]="'password-strength' + (passwordControl.invalid && passwordControl.touched ? ' password-error' : '')"
            />
            <button 
              type="button" 
              (click)="togglePasswordVisibility()"
              [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
            >
              {{ showPassword() ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
          
          @if (passwordControl.value) {
            <div id="password-strength" class="strength-indicator" aria-live="polite">
              Strength: <span [class]="'strength-' + passwordStrength()">{{ passwordStrength() }}</span>
            </div>
          }
          
          @if (passwordControl.invalid && passwordControl.touched) {
            <div id="password-error" class="error" role="alert">
              Password must be at least 8 characters with uppercase, lowercase, and number
            </div>
          }
        </div>

        <!-- Confirm Password -->
        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input 
            id="confirmPassword" 
            [type]="showPassword() ? 'text' : 'password'"
            formControlName="confirmPassword"
            [attr.aria-invalid]="confirmPasswordControl.invalid && confirmPasswordControl.touched"
            [attr.aria-describedby]="confirmPasswordControl.invalid && confirmPasswordControl.touched ? 'confirm-error' : null"
          />
          @if (registerForm.errors?.['passwordMismatch'] && confirmPasswordControl.touched) {
            <div id="confirm-error" class="error" role="alert">
              Passwords do not match
            </div>
          }
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
          [disabled]="registerForm.invalid || isLoading()"
        >
          @if (isLoading()) {
            <span>Creating account...</span>
          } @else {
            <span>Create Account</span>
          }
        </button>

        <p class="login-link">
          Already have an account? <a routerLink="/login">Log in</a>
        </p>
      </form>
    </div>
  `,
  styles: [`
    .register-container {
      max-width: 400px;
      margin: 2rem auto;
      padding: 2rem;
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.25rem;
      font-weight: 500;
    }
    
    input {
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
    
    .strength-indicator {
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    
    .strength-weak { color: #dc3545; }
    .strength-medium { color: #ffc107; }
    .strength-strong { color: #28a745; }
    
    button[type="submit"] {
      width: 100%;
      padding: 0.75rem;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button[type="submit"]:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .login-link {
      text-align: center;
      margin-top: 1rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  registerForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(8),
      this.passwordStrengthValidator.bind(this)
    ]),
    confirmPassword: new FormControl('', [Validators.required])
  }, { validators: this.passwordMatchValidator.bind(this) });

  get emailControl() { return this.registerForm.get('email')!; }
  get passwordControl() { return this.registerForm.get('password')!; }
  get confirmPasswordControl() { return this.registerForm.get('confirmPassword')!; }

  passwordStrength = computed(() => {
    const password = this.passwordControl.value || '';
    return this.getPasswordStrength(password);
  });

  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return { passwordStrength: true };
    }

    return null;
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  }

  getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  async onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const { email, password } = this.registerForm.value;
      await this.authService.register(email!, password!);
      
      // Success - navigate to login
      this.router.navigate(['/login'], {
        queryParams: { registered: 'true' }
      });
    } catch (error: any) {
      this.errorMessage.set(
        error.error?.message || 'Registration failed. Please try again.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
```

## Progress Log
- [2025-12-13 21:45] Task created from feature-001 breakdown

## Related Files
- `apps/frontend/src/app/auth/register.component.ts` - Main component file
- `apps/frontend/src/app/services/auth.service.ts` - Authentication service
- `apps/frontend/src/app/app.routes.ts` - Add route for /register

## Route Configuration
```typescript
// Add to app.routes.ts
{
  path: 'register',
  loadComponent: () => import('./auth/register.component').then(m => m.RegisterComponent)
}
```

## Lessons Learned
[To be filled after completion]
