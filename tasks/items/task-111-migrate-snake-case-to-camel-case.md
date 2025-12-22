# Task: Migrate All snake_case to camelCase

## Status
pending

## Priority
high

## Feature
Codebase Consistency & Type Safety

## Epic
N/A

## Description
Migrate ALL snake_case properties, database columns, and API fields to camelCase across the entire codebase. This is a critical consistency improvement that will:
- Eliminate cognitive load from mixed naming conventions
- Reduce bugs from case mismatches
- Align with TypeScript/JavaScript standards
- Enable better type safety and autocompletion
- Improve developer experience

**CRITICAL**: This must be done carefully with proper migrations to avoid breaking production.

## Requirements

### 1. Database Migration
- Create migration scripts to rename ALL snake_case columns to camelCase
- Target tables: all tables (users, households, children, tasks, assignments, etc.)
- Use PostgreSQL column aliasing during transition period if needed
- Ensure migrations are idempotent and can be rolled back
- Test migrations on local database before committing

### 2. Backend Schema Migration
- Update ALL OpenAPI schemas in `apps/backend/src/schemas/` to use camelCase
- Update ALL Zod schemas (if using @st44/types) to use camelCase
- Update ALL TypeScript interfaces to use camelCase
- Update ALL SQL queries to use camelCase columns (or aliases)
- Remove snake_case comments claiming it's "convention"

### 3. Frontend Migration  
- Update ALL TypeScript interfaces to use camelCase
- Update ALL API service methods to expect camelCase responses
- Update ALL components that reference these properties
- Update ALL tests to use camelCase

### 4. API Migration
- Ensure ALL API requests use camelCase
- Ensure ALL API responses use camelCase
- Maintain backward compatibility if needed (support both during transition)
- Document breaking changes if any

## Current snake_case Locations

### Backend Schemas (`apps/backend/src/schemas/`)
- `assignments.ts`: task_id, child_id, completed_at, rule_type
- `common.ts`: created_at, updated_at, error_code
- `auth.ts`: access_token, refresh_token, expires_in
- All other schema files (children, households, tasks, etc.)

### Database (`docker/postgres/`)
- All table columns use snake_case
- Foreign key columns: child_id, task_id, household_id, user_id, etc.
- Timestamp columns: created_at, updated_at, completed_at
- Status columns: rule_type, etc.

### Frontend Services
- All API response types currently expect snake_case
- Need to update to camelCase expectations

## Acceptance Criteria

- [ ] Database migration scripts created and tested
  - [ ] All table columns renamed to camelCase
  - [ ] Foreign keys updated
  - [ ] Indexes maintained
  - [ ] Constraints preserved
  - [ ] Migration is idempotent
  - [ ] Rollback script exists

- [ ] Backend fully migrated to camelCase
  - [ ] All schemas use camelCase
  - [ ] All interfaces use camelCase
  - [ ] All SQL queries use camelCase columns
  - [ ] No snake_case in any new code
  - [ ] All existing snake_case converted

- [ ] Frontend fully migrated to camelCase
  - [ ] All service interfaces use camelCase
  - [ ] All components use camelCase
  - [ ] All tests use camelCase

- [ ] Type safety verified
  - [ ] `npm run type-check` passes in backend
  - [ ] `npm run build` succeeds in backend
  - [ ] `npm run build` succeeds in frontend
  - [ ] No TypeScript errors

- [ ] All tests passing
  - [ ] Backend tests pass with new camelCase
  - [ ] Frontend tests pass with new camelCase
  - [ ] E2E tests pass with new camelCase
  - [ ] Integration tests pass

- [ ] Documentation updated
  - [ ] Database schema docs reflect camelCase
  - [ ] API docs reflect camelCase
  - [ ] AGENTS.md files updated with new patterns
  - [ ] Migration guide documented

- [ ] Zero snake_case remaining
  - [ ] No snake_case in TypeScript code
  - [ ] No snake_case in database columns
  - [ ] No snake_case in API requests/responses
  - [ ] Search confirms: no _id, _at, _type patterns

## Dependencies
- Must be completed before any new features that add schemas
- Should coordinate with any in-flight PRs to avoid conflicts

## Technical Notes

### Migration Strategy

**Phase 1: Database Migration** (1-2 days)
1. Create comprehensive migration script
2. Test on local database copy
3. Verify all queries still work
4. Create rollback script
5. Document breaking changes

**Phase 2: Backend Migration** (1-2 days)
1. Update all schemas to camelCase
2. Update all queries to use camelCase columns
3. Update all interfaces
4. Run type-check and build
5. Test all endpoints manually

**Phase 3: Frontend Migration** (1 day)
1. Update all service interfaces
2. Update all component code
3. Run build and tests
4. Verify E2E tests pass

**Phase 4: Validation** (1 day)
1. Full test suite run
2. Manual testing of all features
3. Performance verification
4. Deploy to staging
5. Final production deployment

### SQL Migration Template

```sql
-- Migration: XXX_snake_case_to_camel_case
-- Description: Rename all snake_case columns to camelCase
-- Date: 2025-12-22

BEGIN;

-- Example: Users table
ALTER TABLE users 
  RENAME COLUMN created_at TO "createdAt";
  
ALTER TABLE users 
  RENAME COLUMN updated_at TO "updatedAt";

-- Example: Foreign keys
ALTER TABLE children 
  RENAME COLUMN household_id TO "householdId";

-- Repeat for all tables...

-- Update migration tracking
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('XXX', 'snake_case_to_camel_case', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

### Backward Compatibility (if needed)

Option 1: Column Aliases (temporary)
```typescript
// During transition, support both
SELECT 
  id,
  first_name as "firstName",
  created_at as "createdAt"
FROM users;
```

Option 2: Database Views (temporary)
```sql
-- Create view with camelCase names
CREATE VIEW users_camel AS
SELECT 
  id,
  first_name as "firstName",
  created_at as "createdAt"
FROM users;
```

### Risk Mitigation

**Risks**:
- Breaking production API if deployed incorrectly
- Breaking frontend if backend deployed first
- Data loss if migration has bugs
- Downtime during migration

**Mitigations**:
- Test thoroughly on local environment
- Create rollback scripts
- Deploy backend + frontend together (atomic deployment)
- Backup database before migration
- Deploy to staging first
- Use feature flags if needed
- Monitor error logs closely after deployment

## Implementation Plan

### Step 1: Audit Current State
- [ ] List all snake_case occurrences in backend
- [ ] List all snake_case occurrences in frontend
- [ ] List all snake_case columns in database
- [ ] Document current API contracts

### Step 2: Create Migration Scripts
- [ ] Write SQL migration script
- [ ] Write SQL rollback script
- [ ] Test migrations on local database
- [ ] Verify data integrity after migration

### Step 3: Update Backend
- [ ] Update all schemas to camelCase
- [ ] Update all queries to use camelCase
- [ ] Update all interfaces
- [ ] Run type-check, build, tests
- [ ] Fix any issues

### Step 4: Update Frontend
- [ ] Update all service interfaces
- [ ] Update all component code
- [ ] Run build and tests
- [ ] Fix any issues

### Step 5: Integration Testing
- [ ] Run full E2E test suite
- [ ] Manual testing of all features
- [ ] Verify no regressions

### Step 6: Documentation
- [ ] Update SCHEMA.md
- [ ] Update API documentation
- [ ] Update AGENTS.md files
- [ ] Create migration guide

### Step 7: Deployment
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Deploy to production (backend + frontend together)
- [ ] Monitor for errors
- [ ] Verify all features working

## Agent Assignment
- Database Agent: Create migration scripts
- Backend Agent: Update schemas, queries, interfaces
- Frontend Agent: Update services and components
- Orchestrator Agent: Coordinate migration phases

## Progress Log
- [2025-12-22 16:30] Task created by System Agent
- Status: Pending planner review and breakdown

---

**CRITICAL**: This task requires careful coordination. Do NOT start without a comprehensive plan and full test coverage.

