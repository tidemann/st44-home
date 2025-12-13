# Task: Build Profile View and Edit Components

## Metadata
- **ID**: task-004
- **Feature**: feature-001 - User Profile Management
- **Epic**: None
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-13
- **Assigned Agent**: frontend
- **Estimated Duration**: 5-6 hours

## Description
Create Angular standalone components for viewing and editing user profiles. Implement using signals for state management, reactive forms for editing, and follow WCAG AA accessibility standards.

## Requirements
1. Create ProfileComponent for view/edit UI
2. Use signals for state management
3. Implement reactive form for editing
4. Read-only view by default with Edit button
5. Validation with inline error messages
6. Success/error messaging
7. Keyboard accessibility (WCAG AA)
8. Add route to app.routes.ts

## Acceptance Criteria
- [ ] ProfileComponent created as standalone component
- [ ] Uses ChangeDetectionStrategy.OnPush
- [ ] Profile data loaded on init with signals
- [ ] Read-only view shows username, email, name, bio
- [ ] Edit button toggles to edit mode
- [ ] Edit mode shows reactive form with validation
- [ ] Save button updates profile via ProfileService
- [ ] Cancel button reverts to read-only view
- [ ] Validation: name required (max 255), bio optional (max 1000)
- [ ] Inline error messages for validation
- [ ] Success message after save
- [ ] All interactive elements keyboard accessible
- [ ] Focus management when toggling modes
- [ ] Color contrast meets WCAG AA
- [ ] Route added to app.routes.ts
- [ ] Component documented in apps/frontend/AGENT.md

## Dependencies
- Task-003 must be completed (ProfileService exists)

## Technical Notes

### Component Structure
```typescript
// File: apps/frontend/src/app/components/profile/profile.component.ts
import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProfileService, UserProfile } from '../../services/profile.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(FormBuilder);

  // State signals
  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // Computed values
  protected readonly canEdit = computed(() => !this.isEditing() && this.profile() !== null);

  // Form
  protected readonly profileForm: FormGroup;

  constructor() {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      bio: ['', [Validators.maxLength(1000)]],
    });
  }

  ngOnInit() {
    this.loadProfile();
  }

  private loadProfile() {
    const userId = 1; // TODO: Get from auth service
    this.loading.set(true);
    this.error.set(null);

    this.profileService.getProfile(userId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load profile');
        this.loading.set(false);
        console.error('Error loading profile:', err);
      },
    });
  }

  protected startEditing() {
    const profile = this.profile();
    if (!profile) return;

    this.profileForm.patchValue({
      name: profile.name || '',
      bio: profile.bio || '',
    });

    this.isEditing.set(true);
    this.successMessage.set(null);
  }

  protected cancelEditing() {
    this.isEditing.set(false);
    this.profileForm.reset();
  }

  protected saveProfile() {
    if (!this.profileForm.valid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const profile = this.profile();
    if (!profile) return;

    this.saving.set(true);
    this.error.set(null);

    this.profileService.updateProfile(profile.id, this.profileForm.value).subscribe({
      next: (response) => {
        this.profile.set(response.profile);
        this.isEditing.set(false);
        this.saving.set(false);
        this.successMessage.set('Profile updated successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.error.set('Failed to update profile');
        this.saving.set(false);
        console.error('Error updating profile:', err);
      },
    });
  }
}
```

### Template Structure
```html
<!-- File: apps/frontend/src/app/components/profile/profile.component.html -->
<div class="profile-container">
  <h1>User Profile</h1>

  @if (loading()) {
    <p class="loading">Loading profile...</p>
  }

  @if (error()) {
    <p class="error" role="alert">{{ error() }}</p>
  }

  @if (successMessage()) {
    <p class="success" role="status">{{ successMessage() }}</p>
  }

  @if (profile() && !loading()) {
    @if (!isEditing()) {
      <!-- Read-only view -->
      <div class="profile-view">
        <div class="profile-field">
          <label>Username:</label>
          <p>{{ profile()!.username }}</p>
        </div>

        <div class="profile-field">
          <label>Email:</label>
          <p>{{ profile()!.email }}</p>
        </div>

        <div class="profile-field">
          <label>Name:</label>
          <p>{{ profile()!.name || '(Not set)' }}</p>
        </div>

        <div class="profile-field">
          <label>Bio:</label>
          <p>{{ profile()!.bio || '(No bio)' }}</p>
        </div>

        <button 
          type="button" 
          (click)="startEditing()"
          class="btn-primary"
          [attr.aria-label]="'Edit profile'">
          Edit Profile
        </button>
      </div>
    }

    @if (isEditing()) {
      <!-- Edit form -->
      <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="profile-form">
        <div class="form-field">
          <label for="username">Username (read-only):</label>
          <input 
            type="text" 
            id="username" 
            [value]="profile()!.username" 
            disabled 
            aria-readonly="true" />
        </div>

        <div class="form-field">
          <label for="email">Email (read-only):</label>
          <input 
            type="email" 
            id="email" 
            [value]="profile()!.email" 
            disabled 
            aria-readonly="true" />
        </div>

        <div class="form-field">
          <label for="name">Name: *</label>
          <input 
            type="text" 
            id="name" 
            formControlName="name"
            [attr.aria-invalid]="profileForm.get('name')?.invalid && profileForm.get('name')?.touched"
            [attr.aria-describedby]="profileForm.get('name')?.invalid && profileForm.get('name')?.touched ? 'name-error' : null"
            placeholder="Your full name" />
          
          @if (profileForm.get('name')?.invalid && profileForm.get('name')?.touched) {
            <span id="name-error" class="error-message" role="alert">
              @if (profileForm.get('name')?.errors?.['required']) {
                Name is required
              }
              @if (profileForm.get('name')?.errors?.['maxlength']) {
                Name must be 255 characters or less
              }
            </span>
          }
        </div>

        <div class="form-field">
          <label for="bio">Bio:</label>
          <textarea 
            id="bio" 
            formControlName="bio"
            rows="4"
            [attr.aria-invalid]="profileForm.get('bio')?.invalid && profileForm.get('bio')?.touched"
            [attr.aria-describedby]="profileForm.get('bio')?.invalid && profileForm.get('bio')?.touched ? 'bio-error' : null"
            placeholder="Tell us about yourself..."></textarea>
          
          @if (profileForm.get('bio')?.invalid && profileForm.get('bio')?.touched) {
            <span id="bio-error" class="error-message" role="alert">
              Bio must be 1000 characters or less
            </span>
          }
        </div>

        <div class="form-actions">
          <button 
            type="submit" 
            class="btn-primary"
            [disabled]="saving() || !profileForm.valid"
            [attr.aria-busy]="saving()">
            {{ saving() ? 'Saving...' : 'Save Changes' }}
          </button>
          
          <button 
            type="button" 
            (click)="cancelEditing()"
            class="btn-secondary"
            [disabled]="saving()">
            Cancel
          </button>
        </div>
      </form>
    }
  }
</div>
```

### Styling (Accessible)
```css
/* File: apps/frontend/src/app/components/profile/profile.component.css */
.profile-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
}

h1 {
  color: #333;
  margin-bottom: 24px;
}

.profile-view, .profile-form {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.profile-field, .form-field {
  margin-bottom: 16px;
}

label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

input, textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

input:focus, textarea:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-color: #3b82f6;
}

input[disabled] {
  background-color: #f5f5f5;
  color: #666;
  cursor: not-allowed;
}

.error-message {
  display: block;
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
}

.error {
  color: #ef4444;
  background: #fee2e2;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.success {
  color: #22c55e;
  background: #d1fae5;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-primary, .btn-secondary {
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-primary:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #d1d5db;
}

/* Focus visible for keyboard navigation */
button:focus-visible, input:focus-visible, textarea:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

### Route Configuration
```typescript
// Update: apps/frontend/src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'profile',
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent),
  },
  // ... other routes
];
```

### Files to Create
- `apps/frontend/src/app/components/profile/profile.component.ts`
- `apps/frontend/src/app/components/profile/profile.component.html`
- `apps/frontend/src/app/components/profile/profile.component.css`

### Files to Update
- `apps/frontend/src/app/app.routes.ts` - Add profile route
- `apps/frontend/AGENT.md` - Document profile component patterns

## Implementation Plan
1. Create profile component directory and files
2. Implement component with signals and reactive form
3. Implement template with read-only and edit modes
4. Add accessible styling with proper focus states
5. Add route to app.routes.ts
6. Test keyboard navigation
7. Test form validation
8. Update apps/frontend/AGENT.md

## Progress Log
- [2025-12-13 DRY RUN] Task created by Orchestrator during feature breakdown
