# Task: Implement Invitation Authorization Middleware

## Metadata
- **ID**: task-038
- **Feature**: feature-004 - User Invitation System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: medium
- **Created**: 2025-12-15
- **Assigned Agent**: backend
- **Estimated Duration**: 2-3 hours

## Description
Create middleware to validate that users have the appropriate permissions to send invitations. Only household admins and parents can invite users. This middleware will be used in invitation endpoints to enforce authorization.

## Requirements

### Middleware Functions
- **validateCanInvite**: Check if user is admin or parent in household
- **validateInvitationOwnership**: Check if user can cancel/view specific invitation
- Integrate with existing household membership middleware

### Authorization Rules
- Only admin or parent roles can send invitations
- User must be member of household to send invitations
- Only admin or original inviter can cancel invitations
- Anyone can accept/decline their own invitations

## Acceptance Criteria
- [ ] validateCanInvite middleware function created
- [ ] Checks user is member of household
- [ ] Checks user role is admin or parent
- [ ] Returns 403 Forbidden if insufficient permissions
- [ ] validateInvitationOwnership middleware created
- [ ] Works with existing validateHouseholdMembership middleware
- [ ] Proper error messages ("Only admins and parents can invite users")
- [ ] Used in invitation endpoints

## Dependencies
- task-022 (household membership middleware)
- task-037 (invitation endpoints)

## Technical Notes

### Middleware Implementation
```typescript
// apps/backend/src/middleware/invitation-auth.ts
import { FastifyRequest, FastifyReply } from 'fastify';

export async function validateCanInvite(
  request: FastifyRequest<{ Params: { householdId: string } }>,
  reply: FastifyReply
) {
  const { householdId } = request.params;
  const userId = request.user!.userId;
  
  const result = await pool.query(
    `SELECT role FROM household_members 
     WHERE household_id = $1 AND user_id = $2`,
    [householdId, userId]
  );
  
  if (result.rows.length === 0) {
    return reply.code(403).send({ error: 'Not a member of this household' });
  }
  
  const { role } = result.rows[0];
  if (role !== 'admin' && role !== 'parent') {
    return reply.code(403).send({ error: 'Only admins and parents can invite users' });
  }
}
```

## Implementation Plan

1. Create `apps/backend/src/middleware/invitation-auth.ts`
2. Implement validateCanInvite function
3. Query household_members for user's role
4. Check role is admin or parent
5. Return 403 if unauthorized
6. Implement validateInvitationOwnership (optional)
7. Export middleware
8. Use in invitation routes (preHandler array)
9. Test authorization scenarios
10. Commit changes

## Progress Log
- [2025-12-15] Task created from feature-004 breakdown
