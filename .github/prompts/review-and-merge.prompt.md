---
description: Unified review, PR creation, CI wait, and merge workflow (handoff-aware)
agent: orchestrator-agent
---

# Review, Create/Merge PR (Unified)

**⚠️ CRITICAL RULES**:
- NEVER push directly to main branch
- ALWAYS work on a feature branch
- ALWAYS create PR for review before merging
- Changes must ONLY be on a feature branch, never on main
- NEVER push or create PR without user confirmation

## Handoff Input (Optional)

- `handoff`: The PR number or feature branch name provided by the Orchestrator when handing off.
   - If a PR number is provided, operate on that PR.
   - If a branch name is provided, operate on the PR associated with that branch.
   - If no argument provided, discover an open PR automatically (prefer current branch’s PR).

## Your Task

1. **Verify branch status**:
   - Run `git branch` to confirm you're on a feature branch (not main)
   - If on main, STOP and create feature branch first
2. **Identify completed work**:
   - Check for work items in `in-progress` status
   - Verify all acceptance criteria are met
   - Confirm all tests pass
3. **Run validation checks**:
   - `npm run format:check` - Prettier formatting
   - `npm test` - All tests pass
   - `npm run build` - Production build succeeds
   - Manual testing if needed
4. **Review changes**:
   - Use `git diff` to review all changes
   - Verify code follows conventions in AGENTS.md files
   - Check for any debugging code or console.logs
   - Ensure no sensitive data committed
5. **Update documentation**:
   - Update relevant AGENTS.md files if patterns changed
   - Update README.md if user-facing changes
   - Update copilot-instructions.md if significant architectural changes
6. **Update work items**:
   - Update work item status to `completed`
   - Add final progress log entry
   - Move work item file to appropriate `done/` folder
7. **Update ROADMAP.md**:
   - Remove completed items from Now
   - Move Next → Now as appropriate
   - Document completion in ROADMAP.md
8. **Prepare PR description**:
   - Clear title describing the change
   - Comprehensive body with:
     - Problem statement
     - Solution approach
     - Changes made (bulleted list)
     - Testing performed
     - Screenshots if UI changes
9. **Determine PR target (handoff-aware)**:
   - If `handoff` is a PR number: use it.
   - If `handoff` is a branch name: find PR for that branch.
   - If no handoff:
     - Prefer PR of current branch: `gh pr view --json number,state`.
     - Otherwise discover open PRs: `gh pr list --state open --json number,title,headRefName`.

10. **Create PR if missing**:
    - If no PR exists, create one:
      ```bash
      gh pr create --title "<type>: <summary>" --body "<template>" --base main
      ```

11. **Wait for CI checks and merge**:
    - Poll PR status until checks complete:
      ```bash
      gh pr view <PR_NUMBER> --json statusCheckRollup,mergeable,state
      ```
    - If checks FAIL: return to Orchestrator to fix, push, and re-run.
    - If checks PASS: merge with squash and delete branch:
      ```bash
      gh pr merge <PR_NUMBER> --squash --delete-branch
      ```

12. **Post-merge resume**:
    - Switch to `main` and pull latest.
    - Signal Orchestrator to re-invoke `continue-work.prompt.md` to pick next priority.

## Signal Definitions

To enable automation and clear handshakes between prompts, this unified workflow emits explicit signals:

- Success: `merge complete`
   - Emitted after successful squash merge and branch deletion.
   - Orchestrator should immediately re-invoke `continue-work.prompt.md`.

- Blocked: `checks failing`
   - Emitted when any CI check fails.
   - Orchestrator should reclaim control, fix issues, push updates, then hand off again.

- Pending: `waiting for checks`
   - Emitted while CI is still running.
   - Orchestrator can poll or wait until a terminal signal (success/blocked) is emitted.

## Pre-merge Checklist

### Code Quality
- [ ] All tests pass (`npm test`)
- [ ] Formatting correct (`npm run format:check`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console.logs or debugging code
- [ ] No commented-out code
- [ ] Error handling in place

### Documentation
- [ ] AGENTS.md files updated if patterns changed
- [ ] README.md updated if needed
- [ ] Code comments for complex logic
- [ ] API documentation updated

### Accessibility
- [ ] WCAG AA compliance (if frontend changes)
- [ ] Keyboard navigation works
- [ ] Focus management correct
- [ ] Color contrast sufficient

### Testing
- [ ] Unit tests for new functions/components
- [ ] Integration tests for API endpoints
- [ ] Manual testing performed
- [ ] Edge cases covered

### Work Item Management
- [ ] All acceptance criteria checked off
- [ ] Work item status updated to `completed`
- [ ] Final progress log entry added
- [ ] Work item moved to done/ folder
- [ ] ROADMAP.md updated

## PR Title Format

Format: `<type>: <description>`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
- `feat: add user profile management`
- `fix: resolve CORS issue in production`
- `docs: update API documentation`
- `refactor: simplify authentication logic`

## PR Description Template

```markdown
## Problem
[Clear description of what problem this solves]

## Solution
[High-level description of the approach taken]

## Changes
- [ ] Added [file/feature]
- [ ] Updated [file/feature]
- [ ] Fixed [issue]
- [ ] Removed [deprecated feature]

## Testing
- Unit tests: [pass/fail, coverage %]
- Integration tests: [pass/fail]
- Manual testing: [what was tested]

## Screenshots
[If UI changes, include before/after screenshots]

## Dependencies
- Depends on: [other PRs if applicable]
- Blocks: [future work that depends on this]

## Breaking Changes
[List any breaking changes, or "None"]

## Checklist
- [ ] Tests pass
- [ ] Formatting correct
- [ ] Documentation updated
- [ ] Accessibility verified
```

## Common Issues

### Tests Failing
- Review test output carefully
- Fix failing tests before proceeding
- Add missing test coverage
- Don't skip or comment out failing tests

### Formatting Issues
- Run `npm run format` to auto-fix
- Check for any remaining issues
- Commit formatting fixes separately if large

### Merge Conflicts
- Pull latest from main: `git pull origin main`
- Resolve conflicts carefully
- Test after resolving conflicts
- Commit conflict resolution

## Success Criteria

- [ ] All validation checks pass
- [ ] Documentation updated
- [ ] Work items updated and moved to done/
- [ ] ROADMAP.md updated
- [ ] PR description is comprehensive
- [ ] PR created successfully (if missing)
- [ ] CI checks pass on GitHub
- [ ] PR merged with squash and branch deleted
- [ ] Orchestrator resumes with `continue-work.prompt.md`

## Reference Documentation

- [.github/agents/orchestrator-agent.md](../../.github/agents/orchestrator-agent.md) - Validation workflow
- [tasks/AGENTS.md](../../tasks/AGENTS.md) - Work item completion process
- [AGENTS.md](../../AGENTS.md) - Code quality standards
