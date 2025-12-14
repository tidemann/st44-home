# Task: Create Tasks Table

## Metadata
- **ID**: task-014
- **Feature**: feature-002 - Multi-Tenant Database Schema
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-14
- **Assigned Agent**: database
- **Estimated Duration**: 3-4 hours

## Description
Create the tasks table to store task templates/definitions within households. These are the chore definitions (e.g., "Take out trash", "Do dishes") that will be assigned to children on specific dates. Tasks include rule configuration for automatic assignment (weekly rotation, daily tasks, etc.) stored as JSONB for flexibility.

## Requirements
- Create tasks table scoped to households
- Store task name, description, points value
- Include rule_type and rule_config (JSONB) for automation
- Foreign key to households with CASCADE delete
- Index on household_id for efficient queries
- CHECK constraint for rule_type validation
- Include created_at and updated_at timestamps
- Create migration file following conventions

## Acceptance Criteria
- [ ] Migration file created (014_create_tasks_table.sql)
- [ ] Table has id, household_id (FK), name, description, points, rule_type, rule_config (JSONB), created_at, updated_at
- [ ] Foreign key to households with ON DELETE CASCADE
- [ ] CHECK constraint: rule_type IN ('weekly_rotation', 'repeating', 'daily')
- [ ] Index on household_id: idx_tasks_household
- [ ] Migration tested with sample tasks
- [ ] init.sql updated
- [ ] JSONB rule_config tested with valid JSON

## Dependencies
- task-011: Households table must exist

## Technical Notes

### Table Schema
```sql
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 10,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('weekly_rotation', 'repeating', 'daily')),
  rule_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_household ON tasks(household_id);
```

### Rule Types and Configuration

**weekly_rotation**
```json
{
  "day_of_week": "monday",
  "children_order": ["child-id-1", "child-id-2", "child-id-3"]
}
```

**repeating**
```json
{
  "frequency": "daily",
  "assigned_to": "child-id"
}
```

**daily**
```json
{
  "time": "19:00",
  "assigned_to": ["child-id-1", "child-id-2"]
}
```

### Design Decisions
- **points**: Gamification currency, default 10 per task
- **rule_config JSONB**: Flexible schema for different rule types
- **description TEXT**: Can be long instructions for children
- **rule_type CHECK**: Only supported automation types

### Example Data
```sql
-- Weekly trash rotation
INSERT INTO tasks (household_id, name, description, points, rule_type, rule_config)
VALUES (
  '<household-id>',
  'Take out trash',
  'Bring trash bins to curb on Sunday evening',
  15,
  'weekly_rotation',
  '{"day_of_week": "sunday", "children_order": ["child-1", "child-2", "child-3"]}'
);
```

### Testing Commands
```bash
# Apply migration
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/014_create_tasks_table.sql

# Test data
docker exec -it st44-db psql -U postgres -d st44 <<EOF
-- Valid task
INSERT INTO tasks (household_id, name, points, rule_type, rule_config)
VALUES ('<household-id>', 'Do dishes', 10, 'daily', '{"time": "19:00"}');

-- Should fail (invalid rule_type)
INSERT INTO tasks (household_id, name, points, rule_type)
VALUES ('<household-id>', 'Clean room', 10, 'whenever');

-- Test JSONB queries
SELECT name, rule_config->>'day_of_week' as day FROM tasks WHERE rule_type = 'weekly_rotation';
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
1. Create migration file `014_create_tasks_table.sql`
2. Add CREATE TABLE with all columns including JSONB
3. Add foreign key to households with CASCADE
4. Add CHECK constraint for rule_type
5. Create index on household_id
6. Add migration tracking
7. Test with sample tasks
8. Test JSONB queries
9. Update init.sql

### Testing Strategy
- Test foreign key constraint
- Test CASCADE delete
- Test CHECK constraint (invalid rule_type rejected)
- Test JSONB storage and retrieval
- Test JSONB query operators (->, ->>)
- Test points default value
- Verify index usage

## Progress Log
- [2025-12-14 00:20] Task created from feature-002 breakdown

## Related Files
- `docker/postgres/migrations/014_create_tasks_table.sql`
- `docker/postgres/init.sql`

## Lessons Learned
[To be filled after completion]
