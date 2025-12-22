# Task-103: Fix Household Members 500 Error and Improve Error UX

**Status**: completed  
**Priority**: critical  
**Epic**: epic-002 (Task Management Core)  
**Feature**: feature-006 (Testing Infrastructure)  
**Created**: 2025-12-22  
**Completed**: 2025-12-22
**Time Estimate**: 30 minutes  

## Problem

Two related issues in the household settings page:

### Issue 1: API 500 Error (Backend)
- **Endpoint**: `GET /api/households/:householdId/members`
- **Error**: Returns 500 status code
- **Root Cause**: Schema mismatch between implementation and OpenAPI schema
- **Impact**: 🔴 Users cannot view household members in settings page

### Issue 2: Misleading Error Message (Frontend)
- **Current Behavior**: Shows "No members found" when API fails
- **Problem**: Users think there are no members, when actually the API is failing
- **Impact**: Poor UX - doesn't communicate that there's a server error

## Root Cause Analysis

### Backend Schema Mismatch

**OpenAPI Schema** (`apps/backend/src/schemas/households.ts` lines 201-216):
```typescript
response: {
  200: {
    description: 'List of household members',
    type: 'array',  // ❌ Expects array
    items: {
      type: 'object',
      properties: {
        user_id: uuidSchema,
        email: { type: 'string', format: 'email' },
        role: { type: 'string', enum: ['admin', 'parent', 'child'] },
        joined_at: timestampSchema,
      },
    },
  },
```

**Implementation** (`apps/backend/src/routes/households.ts` lines 395-401):
```typescript
return reply.send({
  members: result.rows.map((row: unknown) => ({  // ❌ Returns object with 'members' property
    user_id: (row as { user_id: number }).user_id,
    email: (row as { email: string }).email,
    display_name: null,
    role: (row as { role: string }).role,
    joined_at: (row as { joined_at: Date }).joined_at,
  })),
});
```

**Error**: Fast-json-stringify cannot serialize object when schema expects array → 500 error

### Frontend Error Handling

**Template** (`household-settings.html` line 110):
```html
} @else {
  <p class="empty-state">No members found.</p>
}
```

**Problem**: This displays when `members().length === 0`, but also when API fails and throws error (caught in component, members remains empty array). User can't distinguish between "no members exist" and "API failed".

## Solution

### Backend Fix: Return Array Directly

**File**: `apps/backend/src/routes/households.ts`  
**Function**: `getHouseholdMembers` (lines 375-410)

Change from:
```typescript
return reply.send({
  members: result.rows.map(...)
});
```

To:
```typescript
return reply.send(
  result.rows.map((row: unknown) => ({
    user_id: (row as { user_id: number }).user_id,
    email: (row as { email: string }).email,
    display_name: null,
    role: (row as { role: string }).role,
    joined_at: (row as { joined_at: Date }).joined_at,
  }))
);
```

### Frontend Fix: Improve Error Messages

**File**: `apps/frontend/src/app/components/household-settings/household-settings.ts`

Add new signal for members loading error:
```typescript
membersError = signal<string | null>(null);
```

Update `loadHouseholdData()` to catch members API failure separately:
```typescript
// Load members
try {
  const members = await this.householdService.getHouseholdMembers(householdId);
  this.members.set(members);
  this.membersError.set(null);
} catch (error) {
  this.membersError.set('Failed to load household members. Please refresh the page.');
  console.error('Failed to load members:', error);
}
```

**File**: `apps/frontend/src/app/components/household-settings/household-settings.html`

Update template to show appropriate message:
```html
} @else {
  @if (membersError()) {
    <p class="empty-state error">{{ membersError() }}</p>
  } @else {
    <p class="empty-state">No members found.</p>
  }
}
```

## Testing

### Backend Testing

**1. Update Unit Test** (`apps/backend/src/routes/households.test.ts`):
```typescript
describe('GET /api/households/:id/members', () => {
  it('should return array of members', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/api/households/${householdId}/members`,
      headers: { cookie: `session=${sessionToken}` },
    });
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(Array.isArray(body)).toBe(true);  // ✅ Check it's an array
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('user_id');
    expect(body[0]).toHaveProperty('email');
    expect(body[0]).toHaveProperty('role');
    expect(body[0]).toHaveProperty('joined_at');
  });
});
```

**2. Manual API Test**:
```powershell
# Should return array directly, not wrapped in object
Invoke-RestMethod -Uri "http://localhost:3000/api/households/{id}/members" `
  -Headers @{Cookie="session=..."}
```

Expected response:
```json
[
  {
    "user_id": "uuid",
    "email": "user@example.com",
    "display_name": null,
    "role": "admin",
    "joined_at": "2025-12-16T13:57:10.247Z"
  }
]
```

### Frontend Testing

**1. Manual UI Test - Error State**:
- Open household settings
- Use browser DevTools Network tab to force API failure (throttle/offline)
- Verify error message shows: "Failed to load household members"
- Not: "No members found"

**2. Manual UI Test - Success State**:
- Open household settings with working API
- Verify members list displays correctly
- Verify no error message shown

**3. Manual UI Test - Empty State**:
- Create household with no additional members
- Verify shows: "No members found" (valid empty state)

### E2E Testing

Create E2E test covering this flow:
```typescript
test('household settings shows members list', async ({ page }) => {
  await loginAsUser(page);
  await page.goto('/household/settings');
  
  // Should see members section
  await expect(page.locator('section').filter({ hasText: 'Members' })).toBeVisible();
  
  // Should see at least current user in list
  await expect(page.locator('ul li').first()).toBeVisible();
  
  // Should NOT see error message
  await expect(page.locator('.empty-state.error')).not.toBeVisible();
});

test('household settings shows error when API fails', async ({ page, context }) => {
  await loginAsUser(page);
  
  // Intercept API and force 500 error
  await context.route('**/api/households/*/members', route => 
    route.fulfill({ status: 500 })
  );
  
  await page.goto('/household/settings');
  
  // Should see error message
  await expect(page.locator('.empty-state.error')).toContainText('Failed to load');
  
  // Should NOT see generic "No members found"
  await expect(page.locator('.empty-state').filter({ hasText: 'No members found' }))
    .not.toBeVisible();
});
```

## Acceptance Criteria

- [ ] Backend returns array of members directly (not wrapped in object)
- [ ] API test validates response is an array
- [ ] Frontend catches member loading errors separately
- [ ] Error message distinguishes between "API failed" and "no members"
- [ ] Manual testing confirms members list displays correctly
- [ ] Manual testing confirms error state shows appropriate message
- [ ] E2E test created covering both success and error scenarios
- [ ] All unit tests passing (npm test in backend)
- [ ] Household settings page functional

## Related Issues

**Pattern**: Fourth instance of schema mismatch issues:
1. ✅ Task-100: GET /api/households/:id - Fixed (commit ec1dd6e)
2. ⏳ Task-101: POST /api/households - Pending fix
3. ⏳ Task-102: GET /api/households - Pending fix
4. ⏳ Task-103: GET /api/households/:id/members - **Current task**

**Recommendation**: After fixing Task-101, 102, 103, perform systematic audit of all API endpoints to identify any remaining schema mismatches before they reach production.

## Implementation Notes

- Backend fix is simple: remove object wrapper, return array directly
- Frontend fix requires separate error handling for members API
- Consider adding loading state for members section separately from main page loading
- Both fixes are independent and can be implemented/tested separately
- Combined fix time: ~30 minutes

## Dependencies

- None (can be fixed immediately)
- Recommended: Fix after Task-101 and Task-102 for consistent pattern

## Files to Modify

**Backend**:
- `apps/backend/src/routes/households.ts` (getHouseholdMembers function, line ~395)
- `apps/backend/src/routes/households.test.ts` (update test assertion)

**Frontend**:
- `apps/frontend/src/app/components/household-settings/household-settings.ts` (add error handling)
- `apps/frontend/src/app/components/household-settings/household-settings.html` (update template)

**Tests**:
- `apps/frontend/e2e/features/household-settings.spec.ts` (create new E2E test)
