````prompt
---
description: Alias to unified review-and-merge; handles CI wait and merging
agent: orchestrator-agent
---

# Merge Pull Request (Alias)

**⚠️ CRITICAL MERGE RULES**:
- ALL CI/CD checks MUST pass before merging
- NEVER merge with failing tests or checks
- ALWAYS use squash merge to keep history clean
- ALWAYS delete feature branch after merge
- Update task tracking after successful merge

This prompt is now an alias of the unified workflow. Prefer using [review-and-merge.prompt.md](./review-and-merge.prompt.md), which:
- Accepts handoff (PR number or branch)
- Creates PR if missing
- Waits for CI checks to finish
- Merges with squash and deletes branch
- Signals Orchestrator to resume continue-work

## Quick Use

Use the unified prompt instead:

```bash
# With handoff PR number
<invoke review-and-merge.prompt.md> --handoff <PR_NUMBER>

# With handoff branch name
<invoke review-and-merge.prompt.md> --handoff feature/task-027-playwright-setup

# No handoff (auto-discover open PRs)
<invoke review-and-merge.prompt.md>
```

## Pre-Merge Checklist

Before merging, verify:

### CI/CD Checks (MANDATORY)
- [ ] All GitHub Actions workflows passed
- [ ] Test suite passed (100% required)
- [ ] Build succeeded
- [ ] Linting/formatting passed
- [ ] No security vulnerabilities detected

### Code Quality
- [ ] No merge conflicts
- [ ] Code follows project conventions
- [ ] No sensitive data in commits
- [ ] No debugging code (console.logs, etc.)
- [ ] Error handling is appropriate

### Documentation
- [ ] PR description is clear and complete
- [ ] AGENTS.md files updated if needed
- [ ] README.md updated if user-facing changes
- [ ] Code comments added for complex logic

### Work Item Tracking
- [ ] Task/feature file updated with PR link
- [ ] Status marked as "completed"
- [ ] All acceptance criteria checked off
- [ ] Progress log is complete

### Testing
- [ ] All tests pass locally
- [ ] Manual testing performed if needed
- [ ] Edge cases considered
- [ ] No regressions introduced

## If Checks Fail

**DO NOT MERGE** - Follow this process:

1. **Identify failing check**:
   ```bash
   gh pr checks <PR_NUMBER>
   ```

2. **Review failure details**:
   - Click through to GitHub Actions logs
   - Identify specific error messages
   - Understand root cause

3. **Fix the issue**:
   ```bash
   # Checkout PR branch
   gh pr checkout <PR_NUMBER>
   
   # Make necessary fixes
   # Run tests locally
   npm test
   
   # Commit and push fix
   git add .
   git commit -m "fix: resolve failing test in XYZ"
   git push
   ```

4. **Wait for checks to re-run**:
   - GitHub will automatically re-run checks
   - Monitor status: `gh pr checks <PR_NUMBER>`
   - Once all pass, return to merge workflow

5. **If checks persistently fail**:
   - Ask user for guidance
   - Consider if changes need to be reverted
   - May need to close PR and create new approach

## Merge Conflict Resolution

If PR has merge conflicts:

1. **Checkout PR branch**:
   ```bash
   gh pr checkout <PR_NUMBER>
   ```

2. **Pull latest main**:
   ```bash
   git pull origin main
   ```

3. **Resolve conflicts**:
   - Open conflicted files
   - Carefully merge changes
   - Remove conflict markers (<<<<, ====, >>>>)
   - Test thoroughly after resolution

4. **Commit resolution**:
   ```bash
   git add .
   git commit -m "chore: resolve merge conflicts with main"
   git push
   ```

5. **Wait for checks and re-merge**:
   - CI will re-run
   - Once passed, proceed with merge

## Post-Merge Actions

After successful merge:

1. **Verify on main**:
   ```bash
   git checkout main
   git pull origin main
   git log --oneline -5
   ```

2. **Clean up local branches**:
   ```bash
   # Delete local feature branch if not auto-deleted
   git branch -d feature/branch-name
   
   # Prune remote references
   git fetch --prune
   ```

3. **Update work tracking**:
   - Move task file to done/ folder
   - Update ROADMAP.md
   - Mark feature progress if part of larger feature

4. **Notify team** (if applicable):
   - Post merge notification
   - Document deployment notes
   - Update project board/tracker

5. **Continue with next work**:
   - Use `continue-work.prompt.md` to start next task
   - Review ROADMAP.md for priorities

## Common Commands Reference

```bash
# View PR details
gh pr view <PR_NUMBER>

# Check PR status and mergeability
gh pr view <PR_NUMBER> --json state,mergeable,statusCheckRollup

# View all checks
gh pr checks <PR_NUMBER>

# View PR diff
gh pr diff <PR_NUMBER>

# Checkout PR branch locally
gh pr checkout <PR_NUMBER>

# Merge with squash
gh pr merge <PR_NUMBER> --squash --delete-branch

# Merge with auto-merge (when checks pass)
gh pr merge <PR_NUMBER> --squash --delete-branch --auto

# View merge status
gh pr view <PR_NUMBER> --json state,mergedAt,mergedBy
```

## Troubleshooting

### "Not all required checks have passed"
- Wait for checks to complete
- Check which specific check failed
- Review GitHub Actions logs
- Fix issue and push to PR branch

### "Pull request is not mergeable"
- Check for merge conflicts
- Pull latest main into PR branch
- Resolve conflicts and push

### "Branch protection rules not satisfied"
- Check repository settings
- Ensure required reviews obtained
- Verify required checks configured correctly

### "Cannot delete branch"
- Branch may have unmerged commits elsewhere
- Check for other PRs using same branch
- Manually delete if safe: `git push origin --delete branch-name`

## Success Criteria (Delegated)

- [ ] CI/CD checks passed (handled in unified prompt)
- [ ] Squash merge completed and branch deleted
- [ ] Orchestrator resumes `continue-work` after merge

## Safety Checklist

Before executing merge:
- [ ] Verified ALL checks passed
- [ ] Confirmed no sensitive data in commits
- [ ] Reviewed changes make sense
- [ ] Work item tracking up to date
- [ ] No console.logs or debugging code
- [ ] Documentation updated appropriately

**Remember**: It's better to delay a merge than to merge broken code. When in doubt, ask for clarification.

## Reference Documentation

- [.github/agents/orchestrator-agent.md](../agents/orchestrator-agent.md) - Overall workflow
- [Git Workflow](.github/copilot-instructions.md) - Branch and PR conventions
- [Work Item Management](../../tasks/AGENTS.md) - Task completion process

````