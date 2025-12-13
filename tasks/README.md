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

## File Naming Convention

```
epic-001-user-management-system.md
feature-001-user-registration.md
feature-002-user-profile.md
task-001-create-users-table.md
task-002-registration-api.md
task-003-registration-form.md
```

## Example Hierarchy

```
epic-001-user-management-system.md
├── feature-001-user-registration.md
│   ├── task-001-create-users-table.md
│   ├── task-002-registration-api.md
│   └── task-003-registration-form.md
├── feature-002-user-profile.md
│   ├── task-004-extend-users-schema.md
│   ├── task-005-profile-api.md
│   └── task-006-profile-ui.md
└── feature-003-user-authentication.md
    ├── task-007-jwt-implementation.md
    ├── task-008-auth-middleware.md
    └── task-009-login-form.md
```

## Workflow

### Creating an Epic
1. Copy `TEMPLATE-EPIC.md` to `epic-XXX-name.md`
2. Fill in goals, timeline, success metrics
3. Identify major features
4. Create feature files and link to epic
5. Set status to `pending`

### Creating a Feature
1. Copy `TEMPLATE-FEATURE.md` to `feature-XXX-name.md`
2. Link to parent epic
3. Define user stories and acceptance criteria
4. Set status to `pending`
5. **Wait for Orchestrator Agent to break down into tasks**

### Creating a Task
1. Usually created by Orchestrator Agent during feature breakdown
2. Copy `TEMPLATE.md` to `task-XXX-name.md`
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

## Examples

- `task-001-example-user-profile.md` - Complete example showing full workflow
- See `.github/agents/` for agent specifications

## Questions?

Refer to:
- `.github/agents/orchestrator-agent.md` - Full workflow documentation
- `.github/copilot-instructions.md` - Project coding standards
- Agent specifications in `.github/agents/` - Role-specific guidelines
