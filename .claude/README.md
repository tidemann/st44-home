# Claude Code Configuration

This directory contains Claude Code-specific configuration for autonomous development.

## Directory Structure

```
.claude/
├── settings.json          # Permissions and configuration
├── agents/                # Optimized agent specifications
│   ├── orchestrator.md    # System architect & coordinator
│   ├── frontend.md        # Angular expert (200 lines)
│   ├── backend.md         # Fastify expert (200 lines)
│   ├── database.md        # PostgreSQL expert (200 lines)
│   ├── cicd.md            # CI/CD monitor (200 lines)
│   └── github-issues.md   # Issue tracker (200 lines)
├── commands/              # Command entry points
│   ├── continue-work.md   # Main autonomous loop
│   ├── frontend.md        # Frontend task handler
│   ├── backend.md         # Backend task handler
│   ├── database.md        # Database task handler
│   └── ship.md            # PR and merge workflow
└── README.md              # This file
```

## Quick Start

### Start Autonomous Development

Tell Claude Code:

```
Read tasks/ROADMAP.md and execute the top priority from the "Now" section
```

### Use Skills (Slash Commands)

```
/frontend     # Execute frontend development task
/backend      # Execute backend development task
/database     # Execute database migration task
/continue-work # Start/continue autonomous loop
/ship         # Create PR and merge
```

### Manual Agent Invocation

```
Read .claude/commands/frontend.md and implement [task]
Read .claude/commands/backend.md and implement [task]
Read .claude/commands/database.md and implement [task]
```

## Agent System

### Agent Specifications

All agents are optimized to 200-400 lines, focusing on:

- **Critical workflows** and checklists
- **Mandatory requirements** (local testing, naming conventions)
- **Quality gates** and validation
- **Common patterns** and templates
- **Success metrics** and goals

### Agent Hierarchy

**Orchestrator** → Coordinates all agents, ensures quality
├── **Frontend Agent** → Angular components, UI/UX
├── **Backend Agent** → Fastify APIs, business logic
├── **Database Agent** → Migrations, schema changes
├── **CI/CD Agent** → Build monitoring, quality gates
└── **GitHub Issues Agent** → Issue tracking, milestones

### Key Improvements from Original

**Original (.github/agents/)**: 1000+ lines per agent, verbose examples
**Optimized (.claude/agents/)**: 200-400 lines, actionable workflows

**Changes**:

- Kept CRITICAL sections (local testing, naming conventions)
- Removed verbose examples where concepts clear
- Focused on actionable workflows and checklists
- Preserved quality gates and validation requirements
- Maintained cross-references between agents

### Critical Requirements (ALL AGENTS)

**Local Validation BEFORE Push**:

```bash
# Frontend
cd apps/frontend && npm run lint && npm run format:check && npm run test:ci && npm run build

# Backend
cd apps/backend && npm run type-check && npm run format:check && npm run test && npm run build
```

**If ANY check fails: STOP, fix locally, re-run ALL, only proceed when ALL pass**

## Orchestrator Pattern

Claude Code acts as orchestrator:

1. Query GitHub Issues for next priority
2. Read issue details (title, body, acceptance criteria)
3. Break down features into tasks (if needed)
4. Delegate to specialized agents with full context
5. Validate locally (ALL tests must pass)
6. Create PR, monitor CI, merge when green
7. Update GitHub issue (mark complete, close)
8. Loop continuously

## Subagent Delegation

### Handover Template

```markdown
**Context Files**:

1. .claude/agents/[AGENT-TYPE].md - Agent patterns
2. CLAUDE.md - Project conventions
3. GitHub Issue #XXX - Task specification

**GitHub Issue Tracking**:

- Issue: #XXX
- Action: Mark "in-progress" when starting
- Action: Comment with progress
- Action: Close with "Closes #XXX" in PR

**Implementation Files**:

- [Exact file path to create/modify]

**Task**: [Clear description]

**Acceptance Criteria**:

- [ ] Criterion 1
- [ ] All tests pass

**Testing**: [Which tests to run]
```

### Agent Selection

- **Frontend**: `.claude/agents/frontend.md` - Angular components, services, UI
- **Backend**: `.claude/agents/backend.md` - Fastify APIs, routes, middleware
- **Database**: `.claude/agents/database.md` - Migrations, schema changes
- **CI/CD**: `.claude/agents/cicd.md` - Monitor builds, fix failures
- **GitHub Issues**: `.claude/agents/github-issues.md` - Issue creation, tracking

## Settings

### Permissions (settings.json)

Pre-approved commands that won't require confirmation:

- npm/npx commands
- git/gh commands
- Docker commands
- File read/write in project directories

### Denied Actions

- Force push to main
- Destructive operations

## Integration Points

**Legacy System** (.github/agents/):

- Detailed agent specs (1000+ lines each)
- Remain as reference documentation
- Contains extensive examples and patterns

**Optimized System** (.claude/agents/):

- Streamlined specs (200-400 lines each)
- Focus on actionable workflows
- Quick reference for active development

**Both systems coexist** - Use .claude/ for active work, .github/ for deep dives

## Commands Reference

| Command            | Purpose             | Agent Spec        |
| ------------------ | ------------------- | ----------------- |
| `continue-work.md` | Autonomous loop     | `orchestrator.md` |
| `frontend.md`      | Frontend tasks      | `frontend.md`     |
| `backend.md`       | Backend tasks       | `backend.md`      |
| `database.md`      | Database migrations | `database.md`     |
| `ship.md`          | PR and merge        | `orchestrator.md` |

## Success Metrics

- Agent specs: 200-400 lines (down from 1000+)
- Local tests required: 100%
- CI pass on first try: Target 95%+
- Quality gates enforced: 100%
- Cross-references maintained: Yes

## Tips

1. **Read agent specs** - They're now concise and actionable
2. **Test locally first** - NEVER push without running all checks
3. **Trust the process** - Quality gates catch issues before production
4. **Use GitHub Issues** - Single source of truth for all work
5. **Let orchestrator run** - Designed for autonomous operation
