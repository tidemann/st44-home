# Task: Create Task Completions Table

## Metadata
- **ID**: task-016
- **Feature**: feature-002 - Multi-Tenant Database Schema
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-14
- **Assigned Agent**: database
- **Estimated Duration**: 2-3 hours

## Description
Create the task_completions table to maintain a historical record of completed tasks. This table enables analytics, leaderboards, progress tracking, and points history. Each completion records when the task was done, who did it, and how many points were earned. This data is immutable (no updates, only inserts) to preserve history.

## Requirements
- Create task_completions table scoped to households
- Link to task_assignment and child
- Include completed_at timestamp and points_earned
- Foreign keys with CASCADE delete
- Indexes for analytics queries (by household, by child)
- Immutable history (no UPDATE, only INSERT)
- Create migration file following conventions

## Acceptance Criteria
- [ ] Migration file created (016_create_task_completions_table.sql)
- [ ] Table has id, household_id (FK), task_assignment_id (FK), child_id (FK), completed_at (TIMESTAMP), points_earned (INTEGER NOT NULL)
- [ ] Foreign keys to households, task_assignments, children with CASCADE
- [ ] Index on household_id: idx_task_completions_household
- [ ] Index on child_id: idx_task_completions_child
- [ ] Migration tested with sample completions
- [ ] init.sql updated
- [ ] Documented as append-only (no updates)

## Dependencies
- task-011: Households table must exist
- task-013: Children table must exist
- task-015: Task_assignments table must exist

## Technical Notes

### Table Schema
```sql
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  task_assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  points_earned INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_completions_household ON task_completions(household_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_child ON task_completions(child_id);
```

### Design Decisions
- **Immutable history**: Rows never updated, only inserted
- **points_earned stored**: Captures points at completion time (task.points may change later)
- **completed_at automatic**: Uses CURRENT_TIMESTAMP for accurate completion time
- **Duplicate child_id**: Denormalized from task_assignment for query performance

### Use Cases
- **Leaderboards**: "Top 5 children this month" (aggregate points_earned by child_id)
- **Progress tracking**: "Emma completed 12 tasks this week"
- **Points history**: "Total points earned by Emma: 340"
- **Parent analytics**: "Completion trends over last 3 months"
- **Rewards**: "Emma earned 50 points, unlocked reward!"

### Workflow
1. Child marks task complete in UI
2. Backend creates task_completions record with current points
3. Backend updates task_assignments.status to 'completed'
4. History preserved in task_completions forever

### Example Data
```sql
INSERT INTO task_completions (household_id, task_assignment_id, child_id, points_earned)
VALUES (
  '<household-id>',
  '<assignment-id>',
  '<child-id>',
  15
);
```

### Testing Commands
```bash
# Apply migration
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/016_create_task_completions_table.sql

# Test data
docker exec -it st44-db psql -U postgres -d st44 <<EOF
-- Create completion
INSERT INTO task_completions (household_id, task_assignment_id, child_id, points_earned)
VALUES ('<household-id>', '<assignment-id>', '<child-id>', 15);

-- Analytics query: Total points by child
SELECT child_id, SUM(points_earned) as total_points
FROM task_completions
WHERE household_id = '<household-id>'
GROUP BY child_id
ORDER BY total_points DESC;

-- Analytics query: Completions this week
SELECT COUNT(*) FROM task_completions
WHERE household_id = '<household-id>'
AND completed_at >= CURRENT_DATE - INTERVAL '7 days';
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
1. Create migration file `016_create_task_completions_table.sql`
2. Add CREATE TABLE with all columns
3. Add foreign keys with CASCADE
4. Create indexes on household_id and child_id
5. Add migration tracking
6. Test with sample completions
7. Test aggregate queries for analytics
8. Update init.sql
9. Document append-only nature

### Testing Strategy
- Test foreign key constraints
- Test CASCADE delete behavior
- Test completed_at automatic timestamp
- Test analytics queries (SUM, COUNT, GROUP BY)
- Test date range queries for trends
- Verify index usage on aggregate queries
- Test points_earned NOT NULL constraint

## Progress Log
- [2025-12-14 00:20] Task created from feature-002 breakdown

## Related Files
- `docker/postgres/migrations/016_create_task_completions_table.sql`
- `docker/postgres/init.sql`

## Lessons Learned
[To be filled after completion]
