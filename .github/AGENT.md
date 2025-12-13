# .github Directory - Agent Context

## Overview

Contains GitHub-specific configurations, CI/CD workflows, and AI agent system specifications. This directory defines how the project operates on GitHub and how AI agents collaborate on development.

## Directory Structure

```
.github/
├── copilot-instructions.md    # Project coding standards and conventions
├── workflows/                  # GitHub Actions CI/CD (future)
└── agents/                     # AI agent specifications
    ├── README.md               # Agent system overview
    ├── planner-agent.md        # Strategic planning agent
    ├── orchestrator-agent.md   # Coordination agent
    ├── frontend-agent.md       # Angular expert agent
    ├── backend-agent.md        # Fastify expert agent
    └── database-agent.md       # PostgreSQL expert agent
```

## Copilot Instructions

**File**: `copilot-instructions.md`

**Purpose**: Defines project-wide coding standards, conventions, and best practices that all agents and developers must follow.

**Contents**:
- TypeScript best practices
- Angular conventions (standalone, signals, OnPush)
- Fastify patterns
- Accessibility requirements
- Git workflow
- Environment configuration
- Project structure

**When to Update**:
- New patterns emerge
- Architecture changes
- Technology upgrades
- Convention changes
- New best practices adopted

**Who Updates**: Any agent making architectural decisions should update this file

## Agent System

**Directory**: `agents/`

**Purpose**: Specifications for autonomous AI agents that manage the development lifecycle.

### Agent Hierarchy
```
Planner Agent (Strategic)
    ↓ Features & Roadmap
Orchestrator Agent (Coordination)
    ↓ Task Breakdown
Expert Agents (Implementation)
```

### Agent Specifications

#### `README.md`
Complete overview of the agent system:
- Agent hierarchy and roles
- Directory structure
- Work item hierarchy (epics → features → tasks)
- Workflow documentation
- Template usage
- Communication patterns
- Best practices

#### `planner-agent.md`
Strategic planning and feature definition expert:
- Creates epic and feature files
- Maintains product roadmap
- Defines user stories and requirements
- Prioritizes work
- Hands off to Orchestrator

#### `orchestrator-agent.md`
System architect and task coordinator:
- Breaks features into implementation tasks
- Researches codebase
- Creates implementation plans
- Delegates to expert agents
- Integrates work
- Manages quality

#### `frontend-agent.md`
Angular and UI/UX expert:
- Implements Angular components
- Manages state with signals
- Follows accessibility guidelines
- Integrates with backend APIs
- Writes frontend tests

#### `backend-agent.md`
Fastify and API expert:
- Implements REST endpoints
- Handles business logic
- Manages database connections
- Ensures security
- Writes backend tests

#### `database-agent.md`
PostgreSQL expert:
- Designs database schemas
- Creates migrations
- Optimizes queries
- Ensures data integrity
- Plans indexes

### When to Update Agent Specs

**Update immediately when**:
- New patterns emerge in the codebase
- Architecture changes
- New tools or libraries adopted
- Workflow improvements identified
- Common issues documented

**Example Updates**:
- Added new API pattern → Update `backend-agent.md`
- New component pattern → Update `frontend-agent.md`
- Migration system implemented → Update `database-agent.md`
- Changed task breakdown process → Update `orchestrator-agent.md`
- New prioritization framework → Update `planner-agent.md`

## GitHub Actions (Future)

**Directory**: `workflows/` (to be created)

**Purpose**: CI/CD automation

**Planned Workflows**:
- `ci.yml` - Run tests, linting on PRs
- `build.yml` - Build Docker images
- `deploy.yml` - Deploy to production
- `security.yml` - Security scanning

**Example CI Workflow** (future):
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run lint
```

## Maintaining This Directory

### Regular Updates

**copilot-instructions.md**:
- Review monthly
- Update when conventions change
- Keep aligned with actual codebase
- Document all major patterns

**Agent Specifications**:
- Update during implementation
- Document new patterns immediately
- Keep workflow sections current
- Add examples of solved problems

**Workflow Files** (when created):
- Keep in sync with infrastructure
- Update when dependencies change
- Test thoroughly before merging

### Update Process

1. **Identify Change**: New pattern, convention, or workflow
2. **Document**: Update relevant markdown file
3. **Review**: Ensure accuracy and completeness
4. **Commit**: Include in same PR as code changes
5. **Communicate**: Mention updates in PR description

### Quality Standards

All documentation in `.github/` should be:
- ✅ Accurate (reflects actual implementation)
- ✅ Complete (includes all necessary context)
- ✅ Clear (easy to understand and follow)
- ✅ Up-to-date (not outdated information)
- ✅ Actionable (provides concrete guidance)

## Integration with Project

### For AI Agents
1. **Read** `copilot-instructions.md` before any work
2. **Follow** relevant agent specification
3. **Update** agent spec when patterns change
4. **Reference** in commit messages when relevant

### For Developers
1. **Follow** `copilot-instructions.md` conventions
2. **Understand** agent system (useful context)
3. **Update** documentation with code changes
4. **Review** before starting new features

### For Pull Requests
- Link to relevant agent specs if architectural
- Update `copilot-instructions.md` if conventions change
- Include "docs: update agent context" commits
- Mention documentation updates in PR description

## Common Tasks

### Add New Coding Convention
1. Update `copilot-instructions.md`
2. Add example code
3. Explain rationale
4. Commit with descriptive message

### Create New Agent Spec
1. Copy similar agent as template
2. Define role and responsibilities
3. Document workflow and patterns
4. Add to `agents/README.md`
5. Update this file (AGENT.md)

### Update Agent Workflow
1. Edit relevant agent spec file
2. Update workflow section
3. Add examples if helpful
4. Update decision-making framework
5. Commit changes

## Examples of Good Documentation

### ✅ Good: Specific and Actionable
```markdown
## Component Pattern
Always use ChangeDetectionStrategy.OnPush:
\`\`\`typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
\`\`\`
```

### ❌ Bad: Vague and Generic
```markdown
## Component Pattern
Use good practices for components.
```

### ✅ Good: Current and Accurate
```markdown
## State Management
Use signals (as of Angular 21+):
\`\`\`typescript
const count = signal(0);
\`\`\`
Do NOT use NgRx - removed from project.
```

### ❌ Bad: Outdated
```markdown
## State Management
Use NgRx for state management.
```

## Related Files

- `../AGENT.md` - Project root context
- `../tasks/AGENT.md` - Tasks directory context
- `../apps/frontend/AGENT.md` - Frontend context
- `../apps/backend/AGENT.md` - Backend context
- `../infra/AGENT.md` - Infrastructure context
- `../docker/AGENT.md` - Docker context

---

**Last Updated**: 2025-12-13
**Update This File**: When adding new agent specs, changing workflows, or updating documentation structure
