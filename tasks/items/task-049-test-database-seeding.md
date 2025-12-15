# Task: Create Test Database Seeding and Reset Utilities

## Metadata
- **ID**: task-049
- **Feature**: feature-010 - Local E2E Test Execution Environment
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: pending
- **Priority**: medium
- **Created**: 2025-12-15
- **Assigned Agent**: database + testing
- **Estimated Duration**: 3-4 hours

## Description
Create utility functions and SQL scripts for seeding the test database with realistic test data and resetting it to a clean state. These utilities allow developers to quickly set up specific test scenarios, reset between test runs, and ensure consistent test data. This is essential for reliable local E2E testing and reduces test setup boilerplate.

## Requirements
- TypeScript utility functions for programmatic test data creation
- SQL seed files for common test scenarios
- Database reset function to clean all test data
- Functions to create: test users, households, household members, children, tasks
- Idempotent seed scripts (safe to run multiple times)
- Transaction support for atomic operations
- Clear error messages and logging

## Acceptance Criteria
- [ ] `apps/frontend/e2e/helpers/seed-database.ts` created with utility functions
- [ ] SQL seed files in `docker/postgres/test-seeds/` directory
- [ ] `seedTestUser()` function creates user with email and password
- [ ] `seedTestHousehold()` function creates household with members
- [ ] `seedTestChildren()` function creates child records
- [ ] `seedTestTasks()` function creates task data
- [ ] `resetDatabase()` function cleans all test data
- [ ] `seedFullScenario()` function creates complete test environment
- [ ] All functions use transactions for atomicity
- [ ] Functions return created entity IDs for use in tests
- [ ] Documentation with examples of usage

## Dependencies
- `docker/postgres/init.sql` schema (exists ✅)
- pg database client library (installed ✅)
- Test database accessible on port 5433 (task-046)

## Technical Notes

### Database Connection
Use existing pg pool configuration from test helpers:
```typescript
import { pool } from './test-helpers';
```

### Utility Functions Design

**apps/frontend/e2e/helpers/seed-database.ts:**

```typescript
/**
 * Create a test user
 */
export async function seedTestUser(data: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ userId: string; email: string }> {
  // Hash password with bcrypt
  // Insert into users table
  // Return user ID and email
}

/**
 * Create a test household with owner
 */
export async function seedTestHousehold(data: {
  name: string;
  ownerId: string;
}): Promise<{ householdId: string; name: string }> {
  // Insert into households table
  // Insert owner into household_members
  // Return household ID
}

/**
 * Add member to household
 */
export async function addHouseholdMember(data: {
  householdId: string;
  userId: string;
  role: 'parent' | 'child';
}): Promise<{ memberId: string }> {
  // Insert into household_members
  // Return member ID
}

/**
 * Create child in household
 */
export async function seedTestChild(data: {
  householdId: string;
  name: string;
  age: number;
}): Promise<{ childId: string }> {
  // Insert into children table
  // Return child ID
}

/**
 * Create tasks for household
 */
export async function seedTestTasks(data: {
  householdId: string;
  count: number;
}): Promise<{ taskIds: string[] }> {
  // Insert into tasks table
  // Return array of task IDs
}

/**
 * Reset database to clean state
 */
export async function resetDatabase(): Promise<void> {
  // Truncate all tables in reverse dependency order
  // Reset sequences
}

/**
 * Seed a complete test scenario
 */
export async function seedFullScenario(): Promise<{
  user: { userId: string; email: string };
  household: { householdId: string };
  children: { childId: string }[];
  tasks: { taskId: string }[];
}> {
  // Create user, household, children, tasks
  // Return all IDs for test usage
}
```

### SQL Seed Files

**docker/postgres/test-seeds/01-users.sql:**
```sql
-- Sample test users
INSERT INTO users (id, email, password_hash, created_at, updated_at)
VALUES 
  ('user-test-1', 'test1@example.com', '$2a$10$...', NOW(), NOW()),
  ('user-test-2', 'test2@example.com', '$2a$10$...', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
```

**docker/postgres/test-seeds/02-households.sql:**
```sql
-- Sample households and members
INSERT INTO households (id, name, created_at, updated_at)
VALUES 
  ('house-test-1', 'Test Family', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO household_members (id, household_id, user_id, role, joined_at)
VALUES 
  (gen_random_uuid(), 'house-test-1', 'user-test-1', 'parent', NOW())
ON CONFLICT DO NOTHING;
```

**docker/postgres/test-seeds/03-children.sql:**
```sql
-- Sample children
INSERT INTO children (id, household_id, name, age, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'house-test-1', 'Test Child 1', 8, NOW(), NOW()),
  (gen_random_uuid(), 'house-test-1', 'Test Child 2', 10, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
```

### Transaction Management

Wrap operations in transactions:
```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // Perform operations
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

### Password Hashing

Use bcrypt for consistent password hashing:
```typescript
import bcrypt from 'bcrypt';

const passwordHash = await bcrypt.hash(password, 10);
```

## Affected Areas
- [ ] Frontend (E2E helpers)
- [ ] Backend (none)
- [x] Database (seed scripts, utilities)
- [ ] Infrastructure (none)
- [ ] CI/CD (none)
- [x] Documentation

## Implementation Steps

1. **Create seed-database.ts**
   - Set up database connection using existing pool
   - Implement `resetDatabase()` function
   - Implement `seedTestUser()` function
   - Implement `seedTestHousehold()` function
   - Implement `addHouseholdMember()` function
   - Implement `seedTestChild()` function
   - Implement `seedTestTasks()` function
   - Implement `seedFullScenario()` function

2. **Add Transaction Support**
   - Wrap operations in BEGIN/COMMIT blocks
   - Add error handling and ROLLBACK
   - Release connections properly

3. **Add Password Hashing**
   - Install/import bcrypt
   - Hash passwords consistently
   - Use same salt rounds as production (10)

4. **Create SQL Seed Files**
   - Create `docker/postgres/test-seeds/` directory
   - Create `01-users.sql` with sample users
   - Create `02-households.sql` with sample households
   - Create `03-children.sql` with sample children
   - Make scripts idempotent (ON CONFLICT DO NOTHING)

5. **Add Reset Functionality**
   - Truncate tables in reverse dependency order
   - Reset sequences to start values
   - Handle foreign key constraints

6. **Test Utility Functions**
   - Test each function individually
   - Test full scenario creation
   - Test reset cleans everything
   - Test idempotency (running twice is safe)
   - Test with real database

7. **Create Documentation**
   - Document each utility function
   - Add usage examples
   - Document SQL seed file structure
   - Add tips for test data management

8. **Update Existing Tests**
   - Refactor tests to use new utilities
   - Remove duplicate seed code
   - Show best practices

## Progress Log
- [2025-12-15 15:05] Task created by Planner Agent

## Testing Strategy
- Unit tests for each utility function
- Integration tests with real database
- Test idempotency (run seeds twice)
- Test transaction rollback on errors
- Manual testing with different scenarios

## Related PRs
- TBD

## Lessons Learned
[To be filled after completion]
