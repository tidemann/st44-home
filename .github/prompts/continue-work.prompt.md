---
description: Continue work on the next priority from the roadmap
agent: orchestrator-agent
---

# Continue Work on Next Priority

**CRITICAL**: NEVER commit and push unless asking the user first

**IMPORTANT**: Always follow ROADMAP.md, even if the user has a document open

## Your Task

1. **Check current priorities**: Read [ROADMAP.md](../../tasks/ROADMAP.md) to see what's in the "Now" section
   - If ROADMAP.md is empty or unclear, use [Reprioritize prompt](.github/prompts/reprioritize.prompt.md)
2. **Select top priority**: Pick the first item from "Now" section (unless blocked)
3. **Determine work item type**: Is it an epic, feature, or task?
   - **Epic**: Read epic file, ensure features are created. If not, break down epic into features
   - **Feature**: **MANDATORY** - Break down into tasks using [Breakdown Feature prompt](.github/prompts/breakdown-feature.prompt.md)
   - **Task**: Proceed to implementation
4. **Move to in-progress**: Update status in work item file to `in-progress`
5. **Read work item file**: Understand requirements, acceptance criteria, and technical context
6. **Clarify uncertainties**: If unclear, ask user follow-up questions before proceeding
7. **Assess complexity**: If task seems too complex (>500 LOC or >2 days), break it down further
8. **Research codebase**: 
   - Read relevant AGENT.md files for context
   - Use semantic_search to find related code
   - Review existing patterns and conventions
9. **Create implementation plan**: Document detailed approach in work item file
10. **Update roadmap**: Mark status as "In Progress" in ROADMAP.md
11. **Implement solution**: Follow workflow in [Orchestrator Agent](../../.github/agents/orchestrator-agent.md)
12. **Delegate to experts**: Assign subtasks to Frontend, Backend, Database agents as needed
13. **Update progress**: Keep work item file and roadmap current during work
14. **Validate completion**: Verify all acceptance criteria met, tests pass
15. **Complete**: Move to appropriate `done/` folder when finished, update roadmap

## Constraints

- Follow instructions in [.github/agents/orchestrator-agent.md](../../.github/agents/orchestrator-agent.md)
- Keep ROADMAP.md updated (move from Now → Next → Later as priorities change)
- Update work item progress log in real-time
- Run tests to verify completion
- Don't start multiple work items simultaneously
- **Features MUST be broken down into tasks before implementation**
- Always read relevant AGENT.md files before making changes
- Update AGENT.md files if you establish new patterns

## Success Criteria

- [ ] Top priority work item status updated to `in-progress`
- [ ] Implementation plan added to work item file
- [ ] ROADMAP.md status updated
- [ ] Solution implemented following acceptance criteria
- [ ] All tests passing (npm test passes)
- [ ] AGENT.md files updated if patterns changed
- [ ] Work item file updated with final status
- [ ] Work item moved to appropriate `done/` folder
- [ ] ROADMAP.md updated (item removed, next priority added)

## Current Status

See [tasks/ROADMAP.md](../../tasks/ROADMAP.md) for:
- Now: Current priorities (should be 3-5 items)
- Next: Upcoming work
- Later: Future considerations
- Backlog: Ideas and potential work

## Reference Documentation

- [AGENT.md](../../AGENT.md) - Project overview
- [tasks/AGENT.md](../../tasks/AGENT.md) - Work item management
- [Orchestrator Agent](../../.github/agents/orchestrator-agent.md) - Main coordination workflow
