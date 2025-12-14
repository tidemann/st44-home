# Tasks Directory

This directory contains all work items organized by hierarchy: Epics → Features → Tasks.

## Work Item Hierarchy

### 📦 Epics (`epic-XXX-name.md`)
Large bodies of work representing major product initiatives.

- **Scope**: Multiple features, weeks/months timeline
- **Purpose**: Strategic goals and major capabilities
- **Examples**: "User Management System", "Payment Processing", "Analytics Platform"
- **Template**: `TEMPLATE-EPIC.md`

### ✨ Features (`feature-XXX-name.md`)
User-facing functionality that delivers specific value.

- **Scope**: Multiple tasks, days to 2 weeks timeline
- **Purpose**: Complete user-facing enhancements
- **Examples**: "User Profile Management", "Password Reset Flow", "Export Reports"
- **Template**: `TEMPLATE-FEATURE.md`
- **⚠️ Important**: Features MUST be broken down into tasks before implementation

### ✅ Tasks (`task-XXX-name.md`)
Atomic units of implementation work.

- **Scope**: Single responsibility, hours to 2-3 days
- **Purpose**: Specific technical implementation
- **Examples**: "Create user_profiles table", "Implement profile API", "Build profile form"
- **Template**: `TEMPLATE.md`

## Templates

Work item templates are located in `tasks/templates/`:
- **`epic.md`**: Template for creating new epics
- **`feature.md`**: Template for creating new features
- **`task.md`**: Template for creating new tasks

### Using Templates
```bash
# Create a new epic
cp tasks/templates/epic.md tasks/epic-XXX-name.md

# Create a new feature
cp tasks/templates/feature.md tasks/feature-XXX-name.md

# Create a new task
cp tasks/templates/task.md tasks/task-XXX-name.md
```

## Directory Structure

```
tasks/
├── epics/
│   ├── epic-001-user-management-system.md
│   └── done/  # Completed epics
├── features/
│   ├── feature-001-user-registration.md
│   ├── feature-002-user-profile.md
│   └── done/  # Completed features
├── tasks/
│   ├── task-001-create-users-table.md
│   ├── task-002-registration-api.md
│   ├── task-003-registration-form.md
│   └── done/  # Completed tasks
└── templates/
```

## Example Hierarchy

```
epics/epic-001-user-management-system.md
├── features/feature-001-user-registration.md
│   ├── tasks/task-001-create-users-table.md
│   ├── tasks/task-002-registration-api.md
│   └── tasks/task-003-registration-form.md
├── features/feature-002-user-profile.md
│   ├── tasks/task-004-extend-users-schema.md
│   ├── tasks/task-005-profile-api.md
│   └── tasks/task-006-profile-ui.md
└── features/feature-003-user-authentication.md
    ├── tasks/task-007-jwt-implementation.md
    ├── tasks/task-008-auth-middleware.md
    └── tasks/task-009-login-form.md
```

## Workflow

### Creating an Epic
1. Copy `templates/epic.md` to `epics/epic-XXX-name.md`
2. Fill in goals, timeline, success metrics
3. Identify major features
4. Create feature files and link to epic
5. Set status to `pending`

### Creating a Feature
1. Copy `templates/feature.md` to `features/feature-XXX-name.md`
2. Link to parent epic
3. Define user stories and acceptance criteria
4. Set status to `pending`
5. **Wait for Orchestrator Agent to break down into tasks**

### Creating a Task
1. Usually created by Orchestrator Agent during feature breakdown
2. Copy `templates/task.md` to `tasks/task-XXX-name.md`
3. Link to parent feature and epic
4. Define specific requirements and acceptance criteria
5. Assign to appropriate expert agent
6. Set status to `pending`

## Status Values

- **pending**: Not yet started, awaiting assignment
- **in-progress**: Currently being worked on
- **review**: Implementation complete, under review
- **completed**: Fully done, acceptance criteria met
- **blocked**: Cannot proceed due to dependencies or issues

## Archiving Completed Work

When work items are completed, move them to the appropriate `done/` folder:

```bash
# Move completed epic
git mv epics/epic-001-name.md epics/done/

# Move completed feature
git mv features/feature-001-name.md features/done/

# Move completed task
git mv tasks/task-001-name.md tasks/done/
```

This keeps active work items visible while preserving history.

## Priority Values

- **high**: Critical path, blocking other work
- **medium**: Important but not blocking
- **low**: Nice to have, can be deferred

## Agent Assignments

Tasks are assigned to specialized agents:

- **orchestrator**: Coordination, planning, integration
- **frontend**: Angular components, services, UI/UX
- **backend**: Fastify APIs, business logic, middleware
- **database**: PostgreSQL schema, migrations, queries
- **devops**: Docker, CI/CD, deployment
- **testing**: Unit tests, integration tests, E2E tests

## Best Practices

### For Epics
- Define clear business goals and success metrics
- Break down into 3-10 features
- Estimate realistic timelines
- Identify stakeholders and dependencies
- Review progress weekly

### For Features
- Write user stories from end-user perspective
- Define clear acceptance criteria
- **Always wait for task breakdown before implementation**
- Ensure independent release capability
- Include UI/UX considerations

### For Tasks
- Keep atomic and focused
- Estimate 2-3 days max per task
- Define clear technical requirements
- Link to parent feature and epic
- Include testing requirements
- Document progress regularly

## Subtasks

For complex tasks requiring multiple agents, create subtask instructions:

```
tasks/
  subtasks/
    task-XXX/
      frontend-agent-instructions.md
      backend-agent-instructions.md
      database-agent-instructions.md
```

## Progress Tracking

All work items include a **Progress Log** section for timestamped updates:

```markdown
## Progress Log
- [2024-01-15 10:00] Epic created
- [2024-01-15 11:30] Features identified
- [2024-01-16 09:00] Feature 001 completed
- [2024-01-18 14:20] Feature 002 in progress
```

## Integration with Git

Each task/feature typically results in:
- Feature branch: `feature/task-XXX-name`
- Pull request: Links back to task file
- Commit messages: Reference task ID

### PR Handoff Loop (Automated)
The orchestrator follows an autonomous workflow:
1. **Implement**: Create branch, implement task, commit changes
2. **Push & PR**: Push branch and open PR targeting main
3. **Handoff**: Invoke `review-and-merge.prompt.md` with PR number or branch
4. **CI Wait**: Unified prompt polls CI status until checks pass or fail
5. **Merge**: On green, squash-merge and delete branch
6. **Signal**: Emit "merge complete" signal
7. **Auto-Resume**: Automatically re-invoke `continue-work.prompt.md` to pick next priority

This loop runs without user confirmation, only pausing on CI failures or merge conflicts.

**Related Prompts**:
- `.github/prompts/continue-work.prompt.md` - Main workflow driver
- `.github/prompts/review-and-merge.prompt.md` - Unified handoff, CI wait, merge
- `.github/prompts/merge-pr.prompt.md` - Alias to unified flow

**Key PRs**:
- PR #42: Unified review/merge handoff and signals
- PR #43: Test database setup for E2E

## Examples

- `features/feature-001-user-profile.md` - Complete feature example
- See `.github/agents/` for agent specifications

## Questions?

Refer to:
- `.github/agents/orchestrator-agent.md` - Full workflow documentation
- `.github/copilot-instructions.md` - Project coding standards
- Agent specifications in `.github/agents/` - Role-specific guidelines
