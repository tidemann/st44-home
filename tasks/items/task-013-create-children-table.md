# Task: Create Children Table

## Metadata
- **ID**: task-013
- **Feature**: feature-002 - Multi-Tenant Database Schema
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: completed
- **Priority**: critical
- **Created**: 2025-12-14
- **Completed**: 2025-12-14
- **Assigned Agent**: database
- **Estimated Duration**: 2-3 hours
- **Actual Duration**: 0.5 hours

## Description
Create the children table to store child profiles within households. These profiles represent the children who will be assigned tasks (separate from user accounts). A child profile includes name and birth year for age-appropriate task assignment. This enables the core functionality of the chore app: assigning tasks to specific children.

## Requirements
- Create children table scoped to households
- Store child name and birth_year
- Foreign key to households with CASCADE delete
- Index on household_id for efficient queries
- Include created_at and updated_at timestamps
- Create migration file following conventions
- Test data isolation (children only visible to their household)

## Acceptance Criteria
- [x] Migration file created (013_create_children_table.sql)
- [x] Table has id (UUID PK), household_id (FK), name (VARCHAR 255 NOT NULL), birth_year (INTEGER), created_at, updated_at
- [x] Foreign key to households with ON DELETE CASCADE
- [x] Index on household_id: idx_children_household
- [x] Migration tested with sample data
- [x] init.sql updated
- [x] Data isolation verified (cannot see other household's children)

## Dependencies
- task-011: Households table must exist

## Technical Notes

### Table Schema
```sql
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  birth_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_children_household ON children(household_id);
```

### Design Decisions
- **birth_year instead of birthdate**: Provides age context without privacy concerns
- **No user_id link**: Children profiles are separate from user accounts (for young children)
- **household_id required**: Every child belongs to exactly one household
- **CASCADE delete**: If household deleted, children profiles automatically deleted

### Use Cases
- Parent creates child profile: "Emma, born 2015"
- System uses birth_year for age-appropriate task assignment
- Task assignment references child_id, not user_id
- Future: Older children could link child profile to user account

### Testing Commands
```bash
# Apply migration
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/013_create_children_table.sql

# Test data insertion
docker exec -it st44-db psql -U postgres -d st44 <<EOF
-- Create test data
INSERT INTO children (household_id, name, birth_year) 
VALUES ('<household-id>', 'Emma', 2015);

INSERT INTO children (household_id, name, birth_year) 
VALUES ('<household-id>', 'Noah', 2018);

-- Verify data
SELECT * FROM children WHERE household_id = '<household-id>';

-- Verify index usage
EXPLAIN ANALYZE SELECT * FROM children WHERE household_id = '<household-id>';
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
1. Create migration file `013_create_children_table.sql`
2. Add CREATE TABLE with all columns
3. Add foreign key to households with CASCADE
4. Create index on household_id
5. Add migration tracking
6. Test with sample data
7. Verify index performance
8. Update init.sql

### Testing Strategy
- Test foreign key constraint (valid household_id)
- Test CASCADE delete (delete household, children deleted too)
- Test index usage with EXPLAIN ANALYZE
- Test data isolation query patterns
- Test birth_year nullable (some parents may not want to specify)

## Progress Log
- [2025-12-14 00:20] Task created from feature-002 breakdown
- [2025-12-14 02:10] Status changed to in-progress
- [2025-12-14 02:15] Migration file 013_create_children_table.sql created
- [2025-12-14 02:20] Updated init.sql with children table, index, and trigger
- [2025-12-14 02:25] Migration applied successfully and columns verified
- [2025-12-14 02:30] Sample data inserted and scoped queries verified
- [2025-12-14 02:35] CASCADE delete verified (children removed with household)
- [2025-12-14 02:40] Migration recorded in schema_migrations (version 013)
- [2025-12-14 02:45] Idempotency confirmed (safe to run multiple times)
- [2025-12-14 02:50] All acceptance criteria met, status changed to completed

## Related Files
- `docker/postgres/migrations/013_create_children_table.sql`
- `docker/postgres/init.sql`

## Lessons Learned
- Index on household_id ensures efficient scoped queries
- Using birth_year (nullable) balances utility and privacy
- Clear migration conventions speed up implementation
- Testing CASCADE deletes prevents orphaned records
