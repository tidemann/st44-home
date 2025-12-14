# Feature: Multi-Tenant Database Schema

## Metadata
- **ID**: feature-002
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: ready-for-implementation
- **Priority**: critical
- **Created**: 2025-12-13
- **Updated**: 2025-12-14
- **Estimated Duration**: 2-3 days (10 tasks, ~25-35 hours total)

## Description
Design and implement a complete multi-tenant database schema that ensures proper data isolation between households while supporting efficient queries. This schema is the foundation for all application data and must be designed correctly from the start to prevent data leaks and support scalability.

## User Stories
- **As a** household admin, **I want** my household's data completely isolated from others, **so that** my family's information remains private
- **As a** developer, **I want** automatic tenant filtering on all queries, **so that** data leaks are prevented
- **As a** system administrator, **I want** efficient database queries, **so that** the application scales to thousands of households
- **As a** user, **I want** to belong to multiple households, **so that** I can manage multiple families (e.g., separated parents)

## Requirements

### Functional Requirements
- Households table as the primary tenant identifier
- All user data scoped to households
- Users can belong to multiple households with different roles
- Child profiles belong to households
- Tasks and assignments scoped to households
- Proper foreign key constraints
- Efficient indexes for tenant-filtered queries

### Non-Functional Requirements
- **Performance**: All queries with household_id use indexes (< 50ms)
- **Security**: Row-level security as backup to application logic
- **Data Integrity**: Foreign key constraints prevent orphaned records
- **Scalability**: Schema supports 10,000+ households

## Acceptance Criteria
- [ ] Households table created with proper columns
- [ ] Users table with authentication fields
- [ ] household_members junction table with roles
- [ ] Children table scoped to households
- [ ] Tasks table scoped to households
- [ ] task_assignments table scoped to households
- [ ] task_completions table for tracking
- [ ] All foreign keys properly defined
- [ ] Indexes on all household_id columns
- [ ] Row-level security policies defined
- [ ] Migration scripts tested
- [ ] Schema documented
- [ ] All tests passing

## Tasks
**✅ Tasks broken down and ready for implementation**

- [ ] [task-011](../items/task-011-create-households-table.md) - Create households table (2-3 hours, database)
- [ ] [task-012](../items/task-012-create-household-members-table.md) - Create household_members junction table (3-4 hours, database)
- [ ] [task-013](../items/task-013-create-children-table.md) - Create children table (2-3 hours, database)
- [ ] [task-014](../items/task-014-create-tasks-table.md) - Create tasks table (3-4 hours, database)
- [ ] [task-015](../items/task-015-create-task-assignments-table.md) - Create task_assignments table (3-4 hours, database)
- [ ] [task-016](../items/task-016-create-task-completions-table.md) - Create task_completions table (2-3 hours, database)
- [ ] [task-017](../items/task-017-add-performance-indexes.md) - Add performance indexes (2-3 hours, database)
- [ ] [task-018](../items/task-018-implement-row-level-security.md) - Implement row-level security policies (4-5 hours, database)
- [ ] [task-019](../items/task-019-document-schema-erd.md) - Document schema with ERD diagram (2-3 hours, orchestrator)
- [ ] [task-020](../items/task-020-migration-rollback-scripts.md) - Write migration rollback scripts (2-3 hours, database)

## Dependencies
- PostgreSQL 17 database
- Users table from feature-001 (authentication)

## Technical Notes

### Database Schema Overview

**Households (Tenants)**
```sql
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Household Memberships (Many-to-Many with Roles)**
```sql
CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'parent', 'child')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(household_id, user_id)
);

CREATE INDEX idx_household_members_household ON household_members(household_id);
CREATE INDEX idx_household_members_user ON household_members(user_id);
```

**Children (Profiles for Task Assignment)**
```sql
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  birth_year INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_children_household ON children(household_id);
```

**Tasks (Templates/Definitions)**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 10,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('weekly_rotation', 'repeating', 'daily')),
  rule_config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_household ON tasks(household_id);
```

**Task Assignments (Instances)**
```sql
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_assignments_household ON task_assignments(household_id);
CREATE INDEX idx_task_assignments_child ON task_assignments(child_id);
CREATE INDEX idx_task_assignments_due_date ON task_assignments(due_date);
```

**Task Completions (History)**
```sql
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  task_assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  points_earned INTEGER NOT NULL
);

CREATE INDEX idx_task_completions_household ON task_completions(household_id);
CREATE INDEX idx_task_completions_child ON task_completions(child_id);
```

### Row-Level Security (Backup Layer)
```sql
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
-- Policies to be defined per table
```

## UI/UX Considerations
N/A - This is a backend/database feature with no direct UI

## Implementation Plan
[To be filled by Orchestrator Agent after task breakdown]

## Progress Log
- [2025-12-13 21:20] Feature created for Epic-001
- [2025-12-14 00:25] Status changed to ready-for-implementation
- [2025-12-14 00:25] Tasks broken down: 10 database tasks created (25-35 hours estimated)

## Testing Strategy
- [ ] Migration up/down scripts tested
- [ ] Foreign key constraints verified
- [ ] Index performance tested (EXPLAIN ANALYZE)
- [ ] Row-level security policies tested
- [ ] Data isolation verified (cannot access other household's data)
- [ ] Cascade delete behavior tested
- [ ] Schema documentation complete

## Related PRs
[To be added when tasks are implemented]

## Demo/Screenshots
[ERD diagram to be added]

## Lessons Learned
[To be filled after completion]
