# Task: Task Completion & Reassignment API

## Metadata
- **ID**: task-095
- **Feature**: [feature-015-task-viewing-completion](../features/feature-015-task-viewing-completion.md)
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-19
- **Estimated Duration**: 4-5 hours
- **Agent Assignment**: backend-agent

## Description
Implement API endpoints for marking tasks complete and reassigning tasks to different children. Includes validation, authorization, and timestamp recording.

## Requirements

### API Endpoints

#### 1. PUT /api/assignments/:assignmentId/complete
Mark a task assignment as complete.

Request body: (empty or optional note)
```json
{
  "note": "Optional completion note"
}
```

Response:
```json
{
  "id": 123,
  "status": "completed",
  "completedAt": "2025-12-19T23:45:00Z"
}
```

#### 2. PUT /api/assignments/:assignmentId/reassign
Reassign task to a different child.

Request body:
```json
{
  "childId": 78
}
```

Response:
```json
{
  "id": 123,
  "childId": 78,
  "childName": "Noah"
}
```

### Validation
- Assignment ID must be valid UUID
- Assignment must exist
- Assignment must be in 'pending' status (cannot complete already completed)
- For reassignment: new childId must be valid and in same household
- Cannot reassign completed tasks (must be pending)

### Authorization
- Completion: Must be parent in household OR the assigned child
- Reassignment: Must be parent in household (children cannot reassign)
- Use authenticateUser middleware
- Verify household membership

### Database Operations
```sql
-- Mark complete
UPDATE task_assignments
SET status = 'completed', 
    completed_at = NOW()
WHERE id = $1 
  AND status = 'pending'
RETURNING id, status, completed_at;

-- Reassign
UPDATE task_assignments
SET child_id = $2
WHERE id = $1 
  AND status = 'pending'
RETURNING id, child_id;
```

### Business Rules
- Cannot un-complete a task (intentional - teaches accountability)
- Reassignment only allowed for pending tasks
- Completion timestamp recorded in UTC
- Optional completion note stored (future enhancement)

## Acceptance Criteria
- [ ] PUT /api/assignments/:assignmentId/complete marks task complete
- [ ] Sets status to 'completed' and records completed_at timestamp
- [ ] Returns updated assignment data
- [ ] Only allows completion if status is 'pending'
- [ ] Authorized for parent or assigned child
- [ ] Returns 404 if assignment not found
- [ ] Returns 400 if already completed
- [ ] PUT /api/assignments/:assignmentId/reassign updates child_id
- [ ] Validates new child belongs to same household
- [ ] Only allows reassignment if status is 'pending'
- [ ] Authorized for parents only (not children)
- [ ] Returns 403 if child not authorized to reassign
- [ ] Returns 400 if trying to reassign completed task
- [ ] Both endpoints tested with integration tests

## Dependencies
- feature-014 ✅ Complete (assignments exist)
- task-094 (query endpoints) - can be parallel
- Middleware: authenticateUser, validateHouseholdMembership

## Technical Notes

### Route Registration
```typescript
server.put('/api/assignments/:assignmentId/complete', { preHandler: [authenticateUser] }, completeAssignment);
server.put('/api/assignments/:assignmentId/reassign', { preHandler: [authenticateUser] }, reassignAssignment);
```

### Authorization Logic
```typescript
// For completion: parent OR assigned child
const assignment = await getAssignment(assignmentId);
const isParent = await checkParentStatus(userId, assignment.household_id);
const isAssignedChild = assignment.child_id === childId; // get childId from user
if (!isParent && !isAssignedChild) {
  return reply.code(403).send({ error: 'Not authorized' });
}

// For reassignment: must be parent
if (!isParent) {
  return reply.code(403).send({ error: 'Only parents can reassign tasks' });
}
```

### Error Handling
- 400: Invalid UUID format, already completed, invalid child
- 401: Not authenticated
- 403: Not authorized (not parent/child)
- 404: Assignment not found
- 409: Conflict (trying to modify completed task)
- 500: Database errors

### Idempotency
- Completing already completed task: Return 400 with error message
- Reassigning to same child: Allow (no-op but returns success)

### Future Enhancements
- Completion notes stored in database
- Completion photos/proof (upload)
- Completion undo within time window (e.g., 5 minutes)
- Notification on completion (Epic-004)

## Implementation Plan
1. Create route handlers in `apps/backend/src/routes/assignments.ts`
2. Implement completeAssignment handler
   - Validate assignmentId UUID
   - Fetch assignment with household_id
   - Check authorization (parent or assigned child)
   - Verify status is 'pending'
   - Execute UPDATE query
   - Return updated data or 400 if already complete
3. Implement reassignAssignment handler
   - Validate assignmentId and childId UUIDs
   - Fetch assignment with household_id
   - Check authorization (must be parent)
   - Verify status is 'pending'
   - Verify new child is in same household
   - Execute UPDATE query
   - Return updated data
4. Add route registration
5. Test manually
6. Add integration tests (covered in task-097)

## Progress Log
- [2025-12-19 23:50] Task created for feature-015 breakdown
