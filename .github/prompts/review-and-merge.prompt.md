---
description: Review completed work and create pull request for merging
agent: orchestrator-agent
---

# Review and Merge Completed Work

**⚠️ CRITICAL RULES**:
- NEVER push directly to main branch
- ALWAYS work on a feature branch
- ALWAYS create PR for review before merging
- Changes must ONLY be on a feature branch, never on main
- NEVER push or create PR without user confirmation

## Your Task

1. **Verify branch status**:
   - Run `git branch` to confirm you're on a feature branch (not main)
   - If on main, STOP and create feature branch first
2. **Identify completed work**:
   - Check for work items in `in-progress` status
   - Verify all acceptance criteria are met
   - Confirm all tests pass
2. **Run validation checks**:
   - `npm run format:check` - Prettier formatting
   - `npm test` - All tests pass
   - `npm run build` - Production build succeeds
   - Manual testing if needed
3. **Review changes**:
   - Use `git diff` to review all changes
   - Verify code follows conventions in AGENTS.md files
   - Check for any debugging code or console.logs
   - Ensure no sensitive data committed
4. **Update documentation**:
   - Update relevant AGENTS.md files if patterns changed
   - Update README.md if user-facing changes
   - Update copilot-instructions.md if significant architectural changes
5. **Update work items**:
   - Update work item status to `completed`
   - Add final progress log entry
   - Move work item file to appropriate `done/` folder
6. **Update ROADMAP.md**:
   - Remove completed items from Now
   - Move Next → Now as appropriate
   - Document completion in ROADMAP.md
7. **Prepare PR description**:
   - Clear title describing the change
   - Comprehensive body with:
     - Problem statement
     - Solution approach
     - Changes made (bulleted list)
     - Testing performed
     - Screenshots if UI changes
8. **Get user approval**: Present changes and PR description, wait for confirmation
9. **Create PR**: Only after user confirms, run `gh pr create`

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
- [ ] User approved proceeding with PR
- [ ] PR created successfully
- [ ] CI checks pass on GitHub

## Reference Documentation

- [.github/agents/orchestrator-agent.md](../../.github/agents/orchestrator-agent.md) - Validation workflow
- [tasks/AGENTS.md](../../tasks/AGENTS.md) - Work item completion process
- [AGENTS.md](../../AGENTS.md) - Code quality standards
