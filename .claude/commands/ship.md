# Ship - Create PR and Merge

Run local checks, create PR, wait for CI, and merge.

## Pre-flight Checks (MANDATORY)
```bash
# Format
cd apps/frontend && npm run format
cd ../backend && npm run format

# Lint
cd apps/frontend && npm run lint

# Type check
cd apps/backend && npm run type-check

# Build
npm run build

# Tests
npm run test
```

**STOP if any check fails. Fix issues first.**

## Create PR
```bash
git add .
git commit -m "type: description"
git push -u origin $(git branch --show-current)

# Check for existing PR
gh pr view --json number,state 2>/dev/null || gh pr create --base main
```

## Wait for CI and Merge
```bash
# Poll until checks complete
gh pr view --json statusCheckRollup,mergeable,state

# When checks pass
gh pr merge --squash --delete-branch
```

## Post-Merge (CRITICAL)
```bash
git checkout main
git pull origin main
```

Then update ROADMAP.md and move completed task to done/ folder.
