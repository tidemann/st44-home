# Task-102: Fix Household List Endpoint Schema Mismatch

**Status**: `in-progress`  
**Priority**: `🔴 CRITICAL - PRODUCTION BLOCKER`  
**Assignee**: Backend Agent  
**Epic**: None (Urgent Bug Fix)  
**Created**: 2025-12-22
**Started**: 2025-12-22  
**Related**: Task-100, Task-101 (OpenAPI Schema Alignment)

---

## Problem

After successful login, the household selector is stuck on "Loading" indefinitely. Users cannot select a household to proceed with the application.

### Symptoms

- User logs in successfully
- Household selector shows "Loading..." spinner
- Never completes loading
- Frontend receives valid data from backend but cannot parse it
- Application unusable - complete blocker

### API Response (Actual)

**Endpoint**: `GET /api/households`  
**Status**: 200 OK  
**Body**: 
```json
[
  {
    "id": "7d01c7be-33d4-46ac-8bf2-3fee5cbe66f2",
    "name": "grs",
    "created_at": "2025-12-16T13:57:10.247Z",
    "updated_at": "2025-12-16T13:57:10.247Z",
    "role": "admin"
  },
  {
    "id": "bc103a55-1036-4c16-ae63-784dbad7c6f2",
    "name": "gea",
    "created_at": "2025-12-16T13:56:40.429Z",
    "updated_at": "2025-12-16T13:56:40.429Z",
    "role": "admin"
  }
]
```

### Root Cause

**Schema mismatch - same as Task-100 and Task-101**:
- **API returns**: snake_case (`created_at`, `updated_at`)
- **Frontend expects**: camelCase (`createdAt`, `updatedAt`)
- **Implementation returns**: Database columns directly without transformation
- **Schema defines**: snake_case matching database

The LIST endpoint (`GET /api/households`) is returning database column names (snake_case) instead of the camelCase format expected by the frontend.

---

## Impact

- **Severity**: 🔴 CRITICAL - Production Blocker
- **User Impact**: Existing users cannot access any household features after login
- **Affected Users**: ALL users with existing households
- **Workaround**: None - complete application blocker
- **Data Loss**: No, but complete feature lockout

---

## Expected Behavior

1. User logs in
2. GET /api/households returns household list in **camelCase**
3. Frontend parses response successfully
4. Household selector displays available households
5. User can select a household and proceed

### Expected Response Format
```json
[
  {
    "id": "7d01c7be-33d4-46ac-8bf2-3fee5cbe66f2",
    "name": "grs",
    "createdAt": "2025-12-16T13:57:10.247Z",
    "updatedAt": "2025-12-16T13:57:10.247Z",
    "role": "admin"
  }
]
```

---

## Current Behavior

1. User logs in
2. GET /api/households returns household list in **snake_case**
3. Frontend fails to parse `created_at`/`updated_at` (expects camelCase)
4. Household selector stuck showing "Loading..."
5. User cannot proceed - application unusable

---

## Solution

### Fix 1: Update Implementation to Transform Response

**File**: `apps/backend/src/routes/households.ts`

Transform database results to camelCase before returning:

```typescript
// BEFORE (returns raw database columns)
async function listHouseholds(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  
  const result = await pool.query(
    `SELECT h.id, h.name, h.created_at, h.updated_at, hm.role
     FROM households h
     INNER JOIN household_members hm ON h.id = hm.household_id
     WHERE hm.user_id = $1
     ORDER BY h.created_at DESC`,
    [userId]
  );
  
  return reply.status(200).send(result.rows);  // ❌ Returns snake_case
}

// AFTER (transforms to camelCase)
async function listHouseholds(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  
  const result = await pool.query(
    `SELECT h.id, h.name, h.created_at, h.updated_at, hm.role
     FROM households h
     INNER JOIN household_members hm ON h.id = hm.household_id
     WHERE hm.user_id = $1
     ORDER BY h.created_at DESC`,
    [userId]
  );
  
  // Transform to camelCase
  const households = result.rows.map(row => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    role: row.role,
  }));
  
  return reply.status(200).send(households);  // ✅ Returns camelCase
}
```

### Fix 2: Update Schema to Match CamelCase

**File**: `apps/backend/src/schemas/households.ts`

```typescript
// Update listHouseholdsSchemaBase response
export const listHouseholdsSchemaBase = {
  description: 'List all households for the authenticated user',
  tags: ['households'],
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: uuidSchema,
          name: { type: 'string', minLength: 1, maxLength: 255 },
          createdAt: timestampSchema,  // ✅ camelCase
          updatedAt: timestampSchema,  // ✅ camelCase
          role: { type: 'string', enum: ['admin', 'parent', 'child'] },
        },
        required: ['id', 'name', 'createdAt', 'updatedAt', 'role'],
      },
    },
  },
};
```

---

## Implementation Checklist

### Backend Changes
- [ ] Update `listHouseholds` handler to transform response to camelCase
- [ ] Update `listHouseholdsSchemaBase` schema to use camelCase properties
- [ ] Ensure consistency: all list endpoints return camelCase
- [ ] Verify no other list endpoints have same issue

### Testing
- [ ] Test GET /api/households returns 200 with camelCase fields
- [ ] Verify frontend parses response successfully
- [ ] Test household selector displays and works
- [ ] Verify existing backend tests pass (update if needed)
- [ ] **Create E2E test**: Login → household selector loads → select household → success

### Verification
- [ ] Backend tests pass (npm test)
- [ ] Manual test: Login and select household via UI
- [ ] Check no regression in other household endpoints
- [ ] Verify all list endpoints use consistent casing

---

## Testing Steps

### Backend API Test
```bash
# Get auth token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.accessToken')

# Test list households
curl -X GET http://localhost:3000/api/households \
  -H "Authorization: Bearer $TOKEN"
```

Expected response (200):
```json
[
  {
    "id": "uuid-here",
    "name": "My Household",
    "createdAt": "2025-12-22T...",
    "updatedAt": "2025-12-22T...",
    "role": "admin"
  }
]
```

### UI Test
1. Login with existing account that has households
2. Observe household selector
3. Should display list of households (not "Loading...")
4. Select a household
5. Should navigate to household dashboard successfully

---

## Related Issues

- **Task-100**: OpenAPI Schema Alignment (root cause - snake_case vs camelCase)
- **Commit ec1dd6e**: Fixed household GET endpoint schema (single household)
- **Task-101**: Fix household CREATE endpoint schema (POST /api/households)
- **Commit 90aac13**: Fixed 22 test assertion updates

### Pattern

This is the **third instance** of the same root cause:
1. ✅ **GET** /api/households/:id - Fixed in ec1dd6e
2. ⏳ **POST** /api/households - Task-101 (pending)
3. ⏳ **GET** /api/households - Task-102 (this task)

**Action Required**: Audit ALL endpoints for snake_case vs camelCase inconsistencies.

---

## Acceptance Criteria

- [x] Bug identified and documented
- [ ] Implementation transforms database results to camelCase
- [ ] Schema updated to match camelCase format
- [ ] GET /api/households returns camelCase fields
- [ ] Frontend household selector loads successfully
- [ ] All backend tests pass
- [ ] Manual UI test: household selector works
- [ ] **E2E test created** covering login → household selection flow
- [ ] **Audit completed**: All list endpoints checked for consistency

---

## Additional Actions

### Comprehensive Audit Needed

Check these endpoints for same issue:
- [ ] GET /api/children (if exists)
- [ ] GET /api/tasks (if exists)
- [ ] GET /api/assignments (if exists)
- [ ] Any other list/collection endpoints

### Prevention

- [ ] Document standard: ALL API responses use camelCase
- [ ] Create helper function for database-to-API transformation
- [ ] Update code review checklist to verify casing consistency
- [ ] Add lint rule or test helper to catch snake_case in responses

---

## Notes

- **CRITICAL**: This blocks ALL existing users from using the application
- Combined with Task-101 (CREATE household), new AND existing users are blocked
- Must fix immediately alongside Task-101
- Consider implementing global response transformation middleware
- This suggests need for systematic approach to database ↔ API mapping

---

## Time Estimate

- **Fix**: 10 minutes (transform + schema update)
- **Testing**: 15 minutes (API + UI verification)
- **Audit**: 20 minutes (check other endpoints)
- **E2E Test**: 15 minutes (create test)
- **Total**: 60 minutes

**URGENCY**: Fix immediately - blocks entire application for all users with households.
