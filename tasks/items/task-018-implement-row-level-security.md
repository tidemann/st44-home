# Task: Implement Row-Level Security Policies

## Metadata
- **ID**: task-018
- **Feature**: feature-002 - Multi-Tenant Database Schema
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: completed
- **Priority**: medium
- **Created**: 2025-12-14
- **Assigned Agent**: database
- **Estimated Duration**: 4-5 hours
- **Actual Duration**: 0.5 hours

## Description
Implement PostgreSQL Row-Level Security (RLS) policies as a backup security layer to application-level filtering. While the application enforces household_id filtering, RLS provides defense-in-depth at the database level. This prevents data leaks even if application code has bugs or is compromised.

## Requirements
- Enable RLS on all tenant-scoped tables
- Create policies for SELECT, INSERT, UPDATE, DELETE operations
- Policies use session variable for current household_id
- Test policies with different household contexts
- Document security architecture
- Create migration file following conventions
- Verify data isolation with test queries

## Acceptance Criteria
- [x] Migration file created (018_implement_row_level_security.sql)
- [x] RLS enabled on households, household_members, children, tasks, task_assignments, task_completions
- [x] Policies created for all tables restricting to current household_id
- [x] Session variable mechanism implemented (SET app.current_household_id)
- [x] Policies tested with multiple household contexts
- [x] Cannot see other household's data even with direct SQL
- [x] Migration tested
- [x] init.sql updated
- [x] Security documentation written (inline comments + test files)

## Dependencies
- All previous tasks (011-017) must be complete
- Tables must exist before RLS can be enabled

## Technical Notes

### Row-Level Security Overview
RLS is a PostgreSQL feature that restricts rows returned by queries based on policies. Even if SQL bypasses application logic, RLS prevents data leaks.

### Session Variable Pattern
```sql
-- Application sets household context
SET app.current_household_id = '<household-id>';

-- All queries automatically filtered
SELECT * FROM children;  -- Only returns children for current household
```

### RLS Policies

**Enable RLS on tables**
```sql
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
```

**Example policy: children table**
```sql
CREATE POLICY children_household_isolation ON children
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);
```

**Policy types**
- `FOR ALL`: Applies to SELECT, INSERT, UPDATE, DELETE
- `USING`: Rows visible (SELECT, UPDATE, DELETE)
- `WITH CHECK`: Rows allowed for INSERT/UPDATE

### Security Architecture

**Defense-in-depth layers:**
1. **Application**: Fastify middleware injects household_id into queries
2. **Database**: RLS policies enforce isolation at database level
3. **Network**: VPC/firewall restricts database access

### Testing Strategy
```bash
# Apply migration
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/018_implement_row_level_security.sql

# Test RLS policies
docker exec -it st44-db psql -U postgres -d st44 <<EOF
-- Create test data in two households
INSERT INTO households (id, name) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Family A'),
  ('22222222-2222-2222-2222-222222222222', 'Family B');

INSERT INTO children (household_id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Emma A'),
  ('22222222-2222-2222-2222-222222222222', 'Noah B');

-- Set context to Family A
SET app.current_household_id = '11111111-1111-1111-1111-111111111111';
SELECT * FROM children;  -- Should only see Emma A

-- Set context to Family B
SET app.current_household_id = '22222222-2222-2222-2222-222222222222';
SELECT * FROM children;  -- Should only see Noah B

-- No context set (should see nothing or error)
RESET app.current_household_id;
SELECT * FROM children;  -- Should see nothing
EOF
```

### Important Notes
- RLS policies apply to ALL queries, including EXPLAIN
- Superusers (postgres) BYPASS RLS by default (use SET ROLE for testing)
- Application must SET household context for EVERY connection
- Connection pooling: Set context on EACH query, not just connection

### Backend Integration
```typescript
// Fastify preHandler hook
async function setHouseholdContext(request, reply) {
  const householdId = request.user.currentHouseholdId;
  await db.query('SET app.current_household_id = $1', [householdId]);
}
```

## Affected Areas
- [x] Database (PostgreSQL)
- [x] Backend (Fastify/Node.js) - Must set session variable
- [ ] Frontend (Angular)
- [ ] Infrastructure (Docker/Nginx)
- [ ] CI/CD
- [x] Documentation

## Implementation Plan

### Research Phase
- [x] Study PostgreSQL RLS documentation
- [x] Understand session variables
- [x] Plan policy structure

### Implementation Steps
1. Create migration file `018_implement_row_level_security.sql`
2. Enable RLS on all tables (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
3. Create policies for each table using app.current_household_id
4. Test with multiple household contexts
5. Verify data isolation
6. Add migration tracking
7. Update init.sql
8. Document backend integration requirements
9. Write security architecture doc

### Testing Strategy
- Create data in multiple households
- Test SELECT queries with different contexts
- Test INSERT attempts to wrong household
- Test UPDATE/DELETE protection
- Verify superuser behavior
- Test with NULL household context
- Performance test (RLS overhead should be minimal)

## Progress Log
- [2025-12-14 00:20] Task created from feature-002 breakdown
- [2025-12-14 15:20] Status changed to in-progress; branch feature/task-018-row-level-security created
- [2025-12-14 15:25] Starting RLS implementation: enabling RLS on all tenant-scoped tables
- [2025-12-14 15:30] Migration file 018_implement_row_level_security.sql created with RLS policies
- [2025-12-14 15:35] Migration applied successfully - all tables now have RLS enabled
- [2025-12-14 15:40] RLS policies tested with non-superuser role (app_user)
- [2025-12-14 15:45] Verification complete: ✅ Family A sees only Emma, ✅ Family B sees only Noah, ✅ No context = error
- [2025-12-14 15:50] Updated init.sql with RLS setup for fresh installations
- [2025-12-14 15:55] All acceptance criteria met - task complete

## Related Files
- `docker/postgres/migrations/018_implement_row_level_security.sql`
- `docker/postgres/init.sql`
- Backend middleware (future): Authentication context setting

## Security Considerations
- **Defense-in-depth**: RLS is backup, not replacement for app logic
- **Performance**: RLS adds minimal overhead (< 1ms per query)
- **Testing**: Must test RLS with non-superuser roles
- **Connection pooling**: Context reset between requests

## Lessons Learned
[To be filled after completion]
