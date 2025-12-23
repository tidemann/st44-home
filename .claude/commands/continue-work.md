# Continue Work - Autonomous Development Loop

Execute the autonomous development workflow by reading and following `.github/prompts/continue-work.prompt.md`.

## Quick Start
1. Read `tasks/ROADMAP.md` for current priorities
2. Pick the top item from "Now" section
3. If it's a feature without tasks, break it down first
4. Implement the work using specialized subagents
5. Run tests, create PR, merge
6. Loop back to step 1

## Subagent Delegation
Use the Task tool to spawn specialized agents:
- **Frontend work**: Spawn agent with context from `.github/agents/frontend-agent.md`
- **Backend work**: Spawn agent with context from `.github/agents/backend-agent.md`
- **Database work**: Spawn agent with context from `.github/agents/database-agent.md`

## Critical Rules
- NEVER push to main directly
- ALWAYS run local tests before PR
- ALWAYS update ROADMAP.md after completing work
- Move completed tasks to `done/` folders
