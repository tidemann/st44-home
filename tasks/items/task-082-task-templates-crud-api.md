# Task: Task Templates CRUD API Endpoints

## Metadata
- **ID**: task-082
- **Feature**: [feature-013-task-template-management](../features/feature-013-task-template-management.md)
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-19
- **Assigned Agent**: backend-agent
- **Estimated Duration**: 6-8 hours

## Description
Create Fastify API endpoints for task template CRUD operations (Create, Read, Update, Delete). Task templates define recurring household chores with assignment rules for automatic rotation between children.

## Requirements

### API Endpoints
1. **POST /api/households/:householdId/tasks** - Create task template
2. **GET /api/households/:householdId/tasks** - List all household tasks
3. **GET /api/households/:householdId/tasks/:taskId** - Get task details
4. **PUT /api/households/:householdId/tasks/:taskId** - Update task template
5. **DELETE /api/households/:householdId/tasks/:taskId** - Soft delete (set active=false)

### Authentication & Authorization
- All endpoints require authentication (JWT token)
- All endpoints require household membership validation
- Users can only access tasks in their own household
- Use existing `authenticateUser` and `validateHouseholdMembership` middleware

### Request/Response Schemas

**POST /api/households/:householdId/tasks**
```typescript
// Request body
{
  title: string;           // Required, max 200 chars
  description?: string;    // Optional
  rule_type: 'weekly_rotation' | 'repeating' | 'daily';  // Required
  rotation_type?: 'odd_even_week' | 'alternating';       // Required if weekly_rotation
  repeat_days?: number[];  // Required if repeating, values 0-6
  assigned_children?: number[];  // Array of child IDs
  active?: boolean;        // Default true
}

// Response (201)
{
  id: number;
  household_id: number;
  title: string;
  description: string | null;
  rule_type: string;
  rotation_type: string | null;
  repeat_days: number[] | null;
  assigned_children: number[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}
```

**GET /api/households/:householdId/tasks**
```typescript
// Query params
?active=true|false  // Optional filter by active status

// Response (200)
[
  {
    id: number;
    household_id: number;
    title: string;
    description: string | null;
    rule_type: string;
    rotation_type: string | null;
    repeat_days: number[] | null;
    assigned_children: number[] | null;
    active: boolean;
    created_at: string;
    updated_at: string;
  }
]
```

**GET /api/households/:householdId/tasks/:taskId**
```typescript
// Response (200)
{
  id: number;
  household_id: number;
  title: string;
  description: string | null;
  rule_type: string;
  rotation_type: string | null;
  repeat_days: number[] | null;
  assigned_children: number[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Error (404) - Task not found or not in household
{
  error: "Not Found",
  message: "Task not found"
}
```

**PUT /api/households/:householdId/tasks/:taskId**
```typescript
// Request body (all fields optional, update what's provided)
{
  title?: string;
  description?: string;
  rule_type?: string;
  rotation_type?: string;
  repeat_days?: number[];
  assigned_children?: number[];
  active?: boolean;
}

// Response (200)
{
  id: number;
  household_id: number;
  title: string;
  description: string | null;
  rule_type: string;
  rotation_type: string | null;
  repeat_days: number[] | null;
  assigned_children: number[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}
```

**DELETE /api/households/:householdId/tasks/:taskId**
```typescript
// Performs soft delete (sets active=false)
// Response (200)
{
  message: "Task deleted successfully"
}
```

### Validation Rules
- **Title**: Required, max 200 characters, non-empty after trim
- **Rule Type**: Required, must be one of: 'weekly_rotation', 'repeating', 'daily'
- **Rotation Type**: Required if rule_type='weekly_rotation', must be 'odd_even_week' or 'alternating'
- **Repeat Days**: Required if rule_type='repeating', array of integers 0-6, min 1 day
- **Assigned Children**: 
  - Required if rule_type='weekly_rotation' or 'repeating'
  - Must be valid child IDs belonging to the household
  - Min 1 child for weekly_rotation
- **Active**: Boolean, defaults to true

### Database Operations
Use existing `tasks` table (created in migration 014):
```sql
-- CREATE
INSERT INTO tasks (
  household_id, title, description, rule_type, 
  rotation_type, repeat_days, assigned_children, active
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- READ ALL
SELECT * FROM tasks 
WHERE household_id = $1 
AND (active = $2 OR $2 IS NULL)
ORDER BY created_at DESC;

-- READ ONE
SELECT * FROM tasks 
WHERE id = $1 AND household_id = $2;

-- UPDATE
UPDATE tasks 
SET title = COALESCE($1, title),
    description = COALESCE($2, description),
    rule_type = COALESCE($3, rule_type),
    rotation_type = COALESCE($4, rotation_type),
    repeat_days = COALESCE($5, repeat_days),
    assigned_children = COALESCE($6, assigned_children),
    active = COALESCE($7, active),
    updated_at = NOW()
WHERE id = $8 AND household_id = $9
RETURNING *;

-- SOFT DELETE
UPDATE tasks 
SET active = false, updated_at = NOW()
WHERE id = $1 AND household_id = $2;
```

### Error Handling
- **400 Bad Request**: Invalid input, validation errors
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: User not member of household
- **404 Not Found**: Task or household doesn't exist
- **500 Internal Server Error**: Database errors

## Acceptance Criteria
- [ ] POST endpoint creates task with all fields correctly
- [ ] POST validates rule_type and required fields per type
- [ ] POST returns 400 if validation fails with clear error message
- [ ] GET list returns all household tasks, ordered by created_at DESC
- [ ] GET list supports ?active=true/false filter
- [ ] GET single returns task details or 404 if not found
- [ ] PUT updates specified fields, leaves others unchanged
- [ ] PUT validates updated rule_type and dependencies
- [ ] PUT returns 404 if task doesn't exist or not in household
- [ ] DELETE soft-deletes task (sets active=false)
- [ ] DELETE returns 404 if task doesn't exist
- [ ] All endpoints require authentication (return 401 without token)
- [ ] All endpoints validate household membership (return 403 if not member)
- [ ] Users can only access tasks in their own household
- [ ] Assigned children validation checks they belong to household
- [ ] Created_at and updated_at timestamps set correctly
- [ ] Integration tests cover all endpoints and scenarios

## Technical Notes

### Route Organization
Create `apps/backend/src/routes/tasks.ts`:
```typescript
import { FastifyInstance } from 'fastify';
import { authenticateUser } from '../middleware/authenticateUser.js';
import { validateHouseholdMembership } from '../middleware/validateHouseholdMembership.js';

export async function taskRoutes(fastify: FastifyInstance) {
  // Apply authentication to all routes
  fastify.addHook('onRequest', authenticateUser);
  
  // Create task template
  fastify.post(
    '/households/:householdId/tasks',
    { onRequest: [validateHouseholdMembership] },
    async (request, reply) => { /* implementation */ }
  );
  
  // List tasks
  fastify.get(
    '/households/:householdId/tasks',
    { onRequest: [validateHouseholdMembership] },
    async (request, reply) => { /* implementation */ }
  );
  
  // Get task
  fastify.get(
    '/households/:householdId/tasks/:taskId',
    { onRequest: [validateHouseholdMembership] },
    async (request, reply) => { /* implementation */ }
  );
  
  // Update task
  fastify.put(
    '/households/:householdId/tasks/:taskId',
    { onRequest: [validateHouseholdMembership] },
    async (request, reply) => { /* implementation */ }
  );
  
  // Delete task (soft)
  fastify.delete(
    '/households/:householdId/tasks/:taskId',
    { onRequest: [validateHouseholdMembership] },
    async (request, reply) => { /* implementation */ }
  );
}
```

### Register Routes
In `apps/backend/src/server.ts`:
```typescript
import { taskRoutes } from './routes/tasks.js';

await fastify.register(taskRoutes, { prefix: '/api' });
```

### Validation Helper
```typescript
function validateTaskData(data: any, isUpdate: boolean = false): string[] {
  const errors: string[] = [];
  
  // Title validation
  if (!isUpdate && !data.title?.trim()) {
    errors.push('Title is required');
  }
  if (data.title && data.title.length > 200) {
    errors.push('Title must be 200 characters or less');
  }
  
  // Rule type validation
  const validRuleTypes = ['weekly_rotation', 'repeating', 'daily'];
  if (data.rule_type && !validRuleTypes.includes(data.rule_type)) {
    errors.push('Invalid rule_type');
  }
  
  // Weekly rotation validation
  if (data.rule_type === 'weekly_rotation') {
    if (!data.rotation_type) {
      errors.push('rotation_type required for weekly_rotation');
    }
    if (!data.assigned_children || data.assigned_children.length < 1) {
      errors.push('assigned_children required for weekly_rotation');
    }
  }
  
  // Repeating validation
  if (data.rule_type === 'repeating') {
    if (!data.repeat_days || data.repeat_days.length < 1) {
      errors.push('repeat_days required for repeating tasks');
    }
    if (!data.assigned_children || data.assigned_children.length < 1) {
      errors.push('assigned_children required for repeating tasks');
    }
  }
  
  return errors;
}
```

## Dependencies
- Migration 014 (tasks table) ✅ Already exists
- `authenticateUser` middleware ✅ Exists
- `validateHouseholdMembership` middleware ✅ Exists

## Testing Strategy
Integration tests should cover:
- Creating task with each rule type
- Validation error scenarios
- Listing tasks with/without filter
- Updating task fields
- Soft deleting task
- 404 scenarios (task not found, wrong household)
- Authentication and authorization (401, 403)

## Progress Log
- [2025-12-19] Task created for feature-013 breakdown
