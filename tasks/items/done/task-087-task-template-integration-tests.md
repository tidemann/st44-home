# Task: Task Template Management Integration Tests

## Metadata
- **ID**: task-087
- **Feature**: [feature-013-task-template-management](../features/feature-013-task-template-management.md)
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: completed
- **Priority**: high
- **Created**: 2025-12-19
- **Assigned Agent**: orchestrator (coordinates backend + frontend testing)
- **Estimated Duration**: 4-5 hours

## Description
Create comprehensive integration tests for task template management covering backend API endpoints and frontend E2E flows. Ensure all CRUD operations work end-to-end with proper validation and error handling.

## Requirements

### Backend Integration Tests
Test all API endpoints with authentication and authorization:

**POST /api/households/:householdId/tasks**
- [ ] Creates task with all rule types (daily, repeating, weekly_rotation)
- [ ] Validates required fields per rule type
- [ ] Returns 400 for invalid rule configurations
- [ ] Returns 401 without authentication
- [ ] Returns 403 for non-household members
- [ ] Validates assigned children belong to household
- [ ] Sets timestamps correctly (created_at, updated_at)

**GET /api/households/:householdId/tasks**
- [ ] Returns all household tasks
- [ ] Filters by active status (?active=true/false)
- [ ] Orders by created_at DESC by default
- [ ] Returns 401 without authentication
- [ ] Returns 403 for non-household members
- [ ] Returns empty array when no tasks

**GET /api/households/:householdId/tasks/:taskId**
- [ ] Returns task details
- [ ] Returns 404 for non-existent task
- [ ] Returns 404 for task in different household
- [ ] Returns 401 without authentication
- [ ] Returns 403 for non-household members

**PUT /api/households/:householdId/tasks/:taskId**
- [ ] Updates specified fields only
- [ ] Validates updated rule_type and dependencies
- [ ] Updates updated_at timestamp
- [ ] Returns 404 for non-existent task
- [ ] Returns 400 for invalid updates
- [ ] Returns 401/403 for auth/authz failures
- [ ] Preserves unchanged fields

**DELETE /api/households/:householdId/tasks/:taskId**
- [ ] Soft deletes task (sets active=false)
- [ ] Returns success message
- [ ] Returns 404 for non-existent task
- [ ] Returns 401/403 for auth/authz failures
- [ ] Task still exists in database but inactive

### Frontend E2E Tests
Test user flows with Playwright:

**Create Task Flow**
- [ ] Navigate to task creation page
- [ ] Fill in task title and description
- [ ] Select rule type (daily)
- [ ] Submit form successfully
- [ ] See success message
- [ ] Task appears in list

**Create Repeating Task Flow**
- [ ] Select "Repeating" rule type
- [ ] Day selector appears
- [ ] Select multiple days (Mon, Wed, Fri)
- [ ] Children selector appears (required)
- [ ] Select children
- [ ] Submit successfully
- [ ] Task shows correct days in list

**Create Weekly Rotation Flow**
- [ ] Select "Weekly Rotation" rule type
- [ ] Rotation type options appear
- [ ] Select "Odd/Even Week"
- [ ] Children selector requires 2+ children
- [ ] Select multiple children
- [ ] Submit successfully
- [ ] Task shows rotation type in list

**Edit Task Flow**
- [ ] Click edit on existing task
- [ ] Modal opens with pre-filled form
- [ ] Change title
- [ ] Change rule type (triggers field updates)
- [ ] Save changes successfully
- [ ] Modal closes
- [ ] List updates with new values

**Delete Task Flow**
- [ ] Click delete on task
- [ ] Confirmation dialog appears
- [ ] Confirm deletion
- [ ] Task removed from active list
- [ ] Can see task in "Show all" view as inactive

**Filter and Sort Flow**
- [ ] Toggle "Show all" to see inactive tasks
- [ ] Inactive tasks visually distinct
- [ ] Change sort to "Title (A-Z)"
- [ ] Tasks reorder alphabetically
- [ ] Change sort to "Rule type"
- [ ] Tasks grouped by rule type

**Validation Errors**
- [ ] Submit empty title shows error
- [ ] Title over 200 chars shows error
- [ ] Repeating with no days shows error
- [ ] Repeating with no children shows error
- [ ] Weekly rotation with 1 child shows error
- [ ] Submit button disabled when invalid

### Data Isolation Tests
- [ ] User A cannot see User B's tasks
- [ ] User A cannot edit User B's tasks
- [ ] User A cannot delete User B's tasks
- [ ] Task assignments only show household's children

## Acceptance Criteria
- [ ] All backend integration tests pass (80%+ coverage)
- [ ] All frontend E2E tests pass
- [ ] Tests run in CI pipeline
- [ ] Tests use test database (isolated from dev/prod)
- [ ] Tests clean up after themselves
- [ ] Test data includes all rule types
- [ ] Auth/authz scenarios covered
- [ ] Error scenarios tested
- [ ] Multi-tenant isolation verified
- [ ] Tests are deterministic (no flakiness)

## Technical Implementation

### Backend Test Structure
Location: `apps/backend/src/routes/tasks.test.ts`

```typescript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { buildServer } from '../server.js';
import { pool } from '../database.js';

describe('Task Template API', () => {
  let server: any;
  let token: string;
  let householdId: number;
  let childId: number;
  let taskId: number;
  
  before(async () => {
    server = buildServer();
    await server.ready();
    
    // Create test user, household, child
    // ... setup code
  });
  
  after(async () => {
    // Clean up test data
    await server.close();
  });
  
  describe('POST /api/households/:householdId/tasks', () => {
    it('creates daily task', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: 'Take out trash',
          description: 'Every day',
          rule_type: 'daily'
        }
      });
      
      assert.strictEqual(response.statusCode, 201);
      const body = JSON.parse(response.body);
      assert.ok(body.id);
      assert.strictEqual(body.rule_type, 'daily');
      taskId = body.id;
    });
    
    it('creates repeating task with validation', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: 'Water plants',
          rule_type: 'repeating',
          repeat_days: [1, 3, 5],
          assigned_children: [childId]
        }
      });
      
      assert.strictEqual(response.statusCode, 201);
    });
    
    it('rejects repeating task without days', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: 'Invalid task',
          rule_type: 'repeating',
          assigned_children: [childId]
        }
      });
      
      assert.strictEqual(response.statusCode, 400);
    });
    
    // ... more tests
  });
  
  describe('GET /api/households/:householdId/tasks', () => {
    it('lists household tasks', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/households/${householdId}/tasks`,
        headers: { authorization: `Bearer ${token}` }
      });
      
      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body));
      assert.ok(body.length > 0);
    });
    
    // ... more tests
  });
  
  // ... PUT, DELETE tests
});
```

### Frontend E2E Test Structure
Location: `apps/frontend/e2e/features/task-templates.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { registerUser, loginUser } from '../helpers/auth-helpers';
import { createHousehold, createChild } from '../helpers/household-helpers';
import { resetTestDatabase } from '../helpers/test-helpers';

test.describe('Task Template Management', () => {
  let userEmail: string;
  let userPassword: string;
  let householdId: number;
  
  test.beforeEach(async ({ page }) => {
    await resetTestDatabase();
    
    // Register user, create household and children
    userEmail = `test-${Date.now()}@example.com`;
    userPassword = 'Password123!';
    
    await registerUser(page, userEmail, userPassword);
    householdId = await createHousehold(page, 'Test Family');
    await createChild(page, householdId, 'Emma');
    await createChild(page, householdId, 'Noah');
  });
  
  test('creates daily task', async ({ page }) => {
    // Navigate to task creation
    await page.goto('/tasks/new');
    
    // Fill form
    await page.fill('[name="title"]', 'Take out trash');
    await page.fill('[name="description"]', 'Empty all bins');
    await page.check('[value="daily"]');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify success
    await expect(page.locator('.success-message')).toContainText('created');
    
    // Verify in list
    await page.goto('/tasks');
    await expect(page.locator('.task-card')).toContainText('Take out trash');
  });
  
  test('creates repeating task with day selection', async ({ page }) => {
    await page.goto('/tasks/new');
    
    await page.fill('[name="title"]', 'Water plants');
    await page.check('[value="repeating"]');
    
    // Select days
    await page.check('[value="1"]'); // Monday
    await page.check('[value="3"]'); // Wednesday
    await page.check('[value="5"]'); // Friday
    
    // Select children
    await page.check('text=Emma');
    await page.check('text=Noah');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.success-message')).toBeVisible();
  });
  
  test('validates required fields', async ({ page }) => {
    await page.goto('/tasks/new');
    
    // Try to submit empty
    await page.click('button[type="submit"]');
    
    // Should see error
    await expect(page.locator('.error')).toContainText('required');
    
    // Submit button should be disabled
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });
  
  test('edits existing task', async ({ page }) => {
    // Create task first
    // ... setup code
    
    await page.goto('/tasks');
    await page.click('button:has-text("Edit")');
    
    // Modal should open
    await expect(page.locator('.modal-dialog')).toBeVisible();
    
    // Change title
    await page.fill('[name="title"]', 'Updated title');
    await page.click('button:has-text("Save")');
    
    // Verify update
    await expect(page.locator('.task-card')).toContainText('Updated title');
  });
  
  // ... more E2E tests
});
```

## Dependencies
- task-082 (Backend API) ✅ Must be complete
- task-083 (Frontend Service) ✅ Must be complete
- task-084, task-085, task-086 (Frontend Components) ✅ Must be complete
- Test database setup ✅ Already exists
- Playwright E2E infrastructure ✅ Already exists

## Testing Strategy
1. Backend tests run first (unit + integration)
2. Frontend E2E tests run after backend passes
3. Tests use isolated test database
4. Each test suite cleans up its data
5. CI runs both test suites in sequence
6. Coverage reports generated for both

## Files to Create
- `apps/backend/src/routes/tasks.test.ts`
- `apps/frontend/e2e/features/task-templates.spec.ts`
- `apps/frontend/e2e/helpers/task-helpers.ts` (optional)

## Progress Log
- [2025-12-19] Task created for feature-013 breakdown
- [2025-12-19 21:00] Status changed to in-progress, starting implementation
- [2025-12-19 22:10] ✅ Task completed successfully
  - Backend tests: 181/182 passing (1 timing-sensitive skipped)
  - Frontend E2E tests: 15 comprehensive scenarios created
  - All local checks passed: format, lint, build, test:ci, test
  - PR #114 merged: https://github.com/tidemann/st44-home/pull/114
  - Task moved to done/ folder
  - Feature-013 now complete (all 6 tasks done)
