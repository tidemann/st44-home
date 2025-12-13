# Subtasks Directory

## Purpose

This directory contains agent-specific implementation instructions for tasks. When the Orchestrator Agent breaks down a task that requires multiple expert agents, it creates detailed instruction files here for each agent.

## Structure

```
subtasks/
├── README.md (this file)
├── task-001/
│   ├── frontend-agent-instructions.md
│   ├── backend-agent-instructions.md
│   └── database-agent-instructions.md
├── task-002/
│   └── backend-agent-instructions.md
└── task-003/
    └── frontend-agent-instructions.md
```

## When to Create Subtask Instructions

### Orchestrator Creates Instructions When:
- Task requires coordination between multiple agents
- Detailed context needed beyond task file
- Specific implementation approach required
- Agent needs precise guidance on what to implement

### Don't Create Instructions When:
- Simple, straightforward tasks
- Single agent can work directly from task file
- Task has clear, self-explanatory requirements

## Instruction File Format

Each instruction file should contain:

```markdown
# [Agent Name] Instructions - Task XXX

## Context
[Brief overview of the task and why this agent is needed]

## What You Need to Implement
[Specific deliverables for this agent]

## Implementation Details
[Step-by-step guidance, code examples, patterns to follow]

## Dependencies
[What needs to be done before this]
[What other agents are working on]

## Files to Modify/Create
- `path/to/file1.ts` - Description of changes
- `path/to/file2.ts` - Description of changes

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Testing Requirements
[What tests this agent should write]

## Reference Documentation
- Link to AGENT.md files
- Link to relevant existing code
- Link to parent task file
```

## Example: User Profile Feature

### Task: Implement User Profile API (task-005)

**Subtasks created**:

#### `task-005/database-agent-instructions.md`
```markdown
# Database Agent Instructions - Task 005

## Context
Need to extend users table to support profile information (name, bio, avatar).

## What You Need to Implement
- Alter users table with new columns
- Update database AGENT.md with schema changes

## Implementation Details
ALTER TABLE users ADD COLUMN:
- name VARCHAR(255)
- bio TEXT
- avatar_url VARCHAR(500)
- updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

## Files to Modify
- `docker/init.sql` - Add columns (for new installs)
- `docker/AGENT.md` - Document new schema

## Acceptance Criteria
- [ ] Users table has new columns
- [ ] Columns allow NULL initially
- [ ] Schema documented in AGENT.md
```

#### `task-005/backend-agent-instructions.md`
```markdown
# Backend Agent Instructions - Task 005

## Context
Implement REST API endpoints for user profile management.

## What You Need to Implement
- GET /api/users/:id/profile
- PUT /api/users/:id/profile

## Dependencies
- Database Agent must complete schema changes first

## Files to Create/Modify
- `apps/backend/src/routes/profile.ts` - New route file
- `apps/backend/src/server.ts` - Register profile routes
- `apps/backend/AGENT.md` - Document new endpoints

## Implementation Details
[Detailed endpoint specs, validation rules, error handling...]

## Acceptance Criteria
- [ ] GET endpoint returns profile data
- [ ] PUT endpoint updates profile
- [ ] Validation works correctly
- [ ] Tests pass
```

#### `task-005/frontend-agent-instructions.md`
```markdown
# Frontend Agent Instructions - Task 005

## Context
Build UI components for viewing and editing user profile.

## What You Need to Implement
- ProfileService for API calls
- ProfileViewComponent
- ProfileEditFormComponent

## Dependencies
- Backend Agent must complete API endpoints first

## Files to Create/Modify
- `apps/frontend/src/app/services/profile.service.ts`
- `apps/frontend/src/app/components/profile-view/`
- `apps/frontend/src/app/components/profile-edit/`

## Implementation Details
[Component structure, form validation, signals usage...]

## Acceptance Criteria
- [ ] Profile displays correctly
- [ ] Form validation works
- [ ] Updates save successfully
- [ ] Accessibility requirements met
```

## Workflow

### Orchestrator's Process:
1. Read task file from `tasks/tasks/task-XXX.md`
2. Identify which agents needed (frontend, backend, database)
3. Create directory: `tasks/subtasks/task-XXX/`
4. Write instruction file for each agent
5. Update task file with links to instructions
6. Assign work to agents

### Expert Agent's Process:
1. Receive task assignment
2. Read main task file: `tasks/tasks/task-XXX.md`
3. Read agent-specific instructions: `tasks/subtasks/task-XXX/[agent]-instructions.md`
4. Read relevant AGENT.md files for context
5. Implement according to instructions
6. Update progress in task file
7. Mark subtask complete

## Benefits

### For Orchestrator:
- Clear delegation mechanism
- Detailed planning documentation
- Easy to track agent assignments
- Reusable patterns for similar tasks

### For Expert Agents:
- Clear, specific instructions
- All context in one place
- No ambiguity about what to implement
- Easy to reference during work

### For System:
- Traceability of decisions
- Documentation of approach
- Learning from outcomes
- Pattern library building

## Best Practices

### Do:
- ✅ Be specific and detailed in instructions
- ✅ Include code examples when helpful
- ✅ Reference existing patterns
- ✅ Define clear acceptance criteria
- ✅ Link to relevant documentation
- ✅ Specify dependencies clearly

### Don't:
- ❌ Create instructions for trivial tasks
- ❌ Be vague or ambiguous
- ❌ Assume agent has context
- ❌ Skip testing requirements
- ❌ Forget to link to task file

## Cleanup

After task completion:
- Keep instruction files for reference
- They document the approach taken
- Useful for similar future tasks
- Part of project knowledge base

Consider moving to `done/` only if:
- Task is fully complete
- Instructions no longer referenced
- Want to reduce clutter

## Related Files

- `../tasks/task-XXX.md` - Parent task files
- `../features/feature-XXX.md` - Parent feature files
- `../../.github/agents/orchestrator-agent.md` - Orchestrator workflow
- `../../.github/agents/README.md` - Agent system overview

---

**Last Updated**: 2025-12-13
**Maintained by**: Orchestrator Agent
