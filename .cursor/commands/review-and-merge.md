Follow the workflow defined in `.github/prompts/review-and-merge.prompt.md`.

**AUTONOMY**: Execute the entire merge workflow without asking for permission.

## Workflow Steps

### 1. Verify PR Exists
- Check for open PR on current branch using `pull_request_get_detail`
- If no PR exists, create one using `pull_request_create`

### 2. Wait for CI
- Poll PR status every 30-60 seconds
- Check `Merged` and `State` fields in PR details

### 3. Merge (when CI passes)
- If merge tool not available, inform user to merge via GitHub UI
- After merge confirmed, proceed to cleanup

### 4. Post-Merge Cleanup (CRITICAL)
```powershell
# Update local main
git checkout main
git pull origin main

# Delete local feature branch  
git branch -d feature/task-XXX-description

# Move task to done folder
git mv tasks/items/task-XXX-name.md tasks/items/done/
git commit -m "chore: move completed task-XXX to done"
git push origin main
```

### 5. Update Tracking
- Update feature progress in feature file
- Update ROADMAP.md

### 6. Signal Continue
- After successful merge, invoke `/continue-work` to resume next task

**Handoff support**: Accepts `{{handoff}}` input (PR number or feature branch name).

**See**: `.github/prompts/review-and-merge.prompt.md` for complete workflow details.

