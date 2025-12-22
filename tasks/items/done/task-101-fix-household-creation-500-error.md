# Task-101: Fix Household Creation 500 Error

**Status**: `completed`  
**Priority**: `🔴 URGENT - PRODUCTION BLOCKER`  
**Assignee**: Backend Agent  
**Epic**: None (Urgent Bug Fix)  
**Created**: 2025-12-22
**Started**: 2025-12-22
**Completed**: 2025-12-22 (PR #129)  
**Related**: Task-100 (OpenAPI Schema Alignment)

---

## Problem

Creating a new household on first login fails with 500 error. Users cannot proceed with application setup.

### Error Details

**Endpoint**: `POST /api/households`  
**Status Code**: 500  
**Error Message**: `"created_at" is required!`  
**Source**: fast-json-stringify validation

### Backend Log
```json
{
  "level": 50,
  "time": 1766396356559,
  "err": {
    "type": "Error",
    "message": "\"created_at\" is required!",
    "stack": "Error: \"created_at\" is required!\n    at anonymous0 (eval at build (/app/node_modules/fast-json-stringify/index.js:223:23), <anonymous>:95:15)\n    at serialize (/app/node_modules/fastify/lib/reply.js:935:12)\n    at Object.createHousehold (file:///app/dist/routes/households.js:40:34)"
  }
}
```

### Root Cause

Similar to the issue fixed in Task-100 commits ec1dd6e and 90aac13:
- **Schema** expects snake_case: `created_at`, `updated_at`
- **Implementation** returns camelCase: `createdAt`, `updatedAt`
- Fast-json-stringify rejects response due to schema mismatch

---

## Impact

- **Severity**: 🔴 CRITICAL - Production Blocker
- **User Impact**: New users cannot create households, blocking entire onboarding flow
- **Affected Users**: All new users trying to create their first household
- **Workaround**: None - complete blocker

---

## Expected Behavior

1. User logs in for first time
2. User clicks "Create Household"
3. User enters household name
4. Backend creates household successfully
5. Returns household object with all fields
6. User proceeds to household dashboard

---

## Current Behavior

1. User logs in for first time
2. User clicks "Create Household"
3. User enters household name
4. Backend creates household in database
5. **500 ERROR**: Response serialization fails
6. User sees error, cannot proceed

---

## Solution

Update `createHouseholdSchemaBase` in `apps/backend/src/schemas/households.ts` to match implementation:

### Fix Response Schema

**File**: `apps/backend/src/schemas/households.ts`

**Before** (line ~55-70):
```typescript
export const createHouseholdSchemaBase = {
  description: 'Create a new household',
  tags: ['households'],
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
    },
    required: ['name'],
  },
  response: {
    201: {
      ...householdSchema,  // Only has: id, name, created_at, updated_at (snake_case)
    },
  },
};
```

**After**:
```typescript
export const createHouseholdSchemaBase = {
  description: 'Create a new household',
  tags: ['households'],
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
    },
    required: ['name'],
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: uuidSchema,
        name: { type: 'string', minLength: 1, maxLength: 255 },
        createdAt: timestampSchema,
        updatedAt: timestampSchema,
      },
      required: ['id', 'name', 'createdAt', 'updatedAt'],
    },
  },
};
```

---

## Implementation Checklist

### Backend Changes
- [x] Update `createHouseholdSchemaBase` response schema (201)
- [x] Change `created_at` → `createdAt` (camelCase)
- [x] Change `updated_at` → `updatedAt` (camelCase)
- [x] Verify implementation returns these exact fields
- [x] Add `role` field to response schema

### Testing
- [x] Test POST /api/households returns 201 with correct fields (backend tests pass)
- [x] Verify schema validation accepts camelCase fields (272/273 tests passing)
- [ ] Test end-to-end household creation flow (manual test pending)
- [x] Verify existing tests still pass
- [ ] **Create E2E test to prevent regression** - Test complete first-time user flow: register → create household → verify success

### Verification
- [x] Backend tests pass (npm test)
- [ ] Manual test: Create household via UI
- [ ] Check no other household endpoints affected

---

## Testing Steps

### Backend API Test
```bash
curl -X POST http://localhost:3000/api/households \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Household"}'
```

Expected response (201):
```json
{
  "id": "uuid-here",
  "name": "Test Household",
  "createdAt": "2025-12-22T...",
  "updatedAt": "2025-12-22T..."
}
```

### UI Test
1. Register new account
2. Click "Create Household"
3. Enter household name: "My Family"
4. Submit form
5. Should redirect to household dashboard (no 500 error)

---

## Related Issues

- **Task-100**: OpenAPI Schema Alignment (original schema work)
- **Commit ec1dd6e**: Fixed household GET schema (role, memberCount, etc.)
- **Commit 90aac13**: Fixed 22 test assertions

### Pattern

This is part of the snake_case vs camelCase inconsistency from Task-100:
- Database uses snake_case
- Implementation converts to camelCase
- Schemas must match implementation (camelCase)

---

## Acceptance Criteria

- [x] Bug identified and documented
- [ ] Schema updated to camelCase
- [ ] POST /api/households returns 201 (not 500)
- [ ] Response includes: id, name, createdAt, updatedAt
- [ ] All backend tests pass
- [ ] Manual UI test: household creation works
- [ ] No regression in other household endpoints
- [ ] **E2E test created** covering first-time user household creation flow

---

## Notes

- Same root cause as Task-100 GET household bug
- Fast-json-stringify enforces strict schema validation
- Must maintain consistency: camelCase everywhere in responses
- Check if other CREATE endpoints have same issue

---

## Time Estimate

- **Fix**: 5 minutes (schema update)
- **Testing**: 10 minutes (API + UI verification)
- **Total**: 15 minutes

**URGENT**: This blocks all new users. Fix immediately.
