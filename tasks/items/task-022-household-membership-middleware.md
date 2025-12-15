# Task: Implement Household Membership Validation Middleware

## Metadata
- **ID**: task-022
- **Feature**: feature-003 - Household Management
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: completed
- **Priority**: high
- **Created**: 2025-12-14
- **Assigned Agent**: backend
- **Estimated Duration**: 2-3 hours
- **Actual Duration**: 1 hour

## Description
Create reusable Fastify middleware to validate household membership and role requirements. This middleware will be used across all household-scoped endpoints to ensure users can only access data from households they belong to, and that role-based actions (admin-only) are properly enforced.

## Requirements
- Middleware to check if user is a member of specified household
- Middleware to check if user has specific role (admin, parent)
- Extract household_id from route parameters
- Attach household membership info to request context
- Return 403 if user lacks required membership/role
- Reusable across all household-scoped endpoints

## Acceptance Criteria
- [ ] validateHouseholdMembership middleware created
- [ ] requireHouseholdRole middleware created (admin, parent)
- [ ] Middleware extracts household_id from route params
- [ ] Database query checks household_members table
- [ ] 403 Forbidden returned for non-members
- [ ] 403 Forbidden returned for insufficient role
- [ ] Request context includes household role for downstream use
- [ ] Middleware is composable (can chain with auth middleware)
- [ ] Proper error handling and logging

## Dependencies
- feature-001: authenticateUser middleware
- feature-002: household_members table schema

## Technical Notes

### Middleware: validateHouseholdMembership
```typescript
// apps/backend/src/middleware/household-membership.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database';

/**
 * Validates that authenticated user is a member of the household
 * specified in route params. Attaches role to request context.
 */
export async function validateHouseholdMembership(
  request: FastifyRequest<{ Params: { householdId: string } }>,
  reply: FastifyReply
) {
  const { householdId } = request.params;
  const userId = request.user?.id;

  if (!userId) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  if (!isValidUuid(householdId)) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Invalid household ID format'
    });
  }

  try {
    const result = await db.query(
      'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
      [householdId, userId]
    );

    if (result.rows.length === 0) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have access to this household'
      });
    }

    // Attach household role to request context
    request.householdRole = result.rows[0].role;
    
  } catch (error) {
    request.log.error(error, 'Failed to validate household membership');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to validate household access'
    });
  }
}
```

### Middleware: requireHouseholdRole
```typescript
/**
 * Validates that authenticated user has specific role in household.
 * Must be used after validateHouseholdMembership.
 */
export function requireHouseholdRole(requiredRole: 'admin' | 'parent') {
  return async function(request: FastifyRequest, reply: FastifyReply) {
    const userRole = request.householdRole;

    if (!userRole) {
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Household membership not validated'
      });
    }

    // Admin has all permissions
    if (userRole === 'admin') {
      return;
    }

    // Check specific role requirement
    if (userRole !== requiredRole) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `This action requires ${requiredRole} role`
      });
    }
  };
}
```

### Type Extension
```typescript
// Extend FastifyRequest to include household context
declare module 'fastify' {
  interface FastifyRequest {
    householdRole?: 'admin' | 'parent';
  }
}
```

### Usage Examples
```typescript
// Require membership (any role)
server.get('/api/households/:householdId/children', {
  preHandler: [authenticateUser, validateHouseholdMembership]
}, getChildren);

// Require admin role
server.put('/api/households/:householdId', {
  preHandler: [
    authenticateUser,
    validateHouseholdMembership,
    requireHouseholdRole('admin')
  ]
}, updateHousehold);

// Require parent or admin role
server.post('/api/households/:householdId/children', {
  preHandler: [
    authenticateUser,
    validateHouseholdMembership,
    requireHouseholdRole('parent')
  ]
}, createChild);
```

### Database Query
```sql
-- Check membership and get role
SELECT role FROM household_members
WHERE household_id = $1 AND user_id = $2;

-- Returns:
-- - Empty result (no membership) → 403
-- - One row with role ('admin' | 'parent') → Continue
```

### Error Handling
- 400: Invalid household ID format (not UUID)
- 401: User not authenticated (missing request.user)
- 403: User not a member of household
- 403: User lacks required role
- 500: Database error during membership check

## Affected Areas
- [ ] Database (PostgreSQL)
- [x] Backend (Fastify/Node.js)
- [ ] Frontend (Angular)
- [ ] Infrastructure (Docker/Nginx)
- [ ] CI/CD
- [ ] Documentation

## Implementation Plan

### Step 1: Create Middleware File
1. Create `src/middleware/household-membership.ts`
2. Import FastifyRequest, FastifyReply types
3. Import database connection

### Step 2: Implement validateHouseholdMembership
1. Extract householdId from route params
2. Extract userId from request.user (authenticated)
3. Validate householdId is valid UUID
4. Query household_members table
5. Return 403 if no membership found
6. Attach role to request context

### Step 3: Implement requireHouseholdRole
1. Create factory function accepting required role
2. Return middleware function
3. Check request.householdRole exists
4. Admin always passes
5. Check user role matches required role
6. Return 403 if insufficient role

### Step 4: Type Extensions
1. Extend FastifyRequest interface
2. Add householdRole?: 'admin' | 'parent'
3. Ensure TypeScript compilation works

### Step 5: Utility Functions
1. Create isValidUuid helper function
2. Add to shared utilities

### Step 6: Integration
1. Import in routes files
2. Apply to household-scoped endpoints
3. Chain with authenticateUser middleware

### Step 7: Testing
1. Test membership validation (member, non-member)
2. Test role requirements (admin, parent, insufficient)
3. Test invalid household IDs
4. Test unauthenticated requests
5. Test database errors

## Testing Strategy
- Unit tests for middleware functions
- Integration tests with routes
- Test membership validation (happy path, non-member)
- Test role validation (admin, parent, insufficient)
- Test error cases (invalid UUID, missing user, db error)
- Test middleware chaining
- Test request context attachment

## Progress Log
- [2025-12-14 16:45] Task created from feature-003 breakdown
- [2025-12-14 18:15] Started implementation - created feature branch
- [2025-12-14 18:30] Created household-membership.ts with three middleware functions
- [2025-12-14 18:45] Updated household routes to use new middleware
- [2025-12-14 19:00] Created comprehensive test script (6 test scenarios)
- [2025-12-14 19:15] All tests passing ✅
- [2025-12-14 19:20] PR #57 created and CI passed (frontend + backend)
- [2025-12-14 19:25] PR #57 merged successfully
- [2025-12-14 19:25] Task completed in 1 hour (vs 2-3 hours estimated)

## Related Files
- `apps/backend/src/middleware/household-membership.ts` - New file
- `apps/backend/src/middleware/auth.ts` - Existing auth middleware
- `apps/backend/src/routes/households.ts` - Will use this middleware
- `apps/backend/src/routes/children.ts` - Will use this middleware

## Lessons Learned
- Composable middleware pattern is very clean and testable
- FastifyRequest can be extended with TypeScript declaration merging  
- UUID validation at middleware level prevents downstream errors
- Middleware chaining (auth → membership → role) provides layered security
- Test-driven approach caught several edge cases early
- Actual time: 1 hour vs estimated 2-3 hours (50% faster due to clear acceptance criteria)
