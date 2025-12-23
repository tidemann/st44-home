# Claude Code Configuration

This directory contains Claude Code-specific configuration for autonomous development.

## Directory Structure

```
.claude/
├── settings.json          # Permissions and configuration
├── commands/              # Custom command prompts
│   ├── continue-work.md   # Main autonomous loop
│   ├── frontend.md        # Frontend agent context
│   ├── backend.md         # Backend agent context
│   ├── database.md        # Database agent context
│   └── ship.md            # PR and merge workflow
└── README.md              # This file
```

## Quick Start

### Start Autonomous Development
Tell Claude Code:
```
Read tasks/ROADMAP.md and execute the top priority from the "Now" section
```

### Manual Agent Invocation
```
Read .claude/commands/frontend.md and implement [task]
Read .claude/commands/backend.md and implement [task]
Read .claude/commands/database.md and implement [task]
```

## How It Works

### Orchestrator Pattern
Claude Code acts as an orchestrator that:
1. Reads ROADMAP.md for priorities
2. Breaks down features into tasks
3. Spawns specialized subagents using the Task tool
4. Coordinates work across frontend, backend, database
5. Validates and ships changes
6. Loops continuously

### Subagent Delegation
The orchestrator spawns Task agents with specific prompts:
```
// Spawn frontend agent
Task tool with subagent_type="general-purpose" and prompt:
"Read .github/agents/frontend-agent.md for context. Implement: [task]"

// Spawn backend agent
Task tool with subagent_type="general-purpose" and prompt:
"Read .github/agents/backend-agent.md for context. Implement: [task]"
```

### Parallel Execution
Independent tasks run in parallel using `run_in_background: true`:
```
1. Spawn backend agent (background)
2. Spawn database agent (background)
3. Wait for both (TaskOutput)
4. Spawn frontend agent (sequential - depends on API)
```

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

## Integration with Existing System

This setup works with the existing agent system:
- `.github/agents/` - Detailed agent specifications
- `.github/prompts/` - Workflow prompts (Copilot-compatible)
- `tasks/` - Work item hierarchy
- `AGENTS.md` files - Living documentation

## Commands Reference

| Command | Purpose |
|---------|---------|
| `continue-work.md` | Start/continue autonomous loop |
| `frontend.md` | Frontend implementation context |
| `backend.md` | Backend implementation context |
| `database.md` | Database/migration context |
| `ship.md` | PR creation and merge workflow |

## Tips

1. **Let it run** - The orchestrator is designed to work autonomously
2. **Check ROADMAP.md** - This is the source of truth for priorities
3. **Trust the process** - Tests, CI, and PR reviews catch issues
4. **Intervene when stuck** - If CI fails repeatedly, provide guidance
