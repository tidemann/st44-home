# Task: Implement Children CRUD API Endpoints

## Metadata
- **ID**: task-023
- **Feature**: feature-003 - Household Management
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: in-progress
- **Priority**: high
- **Created**: 2025-12-14
- **Assigned Agent**: backend
- **Estimated Duration**: 4-5 hours

## Description
Implement RESTful API endpoints for managing children profiles within households. Children are household-scoped entities that represent kids who will be assigned tasks. Parents need to add, view, edit, and remove child profiles as their family composition changes.

## Requirements
- GET /api/households/:householdId/children - List children in household
- POST /api/households/:householdId/children - Add child to household
- PUT /api/households/:householdId/children/:id - Update child
- DELETE /api/households/:householdId/children/:id - Remove child
- All endpoints require authentication and household membership
- Validate child data (name, birth year)
- Proper error handling

## Acceptance Criteria
- [ ] GET endpoint returns all children for household (ordered by name)
- [ ] POST endpoint creates child (parent or admin role required)
- [ ] PUT endpoint updates child (parent or admin role required)
- [ ] DELETE endpoint removes child (admin role required)
- [ ] All endpoints validate household membership
- [ ] Child name validation (1-100 chars, required)
- [ ] Birth year validation (1900-current year, required)
- [ ] Proper HTTP status codes (200, 201, 403, 404, 500)
- [ ] Cannot access children from other households
- [ ] All operations properly scoped to household_id

## Dependencies
- task-021: Household CRUD endpoints
- task-022: Household membership middleware
- feature-002: Children table schema

## Technical Notes

### GET /api/households/:householdId/children
```typescript
// Request
GET /api/households/550e8400-e29b-41d4-a716-446655440000/children
Authorization: Bearer {token}

// Response 200
{
  "children": [
    {
      "id": "uuid",
      "name": "Emma",
      "birthYear": 2015,
      "createdAt": "2025-12-14T10:00:00Z"
    },
    {
      "id": "uuid",
      "name": "Oliver",
      "birthYear": 2018,
      "createdAt": "2025-12-14T10:05:00Z"
    }
  ]
}

// Implementation
SELECT id, name, birth_year, created_at, updated_at
FROM children
WHERE household_id = $1
ORDER BY name ASC
```

### POST /api/households/:householdId/children
```typescript
// Request
POST /api/households/550e8400-e29b-41d4-a716-446655440000/children
Authorization: Bearer {token}
{
  "name": "Sophia",
  "birthYear": 2016
}

// Response 201
{
  "id": "uuid",
  "name": "Sophia",
  "birthYear": 2016,
  "createdAt": "2025-12-14T11:00:00Z"
}

// Implementation
INSERT INTO children (household_id, name, birth_year)
VALUES ($1, $2, $3)
RETURNING id, name, birth_year, created_at
```

### PUT /api/households/:householdId/children/:id
```typescript
// Request
PUT /api/households/550e8400-e29b-41d4-a716-446655440000/children/abc-123
Authorization: Bearer {token}
{
  "name": "Sophia Marie",
  "birthYear": 2016
}

// Response 200
{
  "id": "uuid",
  "name": "Sophia Marie",
  "birthYear": 2016,
  "updatedAt": "2025-12-14T11:30:00Z"
}

// Response 404 (child not found or wrong household)
{
  "error": "Not Found",
  "message": "Child not found in this household"
}

// Implementation
UPDATE children
SET name = $1, birth_year = $2, updated_at = NOW()
WHERE id = $3 AND household_id = $4
RETURNING id, name, birth_year, updated_at
```

### DELETE /api/households/:householdId/children/:id
```typescript
// Request
DELETE /api/households/550e8400-e29b-41d4-a716-446655440000/children/abc-123
Authorization: Bearer {token}

// Response 200
{
  "success": true,
  "message": "Child removed successfully"
}

// Response 403 (not admin)
{
  "error": "Forbidden",
  "message": "Only household admins can remove children"
}

// Implementation
DELETE FROM children
WHERE id = $1 AND household_id = $2
RETURNING id
```

### Validation Rules
```typescript
interface ChildInput {
  name: string;        // Required, 1-100 chars, trimmed
  birthYear: number;   // Required, 1900 <= year <= current year
}

// Validation
- name: Required, string, 1-100 characters after trim
- birthYear: Required, integer, >= 1900, <= new Date().getFullYear()
- Reject if name is only whitespace
- Convert birthYear to integer if string provided
```

### Error Handling
- 400: Invalid request body, validation errors
- 401: Missing or invalid auth token
- 403: Not a household member, insufficient role
- 404: Child not found (or belongs to different household)
- 500: Database error

## Affected Areas
- [ ] Database (PostgreSQL)
- [x] Backend (Fastify/Node.js)
- [ ] Frontend (Angular)
- [ ] Infrastructure (Docker/Nginx)
- [ ] CI/CD
- [ ] Documentation

## Implementation Plan

### Step 1: Create Children Routes File
1. Create `src/routes/children.ts`
2. Define TypeScript interfaces for request/response
3. Import household membership middleware

### Step 2: GET /children - List Children
1. Apply authentication + membership middleware
2. Extract householdId from params
3. Query children table WHERE household_id = $1
4. Order by name ASC
5. Return array of children

### Step 3: POST /children - Create Child
1. Apply auth + membership + requireHouseholdRole('parent') middleware
2. Validate request body (name, birthYear)
3. Insert into children table
4. Return created child (201 status)

### Step 4: PUT /children/:id - Update Child
1. Apply auth + membership + requireHouseholdRole('parent') middleware
2. Validate child ID (UUID format)
3. Validate request body (name, birthYear)
4. Update WHERE id = $1 AND household_id = $2
5. Check affected rows (if 0, return 404)
6. Return updated child

### Step 5: DELETE /children/:id - Remove Child
1. Apply auth + membership + requireHouseholdRole('admin') middleware
2. Validate child ID
3. Delete WHERE id = $1 AND household_id = $2
4. Check affected rows (if 0, return 404)
5. Return success message
6. Note: CASCADE will handle task_assignments, task_completions

### Step 6: JSON Schema Validation
1. Define Fastify schema for POST/PUT bodies
2. name: string, minLength 1, maxLength 100
3. birthYear: integer, minimum 1900, maximum current year
4. Add to route options

### Step 7: Register Routes
1. Import children routes in server.ts
2. Register under /api prefix
3. Ensure middleware is applied correctly

### Step 8: Testing
1. Test list children (empty, multiple)
2. Test create child (valid, invalid name, invalid birth year)
3. Test update child (found, not found, wrong household)
4. Test delete child (admin, non-admin)
5. Test household isolation (cannot see other household's children)
6. Test CASCADE delete (child deletion cleans up assignments)

## Testing Strategy
- Unit tests for validation logic
- Integration tests for all 4 endpoints
- Test household membership enforcement
- Test role requirements (parent, admin)
- Test data validation (name, birth year)
- Test 404 cases (child not found, wrong household)
- Test SQL injection attempts
- Test CASCADE behavior on child deletion

## Progress Log
- [2025-12-14 16:45] Task created from feature-003 breakdown

## Related Files
- `apps/backend/src/routes/children.ts` - New file
- `apps/backend/src/middleware/household-membership.ts` - Membership validation
- `apps/backend/src/server.ts` - Register routes
- `docker/postgres/init.sql` - Children table schema

## Lessons Learned
[To be filled after completion]
