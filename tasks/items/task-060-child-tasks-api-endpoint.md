# Task: Create Child Tasks API Endpoint

## Metadata
- **ID**: task-060
- **Feature**: feature-012 - Landing Pages After Login
- **Epic**: epic-003 - User Onboarding & Experience
- **Status**: in-progress
- **Priority**: high
- **Created**: 2025-12-21
- **Assigned Agent**: backend-agent
- **Estimated Duration**: 2-3 hours

## Description
Create a backend API endpoint that returns today's task assignments for the authenticated child user. This endpoint will power the child dashboard (/my-tasks), showing children what tasks they need to complete today. The endpoint must verify the user has 'child' role in the household and return only their assigned tasks with appropriate formatting.

**Context:** Feature-012 parent dashboard is complete (task-059, 061, 062, 064, 066 done). This task completes the backend support needed for the child dashboard (task-063).

## Requirements

### API Endpoint Specification
```
GET /api/children/my-tasks
Authorization: Bearer <JWT>
Query Parameters:
  - household_id: UUID (optional, uses current household from membership)
  - date: YYYY-MM-DD (optional, defaults to today)

Response 200:
{
  "tasks": [
    {
      "id": "uuid",
      "task_name": "Make bed",
      "task_description": "Make your bed neatly",
      "points": 10,
      "date": "2025-12-21",
      "status": "pending" | "completed",
      "completed_at": "2025-12-21T10:30:00Z" | null
    }
  ],
  "total_points_today": 30,
  "completed_points": 10,
  "child_name": "Emma"
}

Error 403: { "error": "User is not a child in this household" }
Error 404: { "error": "Child profile not found" }
```

### Functional Requirements
1. Verify authenticated user has 'child' role in household_members
2. Find child profile associated with user (via household membership)
3. Query task_assignments for child's tasks on specified date
4. Join with tasks table to get task details
5. Calculate total and completed points
6. Return formatted response

### Security Requirements
- Verify JWT authentication
- Validate user has 'child' role in the household
- Ensure multi-tenant isolation (only child's household tasks)
- Return 403 if user is not a child in the household

## Acceptance Criteria
- [ ] GET /api/children/my-tasks endpoint created
- [ ] Verifies user has 'child' role via household_members
- [ ] Returns today's tasks by default
- [ ] Supports optional date parameter (YYYY-MM-DD)
- [ ] Response includes task details (name, description, points, status)
- [ ] Response includes total and completed points
- [ ] Response includes child's name
- [ ] Returns 403 if user doesn't have 'child' role
- [ ] Returns 404 if child profile not found
- [ ] Multi-tenant isolation enforced
- [ ] Integration tests pass (10+ test cases)
- [ ] OpenAPI schema added for endpoint
- [ ] Code formatted with Prettier
- [ ] All TypeScript compilation succeeds

## Dependencies
- feature-012 task-059 (Dashboard API) ✅ COMPLETE
- Epic-002 (Task Management Core) ✅ COMPLETE
- household_members table with 'role' column ✅ EXISTS

## Technical Notes

### Database Query
```sql
-- Get child's tasks for date
SELECT 
  ta.id,
  t.name as task_name,
  t.description as task_description,
  t.points,
  ta.date,
  ta.status,
  tc.completed_at
FROM task_assignments ta
JOIN tasks t ON ta.task_id = t.id
LEFT JOIN task_completions tc ON ta.id = tc.task_assignment_id
WHERE ta.child_id = $1 
  AND ta.household_id = $2
  AND ta.date = $3
ORDER BY t.name;

-- Get child_id from user_id
SELECT c.id, c.name
FROM children c
JOIN household_members hm ON hm.household_id = c.household_id
WHERE hm.user_id = $1 
  AND hm.role = 'child'
  AND c.household_id = $2;
```

### Existing Patterns
- Use authenticateUser middleware from src/middleware/auth.ts
- Use verifyHouseholdMembership middleware from src/middleware/household-membership.ts
- Follow pattern from assignments.ts for querying task_assignments
- Use toChildResponse() transformer (create if doesn't exist)

### OpenAPI Schema (to be added to schemas/children.ts)
```typescript
export const getMyTasksSchema = {
  summary: 'Get my tasks for today',
  description: 'Returns tasks assigned to the authenticated child user',
  tags: ['children'],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      household_id: uuidSchema,
      date: { type: 'string', format: 'date', example: '2025-12-21' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: uuidSchema,
              task_name: { type: 'string' },
              task_description: { type: 'string', nullable: true },
              points: { type: 'integer' },
              date: { type: 'string', format: 'date' },
              status: { type: 'string', enum: ['pending', 'completed'] },
              completed_at: timestampSchema,
            },
          },
        },
        total_points_today: { type: 'integer' },
        completed_points: { type: 'integer' },
        child_name: { type: 'string' },
      },
    },
    403: errorResponseSchema,
    404: errorResponseSchema,
  },
};
```

## Affected Areas
- [ ] Frontend (Angular) - No changes (used by task-063)
- [x] Backend (Fastify/Node.js) - New route in children.ts
- [ ] Database (PostgreSQL) - No schema changes
- [ ] Infrastructure (Docker/Nginx) - No changes
- [ ] CI/CD - Existing tests cover this
- [x] Documentation - OpenAPI schema added

## Implementation Plan

### Step 1: Add Route to children.ts (30 min)
1. Open apps/backend/src/routes/children.ts
2. Add GET /my-tasks route after existing routes
3. Add authenticateUser middleware
4. Extract user_id from request.user

### Step 2: Implement Query Logic (45 min)
1. Query household_members to verify 'child' role
2. Get child profile associated with user
3. Query task_assignments + tasks join
4. Calculate total and completed points
5. Format response

### Step 3: Add OpenAPI Schema (30 min)
1. Open apps/backend/src/schemas/children.ts
2. Add getMyTasksSchema definition
3. Import and apply to route
4. Test in Swagger UI at /api/docs

### Step 4: Write Integration Tests (45 min)
1. Create test: "should return child's tasks for today"
2. Create test: "should return 403 if user is not a child"
3. Create test: "should return 404 if child profile not found"
4. Create test: "should calculate points correctly"
5. Create test: "should filter by date parameter"
6. Create test: "should enforce multi-tenant isolation"
7. Run tests: npm test

### Step 5: Manual Testing (15 min)
1. Start backend: npm run dev:backend
2. Login as child user (create if doesn't exist)
3. GET /api/children/my-tasks
4. Verify response structure
5. Test with different dates
6. Test error cases (non-child user, invalid household)

## Progress Log
- [2025-12-21 05:00] Task created (previously deferred, now unblocked)
- [2025-12-21 05:00] Status: in-progress
- [2025-12-21 05:00] Schema verification: household_members.role column exists ✅
- [2025-12-21 05:00] Beginning implementation

## Testing Results
[To be filled during testing phase]

## Review Notes
[To be filled during review phase]

## Related PRs
[To be added when PR is created]

## Lessons Learned
[To be filled after completion]
