# Task: Create Task Assignments Table

## Metadata
- **ID**: task-015
- **Feature**: feature-002 - Multi-Tenant Database Schema
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: in-progress
- **Priority**: critical
- **Created**: 2025-12-14
- **Assigned Agent**: database
- **Estimated Duration**: 3-4 hours

## Description
Create the task_assignments table to store specific task instances assigned to children on specific dates. This table represents the actual work items that appear on children's task lists. Each assignment has a status (pending, completed, overdue) and links to both the task template and the assigned child.

## Requirements
- Create task_assignments table scoped to households
- Link to tasks template, child, and household
- Include due_date and status fields
- Support three statuses: pending, completed, overdue
- Multiple indexes for efficient queries (by household, child, due date)
- Foreign keys with CASCADE delete
- CHECK constraint for status validation
- Create migration file following conventions

## Acceptance Criteria
- [x] Migration file created (015_create_task_assignments_table.sql)
- [x] Table has id, household_id (FK), task_id (FK), child_id (FK), due_date (DATE), status, created_at
- [x] Foreign keys to households, tasks, and children with CASCADE
- [x] CHECK constraint: status IN ('pending', 'completed', 'overdue')
- [x] Index on household_id: idx_task_assignments_household
- [x] Index on child_id: idx_task_assignments_child
- [x] Index on due_date: idx_task_assignments_due_date
- [x] Migration tested with sample assignments
- [x] init.sql updated

## Dependencies
- task-011: Households table must exist
- task-013: Children table must exist
- task-014: Tasks table must exist

## Technical Notes

### Table Schema
```sql
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_household ON task_assignments(household_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_child ON task_assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_due_date ON task_assignments(due_date);
```

### Status Flow
```
pending → completed (when child marks done)
pending → overdue (automated, when due_date passes)
```

### Use Cases
- **Parent view**: "Show all pending tasks for this week" (filter by household_id, status, due_date range)
- **Child view**: "Show my tasks for today" (filter by child_id, due_date)
- **Automated jobs**: "Find overdue tasks" (filter by status='pending', due_date < today)
- **Reports**: "Completion rate this month" (aggregate by child_id, status)

### Index Rationale
- **household_id**: All queries filter by household (multi-tenancy)
- **child_id**: Child's personal task list queries
- **due_date**: Date range queries for weekly views, overdue detection

### Example Data
```sql
INSERT INTO task_assignments (household_id, task_id, child_id, due_date, status)
VALUES (
  '<household-id>',
  '<task-id>',
  '<child-id>',
  '2025-12-14',
  'pending'
);
```

### Testing Commands
```bash
# Apply migration
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/015_create_task_assignments_table.sql

# Test data
docker exec -it st44-db psql -U postgres -d st44 <<EOF
-- Create assignment
INSERT INTO task_assignments (household_id, task_id, child_id, due_date)
VALUES ('<household-id>', '<task-id>', '<child-id>', CURRENT_DATE);

-- Should fail (invalid status)
INSERT INTO task_assignments (household_id, task_id, child_id, due_date, status)
VALUES ('<household-id>', '<task-id>', '<child-id>', CURRENT_DATE, 'in_progress');

-- Test queries with indexes
EXPLAIN ANALYZE SELECT * FROM task_assignments WHERE household_id = '<id>' AND status = 'pending';
EXPLAIN ANALYZE SELECT * FROM task_assignments WHERE child_id = '<id>' AND due_date = CURRENT_DATE;
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
1. Create migration file `015_create_task_assignments_table.sql`
2. Add CREATE TABLE with all columns
3. Add foreign keys to households, tasks, children with CASCADE
4. Add CHECK constraint for status
5. Create three indexes (household_id, child_id, due_date)
6. Add migration tracking
7. Test with sample assignments
8. Verify index usage with EXPLAIN ANALYZE
9. Update init.sql

### Testing Strategy
- Test all foreign key constraints
- Test CASCADE delete behavior
- Test CHECK constraint (invalid status)
- Test default status value ('pending')
- Test index performance on common queries
- Test date range queries
- Verify multi-column WHERE clauses use indexes

## Progress Log
- [2025-12-14 00:20] Task created from feature-002 breakdown
- [2025-12-14 10:00] Status changed to in-progress; migration created
- [2025-12-14 10:05] Migration applied successfully; table structure verified
- [2025-12-14 10:10] Test inserts validated; CHECK constraint confirmed
- [2025-12-14 10:15] All three indexes created; foreign keys validated

## Completion
- **Status**: completed
- **Validation**: All acceptance criteria met; migration recorded in schema_migrations; inserts, constraints, and indexes verified

## Lessons Learned
- Reminder to check existing table schemas (children.birth_year vs birthdate) before writing test inserts
