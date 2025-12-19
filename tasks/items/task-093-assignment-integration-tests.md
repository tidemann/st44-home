# Task: Assignment Generation Integration Tests

## Metadata
- **ID**: task-093
- **Feature**: [feature-014-task-assignment-rule-engine](../features/feature-014-task-assignment-rule-engine.md)
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: in-progress
- **Priority**: high
- **Created**: 2025-12-19
- **Assigned Agent**: backend-agent
- **Estimated Duration**: 6-8 hours

## Description
Create comprehensive integration tests for the assignment generation service and API endpoints. Tests should cover all 4 rule types, idempotency, edge cases, and API authorization.

## Requirements

### Test File Structure
```
apps/backend/src/services/assignment-generator.test.ts
apps/backend/src/routes/assignments.test.ts
```

### Service Tests (assignment-generator.test.ts)

**Test Suite 1: Daily Rule Type**
- [ ] Generates assignment for each day
- [ ] Rotates children when children array provided
- [ ] Creates null assignment when no children
- [ ] Skips inactive tasks
- [ ] Handles date range boundaries

**Test Suite 2: Repeating Rule Type**
- [ ] Generates only on repeat_days
- [ ] Skips non-repeat days
- [ ] Rotates children on repeat days
- [ ] Handles Sunday (0) and Saturday (6)
- [ ] Multiple repeat days work correctly

**Test Suite 3: Weekly Rotation (Odd/Even)**
- [ ] Assigns first child on odd weeks
- [ ] Assigns second child on even weeks
- [ ] Cycles through 3+ children (modulo)
- [ ] Calculates ISO week correctly (week 1 has Jan 4th)
- [ ] Handles year boundaries (week 52/53 → week 1)

**Test Suite 4: Weekly Rotation (Alternating)**
- [ ] Rotates to next child based on last assignment
- [ ] Handles first assignment (no history)
- [ ] Cycles back to first child after last
- [ ] Queries correct household for history
- [ ] Handles multiple tasks with separate rotations

**Test Suite 5: Idempotency**
- [ ] Re-running same date range skips existing
- [ ] Returns correct skipped count
- [ ] No duplicate assignments created
- [ ] ON CONFLICT DO NOTHING works

**Test Suite 6: Edge Cases**
- [ ] Empty children array (null assignments)
- [ ] No active tasks (no assignments)
- [ ] Task with no rule (defaults to daily)
- [ ] Invalid household_id (no tasks found)
- [ ] 30-day generation (batch performance)

### API Endpoint Tests (assignments.test.ts)

**Test Suite 7: POST /api/admin/tasks/generate-assignments**
- [ ] Requires authentication (401 without token)
- [ ] Checks household membership (403 if not member)
- [ ] Validates householdId format (400 on invalid UUID)
- [ ] Validates date format (400 on invalid date)
- [ ] Validates days range 1-30 (400 outside range)
- [ ] Calls assignment-generator service
- [ ] Returns created/skipped/errors counts
- [ ] Returns 200 on success

**Test Suite 8: GET /api/households/:id/assignments**
- [ ] Requires authentication (401 without token)
- [ ] Checks household membership (403 if not member)
- [ ] Defaults date to today if not provided
- [ ] Defaults days to 7 if not provided
- [ ] Validates days range 1-30
- [ ] Joins task names correctly
- [ ] Joins child names correctly (LEFT JOIN for null)
- [ ] Orders by date ASC, child_name ASC
- [ ] Returns only household's assignments
- [ ] Filters by date range correctly

## Acceptance Criteria
- [ ] 40+ integration tests written
- [ ] All 4 rule types tested thoroughly
- [ ] Idempotency verified with tests
- [ ] API authorization tested (401, 403)
- [ ] API validation tested (400 errors)
- [ ] Edge cases covered (no children, inactive tasks, etc.)
- [ ] Tests use test database (not production)
- [ ] Tests clean up data after each test
- [ ] All tests pass locally
- [ ] Tests run in CI pipeline

## Technical Notes

### Test Setup
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildServer } from '../server.js';
import { pool } from '../database.js';

describe('Assignment Generator Service', () => {
  let testHouseholdId: string;
  let testTaskId: string;
  let testChildIds: string[];

  beforeEach(async () => {
    // Create test household, tasks, children
    const household = await pool.query(
      'INSERT INTO households (name) VALUES ($1) RETURNING id',
      ['Test Household']
    );
    testHouseholdId = household.rows[0].id;

    // Create test tasks with different rule types
    const task = await pool.query(
      'INSERT INTO tasks (household_id, name, rule_type, ...) VALUES (...) RETURNING id',
      [...]
    );
    testTaskId = task.rows[0].id;

    // Create test children
    // ...
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM task_assignments WHERE task_id = $1', [testTaskId]);
    await pool.query('DELETE FROM tasks WHERE household_id = $1', [testHouseholdId]);
    await pool.query('DELETE FROM children WHERE household_id = $1', [testHouseholdId]);
    await pool.query('DELETE FROM households WHERE id = $1', [testHouseholdId]);
  });

  it('generates daily assignments', async () => {
    // Test implementation
  });
});
```

### API Test Helper
```typescript
async function makeAuthenticatedRequest(
  server: FastifyInstance,
  userId: string,
  householdId: string
) {
  // Generate JWT token for test user
  const token = generateToken(userId);
  
  // Add user to household
  await pool.query(
    'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
    [householdId, userId, 'parent']
  );

  return {
    headers: {
      authorization: `Bearer ${token}`
    }
  };
}
```

### Date Helpers
```typescript
import { addDays, format, getISOWeek } from 'date-fns';

function getOddWeekDate(): Date {
  // Returns a date in an odd ISO week
}

function getEvenWeekDate(): Date {
  // Returns a date in an even ISO week
}
```

## Dependencies
- task-091 ✅ Must be complete (assignment-generator service)
- task-092 ✅ Must be complete (API endpoints)
- Vitest testing framework ✅ Installed
- Test database ✅ Available

## Testing Strategy
- Use test database (not production)
- Isolate each test (no shared state)
- Clean up after each test (prevent pollution)
- Test positive and negative cases
- Test authorization at API level
- Test business logic at service level

## Files to Create
- `apps/backend/src/services/assignment-generator.test.ts`
- `apps/backend/src/routes/assignments.test.ts`

## Coverage Goals
- Assignment Generator Service: 90%+ line coverage
- Assignment API Routes: 85%+ line coverage
- All rule type branches covered

## Progress Log
- [2025-12-19] Task created for feature-014 breakdown
