# Task: Implement Health Check Endpoint (EXAMPLE - COMPLETED)

## Metadata
- **ID**: task-000-1
- **Status**: completed
- **Priority**: high
- **Feature**: feature-000-backend-health-check
- **Epic**: Basic Infrastructure
- **Agent**: Backend Agent
- **Created**: 2025-12-10
- **Completed**: 2025-12-10

## Description
Add a `/health` endpoint to the Fastify backend that returns service status and verifies database connectivity. This task involves adding a simple route handler with database connection testing.

## Requirements
1. Create GET endpoint at `/health`
2. Test database connection with simple query
3. Return JSON with status, database state, and timestamp
4. Handle database errors gracefully
5. Return appropriate HTTP status codes (200 = healthy, 503 = unhealthy)

## Acceptance Criteria
- ✅ Endpoint responds at `/health`
- ✅ Returns 200 with `{ status: "ok", database: "connected", timestamp }` when healthy
- ✅ Returns 503 with error status when database unreachable
- ✅ Response time < 100ms
- ✅ Works in local development (localhost:3000)
- ✅ Works in Docker (internal network)
- ✅ Documented in backend AGENT.md

## Dependencies
- PostgreSQL database must be running
- `pg.Pool` connection already configured

## Technical Notes

### Implementation Approach
Add route handler directly in `server.ts` since it's a simple endpoint:

```typescript
fastify.get('/health', async (request, reply) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    
    return {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    reply.code(503);
    return {
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    };
  }
});
```

### Files Modified
- `apps/backend/src/server.ts` - Add health route
- `apps/backend/AGENT.md` - Document new endpoint

### Testing
Manual testing:
```bash
# Local dev
curl http://localhost:3000/health

# Docker
curl http://localhost/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-12-10T12:00:00.000Z"
}
```

## Implementation Plan
1. ✅ Add route handler in server.ts after existing routes
2. ✅ Use pool.query('SELECT 1') to test database
3. ✅ Return success response with status
4. ✅ Add try-catch for error handling
5. ✅ Set 503 status code on failure
6. ✅ Test with database running
7. ✅ Test with database stopped (error case)
8. ✅ Update backend AGENT.md with endpoint documentation

## Agent Assignment
Backend Agent

## Subtask Instructions
Not needed - straightforward single-agent task

## Progress Log
- [2025-12-10 11:00] Task created by Orchestrator
- [2025-12-10 11:15] Backend Agent started implementation
- [2025-12-10 11:45] Route handler completed
- [2025-12-10 12:00] Local testing successful
- [2025-12-10 12:30] Docker testing successful
- [2025-12-10 13:00] Documentation updated
- [2025-12-10 13:15] Task marked completed

## Validation Results

### Tests Performed
- ✅ Local dev: `curl http://localhost:3000/health` → 200 OK
- ✅ Docker: `curl http://localhost/health` → 200 OK (proxied through nginx)
- ✅ Error case: Stopped database → 503 response
- ✅ Response format matches specification
- ✅ Response time: ~15ms (well under 100ms requirement)

### Code Review
- ✅ Follows Fastify async handler pattern
- ✅ Error handling implemented
- ✅ TypeScript types inferred correctly
- ✅ No hardcoded values
- ✅ Simple and maintainable

## Lessons Learned

### What Worked Well
- Simple, focused implementation
- Easy to test manually
- Good error handling pattern for future endpoints
- Database connection test is minimal but effective

### What Could Improve
- Could add more health metrics in future
- Could log health check failures for monitoring

### Patterns Established
- Health check pattern: try database query, return status
- Error response format: same structure with error status
- Timestamp format: ISO 8601

## Related Files
- Implementation: [apps/backend/src/server.ts](../../apps/backend/src/server.ts)
- Documentation: [apps/backend/AGENT.md](../../apps/backend/AGENT.md)
- Parent Feature: [feature-000-backend-health-check-EXAMPLE.md](../features/done/feature-000-backend-health-check-EXAMPLE.md)

## Git References
- Commit: `feat: add health check endpoint`
- Branch: `feature/backend-health-check`
- Files changed: 2 files (+25 lines)

---

**This is an example of a completed task file showing full implementation details and lessons learned.**
