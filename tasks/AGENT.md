# Tasks Directory - Agent Context

## Overview

This directory contains all work items organized in a hierarchical structure: Epics → Features → Tasks. This is the central hub for planning, tracking, and documenting development work.

## Directory Structure

```
tasks/
├── README.md              # Workflow documentation
├── ROADMAP.md             # Product roadmap (Now/Next/Later/Backlog)
├── AGENT.md               # This file (agent context)
│
├── templates/             # Work item templates
│   ├── epic.md            # Epic template
│   ├── feature.md         # Feature template
│   └── task.md            # Task template
│
├── epics/                 # Strategic initiatives (weeks/months)
│   ├── epic-XXX-name.md
│   └── done/              # Completed epics
│
├── features/              # User-facing capabilities (days)
│   ├── feature-XXX-name.md
│   └── done/              # Completed features
│
├── tasks/                 # Implementation units (hours/days)
│   ├── task-XXX-name.md
│   └── done/              # Completed tasks
│
└── subtasks/              # Agent-specific instructions
    └── task-XXX/
        ├── frontend-agent-instructions.md
        ├── backend-agent-instructions.md
        └── database-agent-instructions.md
```

## Work Item Hierarchy

```
Epic (epic-001-user-management.md)
  ├─ Feature (feature-001-user-registration.md)
  │   ├─ Task (task-001-create-users-table.md)
  │   ├─ Task (task-002-registration-api.md)
  │   └─ Task (task-003-registration-form.md)
  │
  └─ Feature (feature-002-user-profile.md)
      ├─ Task (task-004-profile-schema.md)
      ├─ Task (task-005-profile-api.md)
      └─ Task (task-006-profile-ui.md)
```

## Agent Responsibilities

### Planner Agent
**Creates**: Epics (`epics/`) and Features (`features/`)
**Maintains**: `ROADMAP.md`
**Workflow**:
1. Analyze product requirements
2. Create epic files for large initiatives
3. Break down epics into features
4. Create feature files with user stories
5. Update roadmap
6. Set status to `pending` for Orchestrator pickup

**Files Created**:
- `epics/epic-XXX-description.md`
- `features/feature-XXX-description.md`

### Orchestrator Agent
**Creates**: Tasks (`tasks/`) and Subtask Instructions (`subtasks/`)
**Reads**: Features with `status: pending`
**Workflow**:
1. Discover pending features
2. Research codebase
3. Break feature into tasks (database → backend → frontend → testing)
4. Create task files for each component
5. Create subtask instructions for expert agents
6. Coordinate implementation
7. Integrate and validate

**Files Created**:
- `tasks/task-XXX-description.md`
- `subtasks/task-XXX/[agent]-instructions.md`

### Expert Agents
**Reads**: Tasks assigned to them, Subtask instructions
**Updates**: Task progress logs
**Workflow**:
1. Read task file and subtask instructions
2. Implement according to specifications
3. Update progress log in task file
4. Mark task complete when done

**Files Updated**:
- `tasks/task-XXX-description.md` (Progress Log section)

## File Naming Conventions

```
epics/epic-001-user-management-system.md
features/feature-001-user-registration.md
features/feature-002-user-profile.md
tasks/task-001-create-users-table.md
tasks/task-002-registration-api-endpoint.md
tasks/task-003-registration-form-component.md
```

**Format**: `[type]-[###]-[descriptive-name].md`
- Type: `epic`, `feature`, or `task`
- Number: Zero-padded 3-digit ID
- Name: Kebab-case description

## Status Values

- `pending` - Not yet started, ready for work
- `in-progress` - Currently being worked on
- `review` - Implementation complete, under review
- `completed` - Fully done, all acceptance criteria met
- `blocked` - Cannot proceed due to dependencies

## Priority Values

- `high` - Critical path, blocking other work
- `medium` - Important but not blocking
- `low` - Nice to have, can be deferred

## Archiving Completed Work

When work items reach `status: completed`, move them to `done/` folders:

```bash
# Epic completed
git mv epics/epic-001-name.md epics/done/

# Feature completed
git mv features/feature-001-name.md features/done/

# Task completed
git mv tasks/task-001-name.md tasks/done/
```

This keeps active directories clean while preserving history.

## Creating Work Items

### Create an Epic (Planner Agent)
```bash
cp templates/epic.md epics/epic-XXX-name.md
# Edit file: goals, timeline, features, success metrics
# Set status: pending
```

### Create a Feature (Planner Agent)
```bash
cp templates/feature.md features/feature-XXX-name.md
# Edit file: user stories, requirements, acceptance criteria
# Link to parent epic
# Set status: pending
# Update ROADMAP.md
```

### Create a Task (Orchestrator Agent)
```bash
cp templates/task.md tasks/task-XXX-name.md
# Edit file: requirements, acceptance criteria, implementation plan
# Link to parent feature and epic
# Assign to expert agent
# Set status: pending
```

## Finding Work Items

### For Planner Agent
```bash
# View roadmap
cat tasks/ROADMAP.md

# List all epics
ls tasks/epics/*.md

# List all features
ls tasks/features/*.md
```

### For Orchestrator Agent
```bash
# Find pending features
grep -l "Status.*pending" tasks/features/*.md

# List all features
ls tasks/features/*.md

# List all tasks
ls tasks/tasks/*.md
```

### For Expert Agents
```bash
# Find tasks assigned to you
grep -l "Assigned Agent.*frontend" tasks/tasks/*.md

# View your subtask instructions
cat tasks/subtasks/task-XXX/frontend-agent-instructions.md
```

## Updating Work Items

### Update Status
Edit the markdown file:
```markdown
## Metadata
- **Status**: in-progress  # Changed from pending
```

### Add Progress Log Entry
```markdown
## Progress Log
- [2025-12-13 14:30] Status changed to in-progress
- [2025-12-13 15:45] Database schema created
- [2025-12-13 16:20] API endpoints implemented
```

### Mark Task Complete
```markdown
## Metadata
- **Status**: completed

## Progress Log
- [2025-12-13 17:00] All acceptance criteria met
- [2025-12-13 17:15] Tests passing, PR created (#XX)
- [2025-12-13 17:30] Status changed to completed
```

## Subtask Instructions

For complex tasks requiring multiple agents, create detailed instructions:

**Directory**: `tasks/subtasks/task-XXX/`

**Files**:
- `frontend-agent-instructions.md` - Angular component implementation
- `backend-agent-instructions.md` - API endpoint implementation
- `database-agent-instructions.md` - Schema changes and migrations

**Content**: Specific, detailed instructions for that agent including:
- What to build
- Where to put it
- Patterns to follow
- Dependencies to consider
- Testing requirements

## Roadmap Management

**File**: `ROADMAP.md`

**Structure**:
- **Now** - Current sprint/month
- **Next** - Upcoming 1-3 months
- **Later** - 3-12 months
- **Backlog** - Ideas and potential work

**Maintained by**: Planner Agent

**Update frequency**: Weekly or when priorities change

## Best Practices

### For All Agents
- Always update progress logs with timestamps
- Link work items to parents (task → feature → epic)
- Keep status current
- Archive completed work to `done/` folders
- Use consistent naming conventions

### For Planner Agent
- Write clear, user-centric feature descriptions
- Define measurable acceptance criteria
- Balance scope with timeline
- Keep roadmap realistic and up-to-date
- Link features to epics

### For Orchestrator Agent
- **Always break features into tasks** before implementation
- Research codebase before planning
- Create detailed subtask instructions
- Coordinate agent dependencies
- Review and integrate work

### For Expert Agents
- Read task file and subtask instructions carefully
- Follow project conventions
- Update progress proactively
- Ask questions via progress log if blocked
- Mark complete only when all criteria met

## Common Workflows

### New Feature Request
1. Planner creates `features/feature-XXX.md`
2. Planner updates `ROADMAP.md`
3. Planner sets status to `pending`
4. Orchestrator discovers pending feature
5. Orchestrator breaks down into tasks
6. Expert agents implement tasks
7. Orchestrator integrates and validates
8. Feature marked `completed`
9. Feature moved to `features/done/`

### Task Lifecycle
```
Created (pending)
    ↓
Assigned to agent
    ↓
Agent starts (in-progress)
    ↓
Implementation
    ↓
Testing & validation
    ↓
Review
    ↓
Complete (completed)
    ↓
Moved to tasks/done/
```

## Integration with Git

Each work item typically results in:
- Feature branch: `feature/task-XXX-description`
- Commits referencing task ID
- Pull request linking to task file
- Merge and completion

## Related Documentation

- `README.md` - Detailed workflow guide
- `ROADMAP.md` - Product roadmap
- `templates/` - Work item templates
- `.github/agents/` - Agent specifications
- `.github/copilot-instructions.md` - Coding standards

---

**Last Updated**: 2025-12-13
**Update This File**: When workflow changes, new patterns emerge, or directory structure evolves
