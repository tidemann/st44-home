# Task: Implement Invitation CRUD API Endpoints

## Metadata
- **ID**: task-037
- **Feature**: feature-004 - User Invitation System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Assigned Agent**: backend
- **Estimated Duration**: 5-6 hours

## Description
Implement RESTful API endpoints for invitation management including creating invitations, listing sent/received invitations, accepting/declining invitations, and cancelling pending invitations.

## Requirements

### Endpoints to Implement

**POST /api/households/:householdId/invitations** - Send invitation
- Request: `{ email: string, role?: 'admin' | 'parent' }`
- Validates: Email format, not already member, inviter has permission
- Generates secure random token
- Sets expiry to NOW() + 7 days
- Response: `201 Created` with `{ id, email, token, expiresAt }`

**GET /api/households/:householdId/invitations** - List sent invitations
- Query params: `?status=pending|accepted|declined|cancelled|expired`
- Lists invitations sent from this household
- Response: `200 OK` with `{ invitations: [...] }`

**DELETE /api/households/:householdId/invitations/:id** - Cancel invitation
- Only admin/inviter can cancel
- Only pending invitations can be cancelled
- Updates status to 'cancelled'
- Response: `204 No Content`

**GET /api/users/me/invitations** - List received invitations
- Lists invitations for current user's email
- Only shows pending (unexpired) invitations
- Response: `200 OK` with `{ invitations: [...] }`

**POST /api/invitations/:token/accept** - Accept invitation
- Validates: Token exists, not expired, user not already member
- Creates household_members record
- Updates invitation status to 'accepted', sets accepted_at
- Response: `200 OK` with `{ household: { id, name, role } }`

**POST /api/invitations/:token/decline** - Decline invitation
- Updates invitation status to 'declined'
- Response: `204 No Content`

## Acceptance Criteria
- [ ] POST /api/households/:id/invitations endpoint implemented
- [ ] GET /api/households/:id/invitations endpoint implemented
- [ ] DELETE /api/households/:id/invitations/:id endpoint implemented
- [ ] GET /api/users/me/invitations endpoint implemented
- [ ] POST /api/invitations/:token/accept endpoint implemented
- [ ] POST /api/invitations/:token/decline endpoint implemented
- [ ] All endpoints use parameterized queries (SQL injection prevention)
- [ ] Proper error handling (400, 401, 403, 404, 409, 500)
- [ ] Request validation with JSON schemas
- [ ] Authorization checks (household membership, admin rights)
- [ ] Token generation uses crypto.randomBytes(32)
- [ ] Expiration check on accept/decline
- [ ] Duplicate member check on accept
- [ ] All responses follow API conventions

## Dependencies
- task-036 (invitations table must exist)
- task-022 (household membership middleware)

## Technical Notes

### Token Generation
```typescript
import crypto from 'crypto';

function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
```

### Route Structure
```typescript
// In apps/backend/src/routes/invitations.ts
import { FastifyInstance } from 'fastify';

export async function invitationRoutes(fastify: FastifyInstance) {
  // POST /api/households/:householdId/invitations
  fastify.post('/api/households/:householdId/invitations', {
    preHandler: [authenticateUser, validateHouseholdMembership],
    schema: { /* validation */ }
  }, async (req, reply) => { /* impl */ });
  
  // ... other routes
}
```

### Accept Invitation Logic
```typescript
// 1. Find invitation by token
// 2. Check if expired
// 3. Check if already accepted
// 4. Check if user already member
// 5. Begin transaction
// 6. Insert into household_members
// 7. Update invitation status to 'accepted'
// 8. Commit transaction
// 9. Return household info
```

## Implementation Plan

1. Create `apps/backend/src/routes/invitations.ts`
2. Implement POST /api/households/:id/invitations
   - Validate email format
   - Check if already member
   - Generate token
   - Insert invitation record
3. Implement GET /api/households/:id/invitations
   - Filter by household_id
   - Optional status filter
   - Join with users for inviter name
4. Implement DELETE /api/households/:id/invitations/:id
   - Verify ownership or admin
   - Check status is pending
   - Update to cancelled
5. Implement GET /api/users/me/invitations
   - Filter by invited_email = req.user.email
   - Only pending and not expired
   - Join with households and users
6. Implement POST /api/invitations/:token/accept
   - Find by token
   - Validate not expired
   - Check not already member
   - Transaction: insert member + update invitation
7. Implement POST /api/invitations/:token/decline
   - Find by token
   - Update status to declined
8. Register routes in server.ts
9. Test all endpoints manually
10. Commit changes

## Progress Log
- [2025-12-15] Task created from feature-004 breakdown
