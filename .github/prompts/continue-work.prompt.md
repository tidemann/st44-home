---
description: Continue work on the next priority from the roadmap
agent: orchestrator-agent
---

# Continue Work on Next Priority

**⚠️ CRITICAL GIT RULES**:
- NEVER commit directly to main branch
- ALWAYS create a feature branch before starting work
- ALWAYS push to feature branch, never main
- NEVER use `git push` alone - always specify branch or use `-u origin feature/name`
- All work must go through PR review before merging

**AUTONOMY**: Do not ask for permission to proceed. Once a branch exists, push, open PRs, hand off to review/merge, and auto-resume without user confirmation. Only pause if CI fails or a merge conflict occurs, in which case report status and continue remediation proactively.

**IMPORTANT**: Always follow ROADMAP.md, even if the user has a document open

## Your Task

0. **Verify Git Branch (FIRST STEP)**:
   - Run `git branch` to check current branch
   - If on main: STOP and run `git checkout -b feature/descriptive-name`
   - If on feature branch: Verify it's the correct one for this work
   - NEVER proceed with work while on main branch
   
1. **Check current priorities**: Read [ROADMAP.md](../../tasks/ROADMAP.md) to see what's in the "Now" section
   - If ROADMAP.md is empty or unclear, use [Reprioritize prompt](.github/prompts/reprioritize.prompt.md)
2. **Select work based on priority** (in this order):
   - **FIRST: Look for ready TASKS**: Tasks with clear acceptance criteria ready to implement
   - **SECOND: Look for FEATURES needing breakdown**: Features without tasks created yet
   - **THIRD: Look for EPICS needing planning**: Epics without features created yet
   - **Rationale**: Prefer implementation over planning - finish concrete work before decomposition
3. **Determine action based on work item type**:
   - **Task (ready to implement)**: Proceed to implementation immediately
   - **Feature (needs tasks)**: **MANDATORY** - Break down into tasks using [Breakdown Feature prompt](.github/prompts/breakdown-feature.prompt.md)
   - **Epic (needs features)**: Break down epic into features using [Plan Feature prompt](.github/prompts/plan-feature.prompt.md)
4. **Move to in-progress**: Update status in work item file to `in-progress`
5. **Read work item file**: Understand requirements, acceptance criteria, and technical context
6. **Clarify uncertainties**: If unclear, ask user follow-up questions before proceeding
7. **Assess complexity**: If task seems too complex (>500 LOC or >2 days), break it down further
8. **Research codebase**: 
   - Read relevant AGENTS.md files for context
   - Use semantic_search to find related code
   - Review existing patterns and conventions
9. **Create implementation plan**: Document detailed approach in work item file
10. **Update roadmap**: Mark status as "In Progress" in ROADMAP.md
11. **Implement solution**: Follow workflow in [Orchestrator Agent](../../.github/agents/orchestrator-agent.md)
12. **Delegate to experts**: Assign subtasks to Frontend, Backend, Database agents as needed
13. **Update progress**: Keep work item file and roadmap current during work
14. **Create/Update PR**: Push changes and create/update PR following review-and-merge workflow:
    
    a. **Format code**: `npm run format` in both frontend and backend
    b. **Commit all changes**: Ensure all work committed to feature branch
    c. **Push feature branch**: `git push` or `git push -u origin feature/branch-name`
    d. **Check for existing PR**: `gh pr view --json number,state`
    e. **Create PR if needed**: `gh pr create --title "type: description" --body "..." --base main`
    f. **Record PR number** for next step
    
15. **Wait for CI and Merge**: Complete review-and-merge workflow automatically:
    
    a. **Poll CI status**: 
       ```bash
       gh pr view <PR_NUMBER> --json statusCheckRollup,mergeable,state
       ```
    b. **If checks PASS**: 
       ```bash
       gh pr merge <PR_NUMBER> --squash --delete-branch
       git checkout main
       git pull
       ```
    c. **If checks FAIL**: Fix issues, commit, push, and re-poll (do not stop or ask user)
    d. **Signal**: After successful merge, emit "merge complete" and proceed to step 16
    
16. **Auto-Resume Work**: Immediately continue with next priority:
    - Return to step 1 (check ROADMAP.md for next priority)
    - Do NOT ask user permission to continue
    - Only stop if: no more work items, or unresolvable blocker
    
17. **Update completion**: After merge:
    - **CRITICAL**: Move work item file to appropriate `done/` folder:
      ```bash
      # Move to done folder
      git mv tasks/items/task-XXX-name.md tasks/items/done/
      # Or for features
      git mv tasks/features/feature-XXX-name.md tasks/features/done/
      ```
    - **CRITICAL**: Verify no duplicates exist:
      ```bash
      # Check if file already in done/ - if yes, delete from items/
      Test-Path tasks/items/done/task-XXX-name.md
      # If True, remove duplicate from items/
      Remove-Item tasks/items/task-XXX-name.md -Force
      ```
    - Update ROADMAP.md (remove from Now, adjust Next → Now)
    - Update feature/epic status if all tasks complete
    - Commit the move: `git commit -m "chore: move completed task-XXX to done folder"`

## Constraints

- Follow instructions in [.github/agents/orchestrator-agent.md](../../.github/agents/orchestrator-agent.md)
- Keep ROADMAP.md updated (move from Now → Next → Later as priorities change)
- Update work item progress log in real-time
- Run tests to verify completion
- Don't start multiple work items simultaneously
- **Features MUST be broken down into tasks before implementation**
- Always read relevant AGENTS.md files before making changes
- Update AGENTS.md files if you establish new patterns

## Success Criteria

- [ ] Top priority work item status updated to `in-progress`
- [ ] Implementation plan added to work item file
- [ ] ROADMAP.md status updated
- [ ] Solution implemented following acceptance criteria
- [ ] PR created and merged via review-and-merge workflow
- [ ] All CI checks passing on GitHub (frontend + backend)
- [ ] All tests passing (npm test passes)
- [ ] AGENTS.md files updated if patterns changed
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

- [AGENTS.md](../../AGENTS.md) - Project overview
- [tasks/AGENTS.md](../../tasks/AGENTS.md) - Work item management
- [Orchestrator Agent](../../.github/agents/orchestrator-agent.md) - Main coordination workflow
