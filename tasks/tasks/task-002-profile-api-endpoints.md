# Task: Implement Profile API Endpoints

## Metadata
- **ID**: task-002
- **Feature**: feature-001 - User Profile Management
- **Epic**: None
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-13
- **Assigned Agent**: backend
- **Estimated Duration**: 3-4 hours

## Description
Implement RESTful API endpoints for user profile management: GET to retrieve profile data and PUT to update profile information. Follow existing Fastify patterns with proper TypeScript types, validation, and error handling.

## Requirements
1. GET /api/users/:id/profile - Retrieve user profile
2. PUT /api/users/:id/profile - Update user profile
3. TypeScript interfaces for request/response
4. Input validation for PUT requests
5. Proper error handling and status codes
6. Update backend documentation

## Acceptance Criteria
- [ ] GET endpoint returns user profile data
- [ ] PUT endpoint updates name and bio
- [ ] Username and email are read-only
- [ ] Validation: name max 255 chars, bio max 1000 chars
- [ ] Returns 404 if user not found
- [ ] Returns 400 for invalid input
- [ ] Returns proper TypeScript types
- [ ] Error handling follows existing patterns
- [ ] Endpoints documented in apps/backend/AGENT.md

## Dependencies
- Task-001 must be completed (users table exists)

## Technical Notes

### API Specification

**GET /api/users/:id/profile**
```typescript
// Response 200:
{
  id: number,
  username: string,
  email: string,
  name: string | null,
  bio: string | null,
  avatar_url: string | null,
  created_at: string,
  updated_at: string
}

// Response 404:
{ error: 'User not found' }
```

**PUT /api/users/:id/profile**
```typescript
// Request body:
{
  name: string,      // required, max 255 chars
  bio?: string       // optional, max 1000 chars
}

// Response 200:
{
  success: true,
  profile: { ...user profile... }
}

// Response 400:
{ error: 'Validation error message' }

// Response 404:
{ error: 'User not found' }
```

### Implementation Pattern
```typescript
// Define interfaces
interface UserProfile {
  id: number;
  username: string;
  email: string;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

interface UpdateProfileRequest {
  name: string;
  bio?: string;
}

// GET endpoint
fastify.get<{ Params: { id: string }; Reply: UserProfile | { error: string } }>(
  '/api/users/:id/profile',
  async (request, reply) => {
    try {
      const { id } = request.params;
      const result = await pool.query<UserProfile>(
        'SELECT id, username, email, name, bio, avatar_url, created_at, updated_at FROM users WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        reply.code(404);
        return { error: 'User not found' };
      }
      
      return result.rows[0];
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { error: 'Failed to fetch profile' };
    }
  }
);

// PUT endpoint
fastify.put<{ Params: { id: string }; Body: UpdateProfileRequest }>(
  '/api/users/:id/profile',
  async (request, reply) => {
    try {
      const { id } = request.params;
      const { name, bio } = request.body;
      
      // Validation
      if (!name || name.trim().length === 0) {
        reply.code(400);
        return { error: 'Name is required' };
      }
      if (name.length > 255) {
        reply.code(400);
        return { error: 'Name must be 255 characters or less' };
      }
      if (bio && bio.length > 1000) {
        reply.code(400);
        return { error: 'Bio must be 1000 characters or less' };
      }
      
      const result = await pool.query<UserProfile>(
        'UPDATE users SET name = $1, bio = $2 WHERE id = $3 RETURNING *',
        [name.trim(), bio?.trim() || null, id]
      );
      
      if (result.rows.length === 0) {
        reply.code(404);
        return { error: 'User not found' };
      }
      
      return { success: true, profile: result.rows[0] };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { error: 'Failed to update profile' };
    }
  }
);
```

### Files to Modify
- `apps/backend/src/server.ts` - Add profile endpoints after /api/items
- `apps/backend/AGENT.md` - Document new endpoints

### Security Considerations
- TODO: Add authentication middleware (future task)
- TODO: Verify user can only edit their own profile
- Trim input to prevent whitespace-only values
- Use parameterized queries to prevent SQL injection
- Sanitize bio on frontend to prevent XSS

## Implementation Plan
1. Define TypeScript interfaces for UserProfile and UpdateProfileRequest
2. Implement GET /api/users/:id/profile endpoint
3. Implement PUT /api/users/:id/profile endpoint
4. Add validation logic for PUT requests
5. Test with curl/Postman against sample user
6. Update apps/backend/AGENT.md with endpoint documentation

## Progress Log
- [2025-12-13 DRY RUN] Task created by Orchestrator during feature breakdown
