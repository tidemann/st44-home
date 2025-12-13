````prompt
---
description: Review PR checks and merge to main after all requirements met
agent: orchestrator-agent
---

# Merge Pull Request

**⚠️ CRITICAL MERGE RULES**:
- ALL CI/CD checks MUST pass before merging
- NEVER merge with failing tests or checks
- ALWAYS use squash merge to keep history clean
- ALWAYS delete feature branch after merge
- Update task tracking after successful merge

**IMPORTANT**: This prompt is for merging EXISTING pull requests. To create a new PR, use `review-and-merge.prompt.md`

## Your Task

0. **Identify PR to merge**:
   - If PR number provided, use that
   - Otherwise, check current branch's PR: `gh pr view`
   - Verify you're working with correct PR

1. **Check PR status and requirements**:
   ```bash
   gh pr view <PR_NUMBER> --json state,mergeable,statusCheckRollup
   ```
   - Verify state is "OPEN"
   - Verify mergeable is "MERGEABLE" (no conflicts)
   - Verify statusCheckRollup shows all checks passed

2. **Review CI/CD check results**:
   ```bash
   gh pr checks <PR_NUMBER>
   ```
   **MANDATORY REQUIREMENTS**:
   - ✅ All checks must show "pass" status
   - ✅ No failing tests
   - ✅ No build errors
   - ✅ No linting/formatting errors
   - ❌ STOP if any checks fail - DO NOT MERGE

3. **Review PR details**:
   ```bash
   gh pr view <PR_NUMBER>
   ```
   - Read PR description
   - Verify changes are clear
   - Check for any reviewer comments
   - Ensure all conversations resolved

4. **Review code changes**:
   ```bash
   gh pr diff <PR_NUMBER>
   ```
   - Scan for obvious issues
   - Check for sensitive data (passwords, API keys)
   - Verify follows project conventions
   - Look for console.logs or debugging code

5. **Final validation** (if not done by CI):
   ```bash
   # Switch to PR branch
   gh pr checkout <PR_NUMBER>
   
   # Run tests
   npm test
   
   # Check formatting
   npm run format:check
   
   # Build if applicable
   npm run build
   ```

6. **Verify work item completion**:
   - Check task/feature file is updated with PR link
   - Verify status is marked as completed
   - Confirm acceptance criteria all checked off
   - Ensure progress log is complete

7. **Merge the PR**:
   ```bash
   gh pr merge <PR_NUMBER> --squash --delete-branch
   ```
   **Merge options explained**:
   - `--squash`: Combines all commits into one clean commit
   - `--delete-branch`: Automatically removes feature branch after merge
   
   **Alternative options** (use only if needed):
   - `--merge`: Regular merge (preserves all commits)
   - `--rebase`: Rebase and merge
   - `--auto`: Enable auto-merge when checks pass

8. **Verify merge success**:
   ```bash
   # Check PR is merged
   gh pr view <PR_NUMBER> --json state,mergedAt
   
   # Switch to main and pull latest
   git checkout main
   git pull origin main
   ```

9. **Move completed work to done folder**:
   ```bash
   # Move task file to done
   git mv tasks/items/task-XXX-name.md tasks/items/done/
   
   # Or move feature file
   git mv tasks/features/feature-XXX-name.md tasks/features/done/
   
   # Commit the move
   git add .
   git commit -m "chore: move completed task-XXX to done folder"
   git push origin main
   ```

10. **Update ROADMAP.md**:
    - Remove completed item from "Now" section
    - Add to "Completed" section with date
    - Move next priority item from "Next" to "Now" if appropriate
    - Commit and push roadmap update

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

## Success Criteria

- [ ] All CI/CD checks passed
- [ ] No merge conflicts
- [ ] PR reviewed and approved (if required)
- [ ] Code quality verified
- [ ] PR merged successfully using squash merge
- [ ] Feature branch deleted
- [ ] Local main branch updated
- [ ] Work item moved to done/ folder
- [ ] ROADMAP.md updated
- [ ] Ready to continue with next work

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