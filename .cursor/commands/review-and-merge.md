Follow the workflow defined in `.github/prompts/review-and-merge.prompt.md`.

**AUTONOMY**: Execute the entire merge workflow without asking for permission.

## Workflow Steps

### 1. Verify PR Exists
- Check for open PR on current branch
- If no PR exists, create one

### 2. **CRITICAL: Wait for CI and VERIFY it passes**
```bash
# Watch CI status until completion
gh pr checks <PR_NUMBER> --watch

# Check final status
gh pr view <PR_NUMBER> --json statusCheckRollup
```

**If ANY check has `conclusion: FAILURE`**:
- DO NOT PROCEED TO MERGE
- Run: `gh run view <RUN_ID> --log-failed` to see errors
- Fix the failing tests/checks
- Push the fix
- Wait for CI again

### 3. Merge (ONLY when ALL CI checks pass)
```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
```

### 4. Post-Merge Cleanup
```powershell
git checkout main
git pull origin main
git mv tasks/items/task-XXX-name.md tasks/items/done/
git commit -m "chore: move completed task-XXX to done"
git push origin main
```

### 5. Signal Continue
- After successful merge, continue with next task

---

**NEVER merge a PR with failing CI!** This defeats the purpose of CI/CD.

**Handoff support**: Accepts `{{handoff}}` input (PR number or feature branch name).
