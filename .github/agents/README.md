# Agent System Documentation

## Overview

This directory contains specifications for autonomous AI agents that manage the entire development lifecycle from strategic planning through implementation.

## Agent Hierarchy

```
🔵 Planner Agent (Strategic Layer)
   ↓ Features & Roadmap
🟢 Orchestrator Agent (Coordination Layer)
   ↓ Task Breakdown & Delegation
🟡 Expert Agents (Implementation Layer)
   ├── Frontend Agent (Angular/UI)
   ├── Backend Agent (Fastify/API)
   ├── Database Agent (PostgreSQL)
   ├── DevOps Agent (Docker/CI/CD)
   └── Testing Agent (Unit/Integration/E2E)
```

## Agent Specifications

### 🔵 [Planner Agent](planner-agent.md)
**Role**: Strategic Planning & Feature Definition

**Responsibilities**:
- Define features from product requirements
- Create comprehensive feature specifications
- Maintain long-term product roadmap
- Plan epics and feature groupings
- Prioritize based on value and feasibility
- Handoff to Orchestrator for execution

**Key Files**:
- Creates: `tasks/feature-XXX-name.md`, `tasks/epic-XXX-name.md`
- Maintains: `tasks/ROADMAP.md`
- Uses: `tasks/templates/feature.md`, `tasks/templates/epic.md`

---

### 🟢 [Orchestrator Agent](orchestrator-agent.md)
**Role**: System Architect & Task Coordinator

**Responsibilities**:
- Break down features into implementation tasks
- Research codebase and identify integration points
- Create detailed implementation plans
- Delegate work to expert agents
- Coordinate multi-agent collaboration
- Integrate changes and ensure quality
- Manage the complete task lifecycle

**Key Files**:
- Creates: `tasks/task-XXX-name.md`, `tasks/subtasks/task-XXX/*-instructions.md`
- Reads: `tasks/feature-XXX-name.md`, `tasks/epic-XXX-name.md`
- Uses: `tasks/templates/task.md`

---

### 🟡 [Frontend Agent](frontend-agent.md)
**Role**: Angular & UI/UX Expert

**Responsibilities**:
- Implement Angular components and services
- Manage state with signals and computed values
- Create accessible, responsive UI
- Follow Angular best practices (standalone, OnPush, inject())
- Implement routing and navigation
- Integrate with backend APIs

**Technologies**: Angular 21+, TypeScript, RxJS, TailwindCSS, Signals

---

### 🟡 [Backend Agent](backend-agent.md)
**Role**: Fastify & API Expert

**Responsibilities**:
- Implement RESTful API endpoints
- Handle business logic and validation
- Manage database connections and queries
- Implement error handling and logging
- Ensure security (CORS, auth, input validation)
- Write API documentation

**Technologies**: Fastify, Node.js, TypeScript, PostgreSQL client (pg)

---

### 🟡 [Database Agent](database-agent.md)
**Role**: PostgreSQL Expert

**Responsibilities**:
- Design database schemas
- Create and manage migrations
- Optimize queries and indexes
- Ensure data integrity
- Handle database connections
- Plan backup and recovery strategies

**Technologies**: PostgreSQL 17+, SQL, Database migrations

---

### 🟡 Expert Agents (Not Yet Specified)
- **DevOps Agent**: Docker, CI/CD, deployment, infrastructure
- **Testing Agent**: Unit tests, integration tests, E2E tests, accessibility testing

---

## Directory Structure

```
c:\code\st44\home\
├── .github\
│   └── agents\               # Agent specifications
│       ├── README.md         # This file
│       ├── planner-agent.md
│       ├── orchestrator-agent.md
│       ├── frontend-agent.md
│       ├── backend-agent.md
│       └── database-agent.md
│
├── tasks\                    # All work items
│   ├── README.md             # Workflow documentation
│   ├── ROADMAP.md            # Long-term product roadmap
│   │
│   ├── templates\            # Work item templates
│   │   ├── epic.md           # Epic template
│   │   ├── feature.md        # Feature template
│   │   └── task.md           # Task template
│   │
│   ├── epic-XXX-name.md      # Epic files
│   ├── feature-XXX-name.md   # Feature files
│   ├── task-XXX-name.md      # Task files
│   │
│   └── subtasks\             # Agent-specific instructions
│       └── task-XXX\
│           ├── frontend-agent-instructions.md
│           ├── backend-agent-instructions.md
│           └── database-agent-instructions.md
│
├── apps\                     # Application code
│   ├── frontend\             # Angular application
│   └── backend\              # Fastify server
│
├── docker\                   # Docker configurations
├── infra\                    # Infrastructure (Docker Compose, Nginx)
└── .github\
    └── copilot-instructions.md  # Project coding standards
```

## Work Item Hierarchy

### 📦 Epics
- **Definition**: Large strategic initiatives (weeks/months)
- **Contains**: 3-10 related features
- **Created by**: Planner Agent
- **Template**: `tasks/templates/epic.md`
- **Examples**: "User Management System", "Payment Processing"

### ✨ Features
- **Definition**: User-facing capabilities (days to 2 weeks)
- **Contains**: Multiple implementation tasks
- **Created by**: Planner Agent
- **Broken down by**: Orchestrator Agent (into tasks)
- **Template**: `tasks/templates/feature.md`
- **Examples**: "User Profile Management", "Password Reset Flow"

### ✅ Tasks
- **Definition**: Atomic implementation units (hours to 2-3 days)
- **Contains**: Specific technical work
- **Created by**: Orchestrator Agent (from features)
- **Implemented by**: Expert Agents
- **Template**: `tasks/templates/task.md`
- **Examples**: "Create users table", "Implement profile API"

## Workflow

### 1. Strategic Planning (Planner Agent)
```
Product Vision → Feature Definition → Roadmap Planning
                      ↓
            tasks/feature-XXX.md created
                      ↓
              status: pending
```

### 2. Task Breakdown (Orchestrator Agent)
```
Feature File (pending) → Research Codebase → Plan Implementation
                              ↓
                  Break into Tasks (REQUIRED)
                              ↓
                  tasks/task-XXX.md created
                              ↓
                      status: pending
```

### 3. Implementation (Expert Agents)
```
Task File (pending) → Agent Assigned → Implementation
                           ↓
                   Code/Schema Changes
                           ↓
                   Tests + Documentation
                           ↓
                  status: completed
```

### 4. Integration (Orchestrator Agent)
```
All Tasks Completed → Integration → PR Creation → Feature Complete
                                         ↓
                              Feature status: completed
```

### 5. Roadmap Update (Planner Agent)
```
Feature Completed → Update Roadmap → Plan Next Features
                          ↓
                  Continuous Planning
```

## Key Concepts

### Mandatory Feature Breakdown
⚠️ **Critical**: Every feature MUST be broken down into tasks before implementation begins.

The Orchestrator Agent is responsible for:
1. Reading feature file
2. Analyzing requirements
3. Creating task files for each component (database, backend, frontend, testing)
4. Linking tasks to parent feature
5. Only then starting implementation

### Traceability
Every work item links to its parent:
- Task → Feature → Epic
- Clear chain of responsibility
- Easy progress tracking
- Impact analysis

### Status Flow
```
pending → in-progress → review → completed
```

### Agent Coordination
- Agents communicate via markdown files
- Orchestrator creates detailed instructions in `tasks/subtasks/`
- Progress logged in work item files
- Changes tracked in Git commits

## Templates

### Using Templates

**For Planner Agent** (creating features/epics):
```bash
# Create a new feature
cp tasks/templates/feature.md tasks/feature-XXX-name.md

# Create a new epic
cp tasks/templates/epic.md tasks/epic-XXX-name.md
```

**For Orchestrator Agent** (creating tasks):
```bash
# Create a new task
cp tasks/templates/task.md tasks/task-XXX-name.md
```

### Template Locations
- **Epic Template**: `tasks/templates/epic.md`
- **Feature Template**: `tasks/templates/feature.md`
- **Task Template**: `tasks/templates/task.md`

## File Naming Conventions

```
epic-001-user-management-system.md
feature-001-user-registration.md
feature-002-user-profile.md
task-001-create-users-table.md
task-002-registration-api.md
task-003-registration-form.md
```

**Format**: `[type]-[###]-[kebab-case-name].md`
- Type: `epic`, `feature`, or `task`
- Number: Zero-padded 3-digit sequential ID
- Name: Descriptive kebab-case name

## Finding Work Items

### For Planner Agent
- **Roadmap**: `tasks/ROADMAP.md`
- **Epics**: `tasks/epic-*.md`
- **Features**: `tasks/feature-*.md`
- **Templates**: `tasks/templates/`

### For Orchestrator Agent
- **Pending Features**: `grep "Status.*pending" tasks/feature-*.md`
- **Feature Files**: `tasks/feature-*.md`
- **Task Files**: `tasks/task-*.md`
- **Templates**: `tasks/templates/`
- **Subtask Instructions**: `tasks/subtasks/task-XXX/`

### For Expert Agents
- **Assigned Tasks**: Look for your agent name in task metadata
- **Subtask Instructions**: `tasks/subtasks/task-XXX/[yourname]-agent-instructions.md`
- **Related Code**: Use semantic_search and grep_search
- **Project Standards**: `.github/copilot-instructions.md`

## Communication Patterns

### Planner → Orchestrator
- **Medium**: Feature file with `status: pending`
- **Content**: Complete requirements, user stories, acceptance criteria
- **Handoff**: Set status to pending when ready

### Orchestrator → Expert Agents
- **Medium**: Task file + subtask instructions
- **Content**: Detailed implementation plan, code context, specific requirements
- **Handoff**: Create task file and subtask instructions, assign agent

### Expert Agents → Orchestrator
- **Medium**: Progress log updates in task file
- **Content**: Implementation progress, questions, blockers
- **Completion**: Update task status to completed

### All Agents → Git
- **Medium**: Git commits and PRs
- **Content**: Code changes, commit messages referencing task IDs
- **Traceability**: PR descriptions link to task/feature files

## Best Practices

### For All Agents
1. Always read relevant documentation first
2. Update progress logs regularly
3. Link work items to parents
4. Follow project coding standards
5. Test before marking complete
6. Document decisions and learnings

### For Planner Agent
1. Write user-centric feature descriptions
2. Define clear, testable acceptance criteria
3. Balance scope with timeline
4. Consider technical feasibility
5. Maintain realistic roadmap
6. Gather feedback and iterate

### For Orchestrator Agent
1. Always break features into tasks first
2. Research codebase before planning
3. Create detailed implementation plans
4. Coordinate agent dependencies
5. Review work before integration
6. Learn from outcomes

### For Expert Agents
1. Follow subtask instructions carefully
2. Adhere to architectural patterns
3. Write tests for all changes
4. Document non-obvious decisions
5. Ask questions when unclear
6. Update progress proactively

## Getting Started

### As Planner Agent
1. Read project vision and goals
2. Review `tasks/ROADMAP.md` (create if doesn't exist)
3. Analyze user needs and business requirements
4. Create feature files using `tasks/templates/feature.md`
5. Update roadmap with planned features
6. Set feature status to `pending` for Orchestrator

### As Orchestrator Agent
1. Scan `tasks/` for features with `status: pending`
2. Read feature file thoroughly
3. Research codebase for context
4. Break feature into tasks (database → backend → frontend → testing)
5. Create task files using `tasks/templates/task.md`
6. Update feature file with task list
7. Begin task execution

### As Expert Agent
1. Check for tasks assigned to you
2. Read task file and subtask instructions
3. Review related code and patterns
4. Implement according to specifications
5. Write tests and documentation
6. Update progress log
7. Mark task complete when done

## Success Metrics

### Planner Agent
- Features have clear, complete requirements
- Roadmap is realistic and up-to-date
- Features align with business goals
- Minimal rework due to unclear requirements

### Orchestrator Agent
- Features successfully broken into tasks
- Task estimates are accurate
- Agent coordination is smooth
- All acceptance criteria met

### Expert Agents
- Code follows project standards
- All tests pass
- Implementation matches requirements
- Minimal bugs in production

## Continuous Improvement

All agents should:
1. Track outcomes vs. expectations
2. Document lessons learned
3. Update processes and templates
4. Share knowledge with other agents
5. Refine workflows based on feedback

## Questions?

- **Workflow**: See `tasks/README.md`
- **Coding Standards**: See `.github/copilot-instructions.md`
- **Agent Specs**: See individual agent markdown files in this directory
- **Templates**: See `tasks/templates/`
- **Examples**: See `tasks/task-001-example-user-profile.md`
