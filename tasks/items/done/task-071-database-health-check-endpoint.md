# Task: Create Database Health Check Endpoint with Schema Validation

## Metadata
- **ID**: task-025
- **Feature**: feature-005 - Production Database Deployment & Migration System
- **Epic**: None (Critical Bug Fix)
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-14
- **Assigned Agent**: backend
- **Estimated Duration**: 2-3 hours

## Description
Create a comprehensive health check endpoint that validates not just database connectivity, but also that the expected schema exists. This will catch deployment issues early and provide visibility into database migration status. The endpoint should return detailed information about database health, applied migrations, and schema state.

## Requirements
- Create GET `/health/database` endpoint in Fastify
- Check database connectivity (can connect and run queries)
- Validate schema_migrations table exists
- Query applied migrations from schema_migrations
- Check that critical tables exist (users, households, children, tasks, etc.)
- Return detailed status in JSON format
- Endpoint should be publicly accessible (no authentication)
- Fast response time (< 500ms)
- Handle errors gracefully (database down, schema missing)

## Acceptance Criteria
- [ ] GET `/health/database` endpoint created
- [ ] Endpoint checks database connectivity
- [ ] Endpoint validates schema_migrations table exists
- [ ] Endpoint returns list of applied migrations
- [ ] Endpoint checks critical tables exist
- [ ] Response includes status (healthy/degraded/unhealthy)
- [ ] Response includes version information (latest migration)
- [ ] Handles database connection errors gracefully
- [ ] Returns appropriate HTTP status codes (200, 503)
- [ ] Response time < 500ms
- [ ] Tests added for health check endpoint
- [ ] Documentation added to API docs (or in code comments)
- [ ] PR created with changes

## Dependencies
- task-023 completed (production database has schema)
- Existing Fastify server structure
- Database connection pool already configured

## Technical Notes

### Endpoint Design

**URL**: `GET /health/database`

**Success Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-14T02:30:00.000Z",
  "database": {
    "connected": true,
    "responseTime": 42
  },
  "migrations": {
    "applied": ["000", "001", "011", "012", "013", "014", "015", "016"],
    "latest": "016",
    "count": 8
  },
  "schema": {
    "critical_tables": [
      {"name": "users", "exists": true},
      {"name": "households", "exists": true},
      {"name": "children", "exists": true},
      {"name": "tasks", "exists": true},
      {"name": "task_assignments", "exists": true},
      {"name": "task_completions", "exists": true}
    ],
    "all_tables_exist": true
  }
}
```

**Degraded Response (200 OK):**
```json
{
  "status": "degraded",
  "timestamp": "2025-12-14T02:30:00.000Z",
  "database": {
    "connected": true,
    "responseTime": 120
  },
  "migrations": {
    "applied": ["000", "001"],
    "latest": "001",
    "count": 2,
    "warning": "Expected 8 migrations, only 2 applied"
  },
  "schema": {
    "critical_tables": [
      {"name": "users", "exists": true},
      {"name": "households", "exists": false},
      {"name": "children", "exists": false},
      {"name": "tasks", "exists": false},
      {"name": "task_assignments", "exists": false},
      {"name": "task_completions", "exists": false}
    ],
    "all_tables_exist": false
  }
}
```

**Failure Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-12-14T02:30:00.000Z",
  "database": {
    "connected": false,
    "error": "Connection timeout"
  }
}
```

### Implementation Approach

**1. Database Connectivity Check:**
```typescript
const checkConnection = async () => {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return { connected: true, responseTime: Date.now() - start };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};
```

**2. Migration Status Check:**
```typescript
const checkMigrations = async () => {
  try {
    const result = await pool.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const applied = result.rows.map(row => row.version);
    return {
      applied,
      latest: applied[applied.length - 1] || null,
      count: applied.length
    };
  } catch (error) {
    return { error: 'schema_migrations table not found' };
  }
};
```

**3. Schema Validation:**
```typescript
const checkTables = async () => {
  const criticalTables = [
    'users', 'households', 'household_members', 'children',
    'tasks', 'task_assignments', 'task_completions'
  ];
  
  const checks = await Promise.all(
    criticalTables.map(async (tableName) => {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [tableName]
      );
      return { name: tableName, exists: result.rows[0].exists };
    })
  );
  
  return {
    critical_tables: checks,
    all_tables_exist: checks.every(t => t.exists)
  };
};
```

### Status Determination Logic
```typescript
let status = 'healthy';

if (!dbConnected) {
  status = 'unhealthy';
} else if (!allTablesExist || migrationCount < expectedCount) {
  status = 'degraded';
}
```

### Use Cases
1. **Deployment Verification**: Check after deploy completes
2. **Monitoring**: Poll endpoint periodically to detect issues
3. **Debugging**: When users report errors, check health endpoint
4. **Load Balancer**: Use as health check for routing decisions
5. **CI/CD**: Validate deployment before marking as successful

## Affected Areas
- [ ] Frontend (indirectly - can query for debugging)
- [x] Backend (health check endpoint)
- [x] Database (queried for status)
- [ ] Infrastructure (can be used by load balancers)
- [ ] CI/CD (can be used to verify deployment)
- [x] Documentation

## Implementation Plan

### Research Phase
- [ ] Review existing `/health` endpoint if one exists
- [ ] Understand Fastify route registration pattern
- [ ] Review pg Pool query patterns in codebase
- [ ] Decide on expected migration count (hardcode or dynamic?)

### Design Phase
- [ ] Design response schema
- [ ] Decide on status codes (200 vs 503)
- [ ] Design error handling for each check
- [ ] Plan test cases

### Implementation Steps
1. Checkout feature branch
2. Create `src/routes/health.ts` (or add to existing routes)
3. Implement `checkConnection()` function
4. Implement `checkMigrations()` function
5. Implement `checkTables()` function
6. Implement status determination logic
7. Create route handler combining all checks
8. Register route in server.ts
9. Add error handling
10. Add logging for failures
11. Test manually with curl
12. Write automated tests
13. Update documentation
14. Create PR

### Testing Strategy
- Unit tests for each check function
- Integration test for full endpoint
- Test with database connected
- Test with database down
- Test with partial schema (missing tables)
- Test with no migrations applied
- Test response time (should be fast)

## Progress Log
- [2025-12-14 02:30] Task created

## Testing Results
[To be filled during testing phase]

### Test Cases
- [ ] Database connected, all migrations applied, all tables exist → healthy
- [ ] Database connected, some migrations missing → degraded
- [ ] Database connected, tables missing → degraded
- [ ] Database not connected → unhealthy
- [ ] schema_migrations table missing → degraded

## Review Notes
[To be filled during review phase]

## Related PRs
[To be added when PR is created]

## Lessons Learned
[To be filled after completion]

