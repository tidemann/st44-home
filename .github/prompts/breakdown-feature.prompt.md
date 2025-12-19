---
description: Break down a feature into implementation tasks
agent: planner-agent
---

# Break Down Feature into Tasks

**MANDATORY**: Every feature MUST be broken down into tasks before implementation begins.

## Your Task

### STEP 0: Read Context (REQUIRED FIRST)
**Before breaking down the feature, gather all necessary context:**

1. **Read the feature file** specified by the user
2. **Read product context**:
   - `README.md` - Product overview and technical stack
   - `IMPLEMENTATION_PLAN.md` - Technical architecture and patterns
3. **Read technical documentation**:
   - `AGENTS.md` - Project architecture overview
   - `apps/frontend/AGENTS.md` - Frontend patterns and conventions
   - `apps/backend/AGENTS.md` - Backend patterns and conventions
   - `docker/AGENTS.md` - Database schema and patterns
4. **Check parent epic** (if linked) for context and requirements

**Only after reading context, proceed with the breakdown.**

### STEP 1: Analyze and Break Down

1. **Analyze scope**: Identify all affected architectural layers:
   - Database: Schema changes, migrations, indexes
   - Backend: API endpoints, business logic, middleware, validation
   - Frontend: Components, services, routing, forms, UI/UX
   - Testing: Unit tests, integration tests, E2E tests
   - DevOps: Configuration, environment variables, deployment changes
2. **Identify dependencies**: Determine task sequence and what must be completed first
3. **Create task files**: For each component, create a task file in `tasks/items/`:
   - Use naming: `task-XXX-descriptive-name.md`
   - Link to parent feature
   - Define clear acceptance criteria
   - Estimate complexity (hours/days)
   - Identify dependencies
4. **Sequence tasks**: Order tasks logically based on dependencies
5. **Update feature file**: Add task list with links to all created tasks
6. **Update ROADMAP.md**: Add tasks to "Now" section in priority order
7. **Get confirmation**: Present breakdown to user before proceeding to implementation

## Task Creation Guidelines

### Database Tasks
- Schema changes (CREATE TABLE, ALTER TABLE)
- Indexes for performance
- Data migrations if needed
- Update `docker/AGENTS.md` with new schema

### Backend Tasks
- API endpoint implementation
- Request/response DTOs
- Business logic and validation
- Error handling
- Update `apps/backend/AGENTS.md` with new patterns

### Frontend Tasks
- UI components (presentational)
- Form components (if needed)
- Services for API calls
- Routing updates
- State management with signals
- Update `apps/frontend/AGENTS.md` with new patterns

### Testing Tasks
- Backend unit tests
- Frontend component tests
- Integration tests
- E2E test scenarios

## Task Size Guidelines

**Good task size**: 
- 2-8 hours of work
- 50-300 lines of code
- Single responsibility
- Clear completion criteria

**Too large** (break down further):
- >2 days of work
- >500 lines of code
- Multiple architectural layers
- Unclear how to start

**Too small** (combine):
- <1 hour of work
- <20 lines of code
- Trivial changes

## Example Breakdown

Feature: User Profile Management (feature-002)

**Tasks created:**
1. `task-004-extend-users-schema.md` - Add profile fields to users table
2. `task-005-profile-api-endpoints.md` - GET/PUT /api/users/:id/profile
3. `task-006-profile-service.md` - Frontend service for profile API
4. `task-007-profile-form-component.md` - Editable profile form UI
5. `task-008-profile-tests.md` - Unit and integration tests

**Dependencies:**
- task-005 depends on task-004 (API needs schema)
- task-006 depends on task-005 (service needs API)
- task-007 depends on task-006 (UI needs service)
- task-008 depends on task-007 (tests need implementation)

## Success Criteria

- [ ] All architectural layers identified and have corresponding tasks
- [ ] Each task has clear, measurable acceptance criteria
- [ ] Task dependencies documented
- [ ] Task sequence makes logical sense
- [ ] All tasks are appropriately sized (2-8 hours each)
- [ ] Feature file updated with complete task list
- [ ] ROADMAP.md updated with task priorities
- [ ] User confirms breakdown before implementation starts

## Reference Documentation

- [tasks/AGENTS.md](../../tasks/AGENTS.md) - Work item management
- [tasks/templates/task.md](../../tasks/templates/task.md) - Task template
- [Orchestrator Agent](../../.github/agents/orchestrator-agent.md) - Feature breakdown process
