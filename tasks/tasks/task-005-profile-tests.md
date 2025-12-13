# Task: Add Profile Feature Tests

## Metadata
- **ID**: task-005
- **Feature**: feature-001 - User Profile Management
- **Epic**: None
- **Status**: pending
- **Priority**: medium
- **Created**: 2025-12-13
- **Assigned Agent**: frontend, backend
- **Estimated Duration**: 3-4 hours

## Description
Add comprehensive tests for the profile feature including backend endpoint tests and frontend component tests. Ensure all acceptance criteria are covered by automated tests.

## Requirements
1. Backend: Add tests for GET /api/users/:id/profile
2. Backend: Add tests for PUT /api/users/:id/profile
3. Frontend: Add unit tests for ProfileService
4. Frontend: Add component tests for ProfileComponent
5. Test validation logic
6. Test error handling
7. All tests must pass

## Acceptance Criteria
- [ ] Backend GET endpoint test: successful retrieval
- [ ] Backend GET endpoint test: user not found (404)
- [ ] Backend PUT endpoint test: successful update
- [ ] Backend PUT endpoint test: validation errors (400)
- [ ] Backend PUT endpoint test: user not found (404)
- [ ] Frontend service test: getProfile success
- [ ] Frontend service test: getProfile error handling
- [ ] Frontend service test: updateProfile success
- [ ] Frontend service test: updateProfile error handling
- [ ] Frontend component test: renders profile data
- [ ] Frontend component test: edit mode toggle
- [ ] Frontend component test: form validation
- [ ] Frontend component test: save profile
- [ ] All tests pass with `npm test`

## Dependencies
- Tasks 001-004 must be completed (feature fully implemented)

## Technical Notes

### Backend Tests
```typescript
// Add to apps/backend/src/server.test.ts (create if doesn't exist)
import { test } from 'node:test';
import assert from 'node:assert';

test('GET /api/users/:id/profile returns user profile', async (t) => {
  const response = await fastify.inject({
    method: 'GET',
    url: '/api/users/1/profile',
  });

  assert.strictEqual(response.statusCode, 200);
  const profile = JSON.parse(response.payload);
  assert.ok(profile.id);
  assert.ok(profile.username);
  assert.ok(profile.email);
});

test('GET /api/users/:id/profile returns 404 for nonexistent user', async (t) => {
  const response = await fastify.inject({
    method: 'GET',
    url: '/api/users/999/profile',
  });

  assert.strictEqual(response.statusCode, 404);
});

test('PUT /api/users/:id/profile updates profile', async (t) => {
  const response = await fastify.inject({
    method: 'PUT',
    url: '/api/users/1/profile',
    payload: {
      name: 'Updated Name',
      bio: 'Updated bio',
    },
  });

  assert.strictEqual(response.statusCode, 200);
  const result = JSON.parse(response.payload);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.profile.name, 'Updated Name');
});

test('PUT /api/users/:id/profile validates name required', async (t) => {
  const response = await fastify.inject({
    method: 'PUT',
    url: '/api/users/1/profile',
    payload: {
      name: '',
    },
  });

  assert.strictEqual(response.statusCode, 400);
});

test('PUT /api/users/:id/profile validates name max length', async (t) => {
  const response = await fastify.inject({
    method: 'PUT',
    url: '/api/users/1/profile',
    payload: {
      name: 'a'.repeat(256), // 256 chars, over limit
    },
  });

  assert.strictEqual(response.statusCode, 400);
});
```

### Frontend Service Tests
```typescript
// Add to apps/frontend/src/app/services/profile.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProfileService, UserProfile } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProfileService],
    });
    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch user profile', () => {
    const mockProfile: UserProfile = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      bio: 'Test bio',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    service.getProfile(1).subscribe((profile) => {
      expect(profile).toEqual(mockProfile);
    });

    const req = httpMock.expectOne('/api/users/1/profile');
    expect(req.request.method).toBe('GET');
    req.flush(mockProfile);
  });

  it('should update user profile', () => {
    const updateData = { name: 'Updated Name', bio: 'Updated bio' };
    const mockResponse = {
      success: true,
      profile: { ...mockProfile, ...updateData },
    };

    service.updateProfile(1, updateData).subscribe((response) => {
      expect(response.success).toBe(true);
      expect(response.profile.name).toBe('Updated Name');
    });

    const req = httpMock.expectOne('/api/users/1/profile');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateData);
    req.flush(mockResponse);
  });
});
```

### Frontend Component Tests
```typescript
// Add to apps/frontend/src/app/components/profile/profile.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ProfileComponent } from './profile.component';
import { ProfileService } from '../../services/profile.service';
import { of, throwError } from 'rxjs';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let profileService: ProfileService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    profileService = TestBed.inject(ProfileService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load profile on init', () => {
    const mockProfile = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      bio: 'Test bio',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    jest.spyOn(profileService, 'getProfile').mockReturnValue(of(mockProfile));

    fixture.detectChanges(); // Triggers ngOnInit

    expect(component.profile()).toEqual(mockProfile);
    expect(component.loading()).toBe(false);
  });

  it('should toggle edit mode', () => {
    const mockProfile = { /* ... */ };
    component.profile.set(mockProfile);

    component.startEditing();
    expect(component.isEditing()).toBe(true);

    component.cancelEditing();
    expect(component.isEditing()).toBe(false);
  });

  it('should validate form', () => {
    component.profileForm.patchValue({ name: '' });
    expect(component.profileForm.valid).toBe(false);

    component.profileForm.patchValue({ name: 'Valid Name' });
    expect(component.profileForm.valid).toBe(true);
  });

  it('should save profile', () => {
    const mockProfile = { /* ... */ };
    const mockResponse = { success: true, profile: mockProfile };
    
    component.profile.set(mockProfile);
    component.profileForm.patchValue({ name: 'Updated Name', bio: 'Updated bio' });
    
    jest.spyOn(profileService, 'updateProfile').mockReturnValue(of(mockResponse));

    component.saveProfile();

    expect(component.isEditing()).toBe(false);
    expect(component.successMessage()).toBeTruthy();
  });
});
```

### Files to Create
- `apps/backend/src/server.test.ts` (if doesn't exist)
- `apps/frontend/src/app/services/profile.service.spec.ts`
- `apps/frontend/src/app/components/profile/profile.component.spec.ts`

### Files to Update
- Update `package.json` test scripts if needed

## Implementation Plan
1. Create backend test file with endpoint tests
2. Create ProfileService test file
3. Create ProfileComponent test file
4. Run tests and fix any failures
5. Ensure all acceptance criteria have corresponding tests
6. Verify test coverage is adequate

## Progress Log
- [2025-12-13 DRY RUN] Task created by Orchestrator during feature breakdown
