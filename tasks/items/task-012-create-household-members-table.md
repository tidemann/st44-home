# Task: Create Household Members Junction Table

## Metadata
- **ID**: task-012
- **Feature**: feature-002 - Multi-Tenant Database Schema
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-14
- **Assigned Agent**: database
- **Estimated Duration**: 3-4 hours

## Description
Create the household_members junction table that implements the many-to-many relationship between users and households. Users can belong to multiple households with different roles (admin, parent, child). This table enables separated parents to manage multiple families, role-based permissions, and household access control.

## Requirements
- Create household_members table with proper foreign keys
- Support three roles: admin, parent, child
- Enforce unique constraint (one user per household)
- Add indexes on household_id and user_id for performance
- Include joined_at timestamp for audit trail
- Create migration file following conventions
- Test all constraints and indexes

## Acceptance Criteria
- [ ] Migration file created (012_create_household_members_table.sql)
- [ ] Table has id (UUID PK), household_id (FK), user_id (FK), role (CHECK constraint), joined_at
- [ ] Foreign keys to households and users with CASCADE delete
- [ ] UNIQUE constraint on (household_id, user_id)
- [ ] CHECK constraint: role IN ('admin', 'parent', 'child')
- [ ] Index on household_id: idx_household_members_household
- [ ] Index on user_id: idx_household_members_user
- [ ] Migration tested with INSERT attempts (valid and invalid)
- [ ] init.sql updated

## Dependencies
- task-011: Households table must exist
- feature-001: Users table must exist (already complete)

## Technical Notes

### Table Schema
```sql
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'parent', 'child')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(household_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);
```

### Role Definitions
- **admin**: Can manage household settings, invite users, delete household
- **parent**: Can create tasks, assign tasks, view reports
- **child**: Can view own tasks, mark tasks complete (future: linked to child profile)

### Performance Considerations
- Index on household_id for "get all members of household" queries
- Index on user_id for "get all households for user" queries
- Both columns frequently used in WHERE clauses

### Testing Commands
```bash
# Apply migration
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/012_create_household_members_table.sql

# Test constraints
docker exec -it st44-db psql -U postgres -d st44 <<EOF
-- Should succeed
INSERT INTO households (name) VALUES ('Test Family') RETURNING id;
INSERT INTO household_members (household_id, user_id, role) 
VALUES ('<household-id>', '<user-id>', 'admin');

-- Should fail (duplicate)
INSERT INTO household_members (household_id, user_id, role) 
VALUES ('<same-household-id>', '<same-user-id>', 'parent');

-- Should fail (invalid role)
INSERT INTO household_members (household_id, user_id, role) 
VALUES ('<household-id>', '<user-id>', 'superuser');
EOF
```

## Affected Areas
- [x] Database (PostgreSQL)
- [ ] Backend (Fastify/Node.js)
- [ ] Frontend (Angular)
- [ ] Infrastructure (Docker/Nginx)
- [ ] CI/CD
- [x] Documentation

## Implementation Plan

### Implementation Steps
1. Create migration file `012_create_household_members_table.sql`
2. Add CREATE TABLE with all columns
3. Add foreign key constraints with CASCADE
4. Add UNIQUE constraint on (household_id, user_id)
5. Add CHECK constraint for role validation
6. Create indexes on household_id and user_id
7. Add migration tracking
8. Test all constraints
9. Update init.sql

### Testing Strategy
- Test foreign key constraints (valid and invalid references)
- Test UNIQUE constraint (duplicate prevention)
- Test CHECK constraint (invalid roles rejected)
- Test CASCADE delete behavior
- Test index performance with EXPLAIN ANALYZE

## Progress Log
- [2025-12-14 00:20] Task created from feature-002 breakdown

## Related Files
- `docker/postgres/migrations/012_create_household_members_table.sql`
- `docker/postgres/init.sql`

## Lessons Learned
[To be filled after completion]
