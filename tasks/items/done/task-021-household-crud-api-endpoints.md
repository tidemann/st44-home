# Task: Implement Household CRUD API Endpoints

## Metadata
- **ID**: task-021
- **Feature**: feature-003 - Household Management
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: completed
- **Priority**: high
- **Created**: 2025-12-14
- **Assigned Agent**: backend
- **Estimated Duration**: 4-6 hours

## Description
Implement RESTful API endpoints for household CRUD operations (Create, Read, Update, Delete). These endpoints form the foundation of multi-tenant household management, allowing users to create new households, view households they belong to, update household settings, and retrieve household details.

## Requirements
- POST /api/households - Create new household
- GET /api/households - List user's households
- GET /api/households/:id - Get household details
- PUT /api/households/:id - Update household
- All endpoints require authentication
- Automatic household_members entry on creation (creator as admin)
- Proper validation and error handling
- Return household with user's role

## Acceptance Criteria
- [x] POST /api/households creates household and assigns creator as admin
- [x] GET /api/households returns all households user belongs to with their role
- [x] GET /api/households/:id returns household details (only if user is member)
- [x] PUT /api/households/:id updates household (only if user is admin)
- [x] All endpoints validate authentication token
- [x] Membership validation prevents access to non-member households
- [x] Created household includes id, name, createdAt, updatedAt
- [x] Proper HTTP status codes (201, 200, 403, 404, 500)
- [x] JSON schema validation on request bodies
- [x] All operations properly scoped to household_id

## Dependencies
- feature-001: Authentication middleware must be in place
- feature-002: Database schema (households, household_members tables)

## Technical Notes

### POST /api/households
```typescript
// Request
POST /api/households
Authorization: Bearer {token}
{
  "name": "The Smith Family"
}

// Response 201
{
  "id": "uuid",
  "name": "The Smith Family",
  "role": "admin",
  "createdAt": "2025-12-14T10:00:00Z",
  "updatedAt": "2025-12-14T10:00:00Z"
}

// Implementation
1. Extract user from authenticated request
2. Validate household name (required, 1-100 chars)
3. INSERT into households (id, name, created_at, updated_at)
4. INSERT into household_members (household_id, user_id, role='admin', joined_at)
5. Return household with role
```

### GET /api/households
```typescript
// Request
GET /api/households
Authorization: Bearer {token}

// Response 200
{
  "households": [
    {
      "id": "uuid",
      "name": "The Smith Family",
      "role": "admin",
      "memberCount": 2,
      "childrenCount": 3,
      "joinedAt": "2025-12-14T10:00:00Z"
    },
    {
      "id": "uuid",
      "name": "The Johnson Family",
      "role": "parent",
      "memberCount": 3,
      "childrenCount": 2,
      "joinedAt": "2025-12-15T14:30:00Z"
    }
  ]
}

// Implementation
1. Extract user from authenticated request
2. Query:
   SELECT h.*, hm.role, hm.joined_at,
          (SELECT COUNT(*) FROM household_members WHERE household_id = h.id) as member_count,
          (SELECT COUNT(*) FROM children WHERE household_id = h.id) as children_count
   FROM households h
   JOIN household_members hm ON h.id = hm.household_id
   WHERE hm.user_id = $1
   ORDER BY hm.joined_at DESC
```

### GET /api/households/:id
```typescript
// Request
GET /api/households/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {token}

// Response 200
{
  "id": "uuid",
  "name": "The Smith Family",
  "role": "admin",
  "memberCount": 2,
  "childrenCount": 3,
  "createdAt": "2025-12-14T10:00:00Z",
  "updatedAt": "2025-12-14T10:00:00Z"
}

// Response 403 (not a member)
{
  "error": "Forbidden",
  "message": "You do not have access to this household"
}

// Implementation
1. Extract user from authenticated request
2. Validate household_id is valid UUID
3. Check membership:
   SELECT role FROM household_members
   WHERE household_id = $1 AND user_id = $2
4. If no membership, return 403
5. Query household with counts
```

### PUT /api/households/:id
```typescript
// Request
PUT /api/households/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {token}
{
  "name": "The Smith-Jones Family"
}

// Response 200
{
  "id": "uuid",
  "name": "The Smith-Jones Family",
  "updatedAt": "2025-12-14T11:00:00Z"
}

// Response 403 (not admin)
{
  "error": "Forbidden",
  "message": "Only household admins can update settings"
}

// Implementation
1. Extract user from authenticated request
2. Check if user is household admin
3. Validate new name (required, 1-100 chars)
4. UPDATE households SET name = $1, updated_at = NOW() WHERE id = $2
5. Return updated household
```

### Error Handling
- 400: Invalid request body, invalid UUID
- 401: Missing or invalid auth token
- 403: Not a household member, not an admin (for PUT)
- 404: Household not found
- 500: Database error

### Database Queries
All queries use parameterized statements to prevent SQL injection.

```sql
-- Create household
BEGIN;
INSERT INTO households (id, name) VALUES (gen_random_uuid(), $1) RETURNING *;
INSERT INTO household_members (household_id, user_id, role, joined_at)
VALUES ($household_id, $user_id, 'admin', NOW());
COMMIT;

-- Check membership
SELECT role FROM household_members
WHERE household_id = $1 AND user_id = $2;

-- Update household
UPDATE households SET name = $1, updated_at = NOW()
WHERE id = $2
RETURNING *;
```

## Affected Areas
- [ ] Database (PostgreSQL)
- [x] Backend (Fastify/Node.js)
- [ ] Frontend (Angular)
- [ ] Infrastructure (Docker/Nginx)
- [ ] CI/CD
- [ ] Documentation

## Implementation Plan

### Step 1: Create Household Endpoints Handler
1. Create `src/routes/households.ts`
2. Define TypeScript interfaces for request/response
3. Export route registration function

### Step 2: POST /api/households - Create Household
1. Define request schema (name validation)
2. Extract authenticated user from request
3. Begin transaction
4. Insert into households table
5. Insert into household_members table (admin role)
6. Commit transaction
7. Return household with role

### Step 3: GET /api/households - List User's Households
1. Extract authenticated user
2. Query households with JOIN on household_members
3. Include role, member count, children count
4. Order by joined_at DESC
5. Return array of households

### Step 4: GET /api/households/:id - Get Household Details
1. Validate household_id parameter (UUID format)
2. Check user membership
3. If not member, return 403
4. Query household with counts
5. Return household details with user's role

### Step 5: PUT /api/households/:id - Update Household
1. Validate household_id and request body
2. Check user is household admin
3. If not admin, return 403
4. Update household name and updated_at
5. Return updated household

### Step 6: Register Routes
1. Import household routes in server.ts
2. Register under /api prefix
3. Apply authentication middleware

### Step 7: Testing
1. Test create household (201, creates member record)
2. Test list households (empty, single, multiple)
3. Test get household details (member, non-member)
4. Test update household (admin, non-admin)
5. Test error cases (invalid token, invalid UUID, etc.)

## Testing Strategy
- Unit tests for household service functions
- Integration tests for all 4 endpoints
- Test authentication requirement
- Test membership validation
- Test admin role requirement for updates
- Test transaction rollback on errors
- Test SQL injection attempts
- Test invalid input (empty name, too long, etc.)

## Progress Log
- [2025-12-14 16:45] Task created from feature-003 breakdown
- [2025-12-14 16:50] Status changed to in-progress
- [2025-12-14 17:00] Created database module with shared pool export
- [2025-12-14 17:05] Extracted auth middleware to separate file
- [2025-12-14 17:10] Implemented all 4 household CRUD endpoints
- [2025-12-14 17:15] Fixed server.ts to use buildApp pattern
- [2025-12-14 17:22] All endpoints tested successfully (create, list, get, update)
- [2025-12-14 17:23] Status changed to completed

## Related Files
- `apps/backend/src/routes/households.ts` - New file
- `apps/backend/src/server.ts` - Register routes
- `docker/postgres/init.sql` - Households and household_members tables

## Lessons Learned
[To be filled after completion]
