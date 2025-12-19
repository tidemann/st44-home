# Task: Assignment Management API Endpoints

## Metadata
- **ID**: task-092
- **Feature**: [feature-014-task-assignment-rule-engine](../features/feature-014-task-assignment-rule-engine.md)
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-19
- **Assigned Agent**: backend-agent
- **Estimated Duration**: 4-5 hours

## Description
Create API endpoints for manually triggering assignment generation (for testing/admin) and viewing generated assignments for a household.

## Requirements

### Endpoint 1: Manual Assignment Generation
```
POST /api/admin/tasks/generate-assignments
```

**Request Body:**
```json
{
  "householdId": "uuid",
  "startDate": "2025-12-19",
  "days": 7
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "result": {
    "created": 15,
    "skipped": 3,
    "errors": []
  }
}
```

**Authorization:**
- Requires authentication
- User must be admin or parent role
- User must be member of target household

**Validation:**
- householdId: required, valid UUID
- startDate: required, valid date (YYYY-MM-DD)
- days: required, integer 1-30 (prevent excessive generation)

### Endpoint 2: View Household Assignments
```
GET /api/households/:householdId/assignments?date=2025-12-19&days=7
```

**Query Parameters:**
- `date`: Starting date (YYYY-MM-DD), defaults to today
- `days`: Number of days (1-30), defaults to 7

**Response:** 200 OK
```json
{
  "assignments": [
    {
      "id": "uuid",
      "task_id": "uuid",
      "task_name": "Take out trash",
      "child_id": "uuid",
      "child_name": "Emma",
      "date": "2025-12-19",
      "status": "pending",
      "created_at": "2025-12-18T02:00:00Z"
    }
  ],
  "total": 42
}
```

**Authorization:**
- Requires authentication  
- User must be member of household
- Returns only assignments for user's household

**Data Join:**
- Join with tasks table for task_name
- Join with children table for child_name
- Order by date ASC, child_name ASC

## Acceptance Criteria
- [ ] POST /api/admin/tasks/generate-assignments endpoint exists
- [ ] Generation endpoint validates householdId format
- [ ] Generation endpoint validates date format
- [ ] Generation endpoint restricts days to 1-30
- [ ] Generation endpoint requires authentication
- [ ] Generation endpoint checks household membership
- [ ] Generation endpoint calls assignment-generator service
- [ ] Generation endpoint returns created/skipped/errors counts
- [ ] GET /api/households/:id/assignments endpoint exists
- [ ] View endpoint accepts date and days query params
- [ ] View endpoint defaults date to today
- [ ] View endpoint defaults days to 7
- [ ] View endpoint joins task and child names
- [ ] View endpoint orders by date then child name
- [ ] View endpoint enforces household membership
- [ ] Both endpoints return proper error codes (400, 401, 403, 404)

## Technical Notes

### Route File Location
Create or extend `apps/backend/src/routes/assignments.ts`

### Authentication Middleware
```typescript
import { authenticateUser } from '../middleware/authenticate.js';
import { validateHouseholdMembership } from '../middleware/household-membership.js';

fastify.post('/api/admin/tasks/generate-assignments', {
  preHandler: [authenticateUser]
}, async (request, reply) => {
  // Implementation
});

fastify.get('/api/households/:householdId/assignments', {
  preHandler: [authenticateUser, validateHouseholdMembership]
}, async (request, reply) => {
  // Implementation
});
```

### Query Example (View Assignments)
```typescript
const query = `
  SELECT 
    ta.id,
    ta.task_id,
    t.name as task_name,
    ta.child_id,
    c.name as child_name,
    ta.date,
    ta.status,
    ta.created_at
  FROM task_assignments ta
  JOIN tasks t ON ta.task_id = t.id
  LEFT JOIN children c ON ta.child_id = c.id
  WHERE t.household_id = $1
    AND ta.date >= $2
    AND ta.date < $3
  ORDER BY ta.date ASC, c.name ASC
`;
```

### Error Handling
- 400: Invalid request body/query params
- 401: Not authenticated
- 403: Not member of household
- 404: Household not found
- 500: Server error during generation

## Dependencies
- task-091 ✅ Must be complete (assignment-generator service)
- Existing authenticate middleware
- Existing validateHouseholdMembership middleware

## Testing Strategy
- Integration tests in task-093 (separate task)
- Test authentication/authorization
- Test validation
- Test data joins

## Files to Create/Modify
- Create: `apps/backend/src/routes/assignments.ts`
- Modify: `apps/backend/src/server.ts` (register route)

## Progress Log
- [2025-12-19] Task created for feature-014 breakdown
