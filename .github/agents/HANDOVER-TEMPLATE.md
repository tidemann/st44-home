# Subagent Handover Template

## Purpose

This template ensures consistent, focused handovers from the orchestrator to specialized subagents. Following this pattern provides agents with all necessary context, reduces exploration time, and improves work quality.

## Template

```markdown
**Context Files** (read these first):
1. .github/agents/[AGENT-TYPE]-agent.md - Agent-specific patterns and conventions
2. CLAUDE.md - Project-wide conventions (especially "Key Conventions" section)
3. tasks/[items|features]/[TASK-FILE].md - Task specification and acceptance criteria

**Implementation Files** (your targets):
- [Exact file path to create/modify - be specific]
- [Another file path]
- [Third file path]

**Reference Files** (for examples/patterns):
- [Existing file that shows patterns to follow]
- [Another reference file]

**Task**:
[Clear, focused description of what needs to be done. 2-4 sentences maximum.]

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
- [ ] All tests pass
- [ ] Documentation updated

**Priority**: [High/Medium/Low] - [1-2 sentence explanation of why this matters]

**Testing**: [Specific commands to run and what to verify]
```

## Agent Type Selection

### Backend Work → backend-focused subagent
**Context File**: `.github/agents/backend-agent.md`

**Use For**:
- Fastify API endpoints
- Route handlers and controllers
- Business logic and services
- Middleware implementation
- Database queries (non-migration)
- Authentication/authorization logic
- API validation schemas

**Keywords**: API, endpoint, route, middleware, query, service, logic

---

### Frontend Work → frontend-focused subagent
**Context File**: `.github/agents/frontend-agent.md`

**Use For**:
- Angular components
- Services and state management
- UI/UX implementation
- Routing and navigation
- Form handling and validation
- HTTP client integration
- Component testing

**Keywords**: component, service, UI, form, routing, Angular, template

---

### Database Work → database-focused subagent
**Context File**: `.github/agents/database-agent.md`

**Use For**:
- Database schema changes
- Migration file creation
- SQL queries optimization
- Index creation
- Schema documentation
- Data seeding scripts
- Database testing

**Keywords**: migration, schema, table, column, SQL, database, index

---

### General-Purpose → Only for cross-cutting concerns
**Use Sparingly**

**Use For**:
- Documentation-only tasks (no code changes)
- Complex analysis spanning multiple domains
- Research and investigation tasks
- Cross-cutting refactoring
- Tasks without clear domain boundaries

**Keywords**: documentation, analysis, investigation, research, cross-cutting

## Complete Examples

### Example 1: Backend API Implementation

```markdown
**Context Files** (read these first):
1. .github/agents/backend-agent.md - Backend patterns and conventions
2. CLAUDE.md - Project conventions (camelCase, async/await, parameterized queries)
3. tasks/items/task-123-implement-notifications-api.md - Task specification

**Implementation Files** (your targets):
- apps/backend/src/routes/notifications.ts (create new)
- apps/backend/src/schemas/notifications.ts (create new)
- apps/backend/src/routes/index.ts (register new route)
- apps/backend/src/test-helpers/fixtures.ts (add notification fixtures)

**Reference Files** (for examples/patterns):
- apps/backend/src/routes/tasks.ts - CRUD pattern example
- apps/backend/src/schemas/tasks.ts - Schema validation pattern
- apps/backend/src/routes/tasks.test.ts - Integration test pattern

**Task**:
Implement notifications API with CRUD endpoints for managing user notifications.
Support filtering by read/unread status, pagination, and bulk mark-as-read operation.
Follow existing patterns for auth middleware and household scoping.

**Acceptance Criteria**:
- [ ] GET /api/households/:id/notifications - List with pagination
- [ ] GET /api/households/:id/notifications/:notificationId - Get single
- [ ] POST /api/households/:id/notifications - Create notification
- [ ] PATCH /api/households/:id/notifications/:notificationId - Mark as read
- [ ] POST /api/households/:id/notifications/mark-all-read - Bulk operation
- [ ] All endpoints require authentication and household membership
- [ ] Schema validation using @st44/types
- [ ] Integration tests with 80%+ coverage
- [ ] All 272+ backend tests pass

**Priority**: High - Critical for user engagement and feature visibility

**Testing**: Run `npm run test:backend` and verify notifications.test.ts passes
```

### Example 2: Frontend Component Implementation

```markdown
**Context Files** (read these first):
1. .github/agents/frontend-agent.md - Angular patterns (signals, standalone, inject)
2. CLAUDE.md - Project conventions (camelCase, OnPush, control flow syntax)
3. tasks/items/task-124-build-notifications-panel.md - Task specification

**Implementation Files** (your targets):
- apps/frontend/src/app/components/notifications-panel/notifications-panel.component.ts (create)
- apps/frontend/src/app/components/notifications-panel/notifications-panel.component.html (create)
- apps/frontend/src/app/components/notifications-panel/notifications-panel.component.scss (create)
- apps/frontend/src/app/services/notification.service.ts (create)
- apps/frontend/src/app/components/header/header.component.ts (add bell icon)

**Reference Files** (for examples/patterns):
- apps/frontend/src/app/components/task-list/task-list.component.ts - List pattern with signals
- apps/frontend/src/app/services/task.service.ts - API service pattern
- apps/frontend/src/app/components/header/header.component.html - Header integration

**Task**:
Build notifications panel component that displays user notifications with mark-as-read
functionality. Add bell icon to header with unread count badge. Use signals for reactive
state, standalone component pattern, and OnPush change detection.

**Acceptance Criteria**:
- [ ] Notification panel component created as standalone
- [ ] NotificationService created with API integration
- [ ] Bell icon in header shows unread count
- [ ] Clicking bell toggles notification panel
- [ ] Panel shows list of notifications with timestamps
- [ ] Mark as read functionality works
- [ ] Mark all as read button included
- [ ] Empty state message when no notifications
- [ ] All frontend tests pass (222+)
- [ ] Component tests for notifications panel

**Priority**: High - Completes user notifications feature

**Testing**: Run `npm run test:frontend` and manually test in browser at localhost:4200
```

### Example 3: Database Migration

```markdown
**Context Files** (read these first):
1. .github/agents/database-agent.md - Migration patterns and conventions
2. CLAUDE.md - Database section (idempotency, transactions, schema_migrations)
3. docker/postgres/migrations/README.md - Migration file requirements
4. tasks/items/task-125-add-notifications-table.md - Task specification

**Implementation Files** (your targets):
- docker/postgres/migrations/022_create_notifications_table.sql (create new)
- docker/postgres/init.sql (add notifications table for fresh installs)

**Reference Files** (for examples/patterns):
- docker/postgres/migrations/020_create_task_generator_schema.sql - Table creation pattern
- docker/postgres/migrations/021_rename_task_assignment_due_date.sql - Idempotency pattern
- docker/postgres/init.sql - Fresh install schema

**Task**:
Create notifications table migration with columns: id (UUID), household_id (UUID FK),
user_id (UUID FK), title (TEXT), message (TEXT), read (BOOLEAN), created_at (TIMESTAMP).
Include indexes on household_id, user_id, and read status. Make migration idempotent.

**Acceptance Criteria**:
- [ ] Migration file created with correct naming (022_create_notifications_table.sql)
- [ ] Table created with all required columns
- [ ] Foreign keys to households and users tables
- [ ] Indexes created: idx_notifications_household, idx_notifications_user, idx_notifications_read
- [ ] Migration wrapped in BEGIN/COMMIT transaction
- [ ] Idempotent (uses IF NOT EXISTS)
- [ ] schema_migrations table updated
- [ ] init.sql updated with notifications table
- [ ] Migration tested locally with up/down cycle

**Priority**: High - Blocks backend and frontend work on notifications

**Testing**: Run `docker exec -it st44-db psql -U postgres -d st44_dev -f /docker-entrypoint-initdb.d/migrations/022_create_notifications_table.sql` and verify `SELECT * FROM notifications LIMIT 1;` works
```

### Example 4: Documentation Task

```markdown
**Context Files** (read these first):
1. CLAUDE.md - Project structure and conventions
2. apps/backend/src/test-helpers/README.md - Example of good documentation
3. tasks/items/task-126-document-notification-system.md - Task specification

**Implementation Files** (your targets):
- docs/NOTIFICATIONS.md (create new)
- apps/backend/AGENTS.md (add notifications section)
- apps/frontend/AGENTS.md (add notifications section)
- README.md (add link to notifications docs)

**Reference Files** (for examples/patterns):
- apps/backend/src/test-helpers/README.md - Documentation structure example
- packages/types/README.md - Comprehensive guide example
- docs/DEPLOYMENT.md - Technical documentation pattern

**Task**:
Create comprehensive documentation for the notifications system covering architecture,
API endpoints, frontend components, database schema, and usage examples. Update agent
docs with notification patterns.

**Acceptance Criteria**:
- [ ] NOTIFICATIONS.md covers: overview, architecture, API reference, examples
- [ ] Backend AGENTS.md updated with notification endpoint patterns
- [ ] Frontend AGENTS.md updated with notification component patterns
- [ ] README.md links to notification docs
- [ ] Code examples for common scenarios
- [ ] Troubleshooting section included
- [ ] Diagrams or flow charts if helpful

**Priority**: Medium - Helps future developers understand the system

**Testing**: No code changes - review documentation for completeness and clarity
```

## Quality Checklist

Before spawning a subagent, verify your handover includes:

- [ ] ✅ Referenced agent spec file (`.github/agents/[TYPE]-agent.md`)
- [ ] ✅ Referenced CLAUDE.md for project conventions
- [ ] ✅ Referenced task file if one exists
- [ ] ✅ Listed 3-5 exact file paths for implementation
- [ ] ✅ Listed 2-3 reference files showing patterns
- [ ] ✅ Clear 2-4 sentence task description
- [ ] ✅ 5-8 explicit acceptance criteria as checkboxes
- [ ] ✅ Priority with 1-2 sentence justification
- [ ] ✅ Specific testing instructions with commands

## Common Mistakes

### ❌ DON'T: Skip Agent Spec File
```
Complete task-102 for shared test utilities.

[Long description without any references to agent files...]
```

### ✅ DO: Always Reference Agent Spec
```
**Context Files** (read these first):
1. .github/agents/backend-agent.md - Backend patterns
2. CLAUDE.md - Project conventions
3. tasks/items/task-102-evaluate-shared-test-utilities.md
```

---

### ❌ DON'T: Use "general-purpose" By Default
```
subagent_type: "general-purpose"
```

### ✅ DO: Use Specialized Agents
```
subagent_type: "backend"  // or "frontend", "database"
```

---

### ❌ DON'T: Vague File Paths
```
**Implementation Files**:
- Update backend test files
- Fix the helpers
```

### ✅ DO: Exact File Paths
```
**Implementation Files**:
- apps/backend/src/test-helpers/http.ts (create new)
- apps/backend/src/test-helpers/generators.ts (create new)
- apps/backend/src/test-helpers/fixtures.ts (enhance existing)
```

---

### ❌ DON'T: No Acceptance Criteria
```
**Task**: Add shared test utilities

[End of handover]
```

### ✅ DO: Explicit Checkboxes
```
**Acceptance Criteria**:
- [ ] HTTP client created
- [ ] Data generators created
- [ ] All tests pass
- [ ] Documentation updated
```

---

### ❌ DON'T: No Testing Instructions
```
**Testing**: Run tests
```

### ✅ DO: Specific Commands
```
**Testing**: Run `npm run test:backend` and verify all 272+ tests pass.
Check test-helpers/http.test.ts specifically.
```

## Benefits of This Pattern

1. **Reduced Context Switching**: Agent knows exactly what to read first
2. **Faster Execution**: No time wasted exploring for patterns
3. **Higher Quality**: Agent follows project conventions from the start
4. **Consistent Approach**: All agents work the same way
5. **Clear Success Criteria**: No ambiguity about what "done" means
6. **Testable**: Explicit instructions for verification
7. **Auditable**: Can review handover quality later

## Continuous Improvement

After each task, evaluate the handover:
- Did the agent ask for clarifications? (Context was incomplete)
- Did the agent follow conventions? (Maybe didn't read CLAUDE.md)
- Did the agent modify correct files? (File paths were unclear)
- Did tests pass first try? (Acceptance criteria were clear)

Refine the template based on learnings.

---

**Last Updated**: 2025-12-23
**Version**: 1.0
**Maintainer**: Orchestrator Agent
