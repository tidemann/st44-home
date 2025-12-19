# Task: Fix Children CRUD API Routing Error

## Metadata
- **ID**: task-078
- **Feature**: Bug Fix (feature-003 - Household Management)
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: completed
- **Priority**: high
- **Created**: 2025-12-19
- **Assigned Agent**: backend
- **Estimated Duration**: 1-2 hours

## Description
Fix 404 error when attempting to add a child. The API request shows a double `/api/api/` path prefix suggesting either incorrect route registration or incorrect API base URL configuration.

## Problem
When trying to add a child, the request fails with:
```json
{
  "message": "Route GET:/api/api/households/71816d58-f8cd-4708-9342-f6d1a049ad28/children not found",
  "error": "Not Found",
  "statusCode": 404
}
```

**Issue**: The path shows `/api/api/households/...` (double `/api/`) instead of `/api/households/...`

## Root Cause Analysis
Potential causes:
1. **Frontend**: ChildrenService or HouseholdService making requests with `/api/` prefix when environment config already adds it
2. **Backend**: Routes not properly registered with correct prefix
3. **Proxy Configuration**: Development proxy adding extra `/api/` prefix
4. **Environment Config**: Base URL misconfigured in frontend

## Requirements

### Investigation
1. Check backend route registration for children endpoints
2. Verify frontend service API calls (ChildrenService)
3. Check environment configuration (frontend/src/environments/)
4. Review proxy configuration (proxy.conf.json)
5. Test actual registered routes in backend

### Fix Options
- **Option A**: Remove `/api/` prefix from frontend service calls (if environment already provides it)
- **Option B**: Fix backend route registration if incorrect
- **Option C**: Update environment config to not duplicate prefix

### Testing
- Verify GET `/api/households/:id/children` works
- Verify POST `/api/households/:id/children` works
- Test in both development and Docker environments
- Confirm no other routes have similar issues

## Acceptance Criteria
- [x] Children CRUD endpoints return 200/201 (not 404)
- [x] API path shows single `/api/` prefix (not double)
- [x] Can successfully add a child to household
- [x] Can list children for household
- [x] Can update child details
- [x] Can delete child
- [x] Works in both dev and Docker environments
- [x] No other routes affected by the fix

## Technical Notes

### Expected Routes (Backend)
```typescript
// Should be registered as:
GET    /api/households/:householdId/children
POST   /api/households/:householdId/children
PUT    /api/households/:householdId/children/:childId
DELETE /api/households/:householdId/children/:childId
```

### Frontend Service Check
```typescript
// ChildrenService - check if this adds /api/ incorrectly:
this.http.get(`/api/households/${householdId}/children`)
// vs
this.http.get(`${environment.apiUrl}/households/${householdId}/children`)
```

### Environment Config Check
```typescript
// environment.development.ts
export const environment = {
  apiUrl: '' // Should be empty string (proxy handles /api)
};

// vs incorrect:
export const environment = {
  apiUrl: '/api' // Would cause double /api/api/
};
```

## Files to Check
- `apps/backend/src/server.ts` - Route registration
- `apps/backend/src/routes/children.ts` - Children routes (if exists)
- `apps/frontend/src/app/services/children.service.ts` - API calls
- `apps/frontend/src/app/services/household.service.ts` - May also call children endpoints
- `apps/frontend/src/environments/environment.development.ts` - API URL config
- `apps/frontend/proxy.conf.json` - Proxy configuration

## Related Issues
- This affects core functionality (adding children to household)
- Blocks user from setting up household properly
- May affect other household-related operations

## Progress Log
- [2025-12-19 11:15] Task created based on user-reported bug
- [2025-12-19] Status changed to in-progress, investigating root cause
- [2025-12-19] Root cause found: ApiService has baseUrl = `${environment.apiUrl}/api`
- [2025-12-19] ChildrenService adds `/api/` prefix, causing double `/api/api/`
- [2025-12-19] Fix: Remove `/api/` prefix from ChildrenService endpoint calls
- [2025-12-19] PR #100 created and merged successfully
- [2025-12-19] CI checks passed (frontend + backend)
- [2025-12-19] Task completed - Children CRUD routing fixed
