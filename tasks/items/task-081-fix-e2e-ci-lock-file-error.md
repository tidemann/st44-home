# Task: Fix E2E Test CI Failure - Missing Dependencies Lock File

## Metadata
- **ID**: task-081
- **Feature**: CI/CD E2E Testing
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: in-progress
- **Priority**: high
- **Created**: 2025-12-19
- **Assigned Agent**: orchestrator (DevOps/CI)
- **Estimated Duration**: 1-2 hours

## Description
Fix scheduled E2E tests failing in GitHub Actions due to missing dependencies lock file. The `actions/setup-node@v4` action is looking for `package-lock.json` in the repository root but the monorepo structure has lock files in subdirectories (`apps/frontend/`, `apps/backend/`).

## Problem
CI Error:
```
Run actions/setup-node@v4
Found in cache @ /opt/hostedtoolcache/node/22.21.1/x64
Environment details
/opt/hostedtoolcache/node/22.21.1/x64/bin/npm config get cache
/home/runner/.npm
Error: Dependencies lock file is not found in /home/runner/work/st44-home/st44-home. 
Supported file patterns: package-lock.json,npm-shrinkwrap.json,yarn.lock
```

**Root Cause**: Monorepo structure has lock files in `apps/*/` directories, not at root.

## Requirements

### Investigation
1. Check current E2E test workflow file (likely `.github/workflows/e2e-tests.yml` or scheduled workflow)
2. Verify where `package-lock.json` files exist in the repository
3. Determine if workflow is using `cache` option in `actions/setup-node`
4. Check if similar issue exists in main CI workflow (and why it doesn't fail)

### Fix Options

**Option 1: Add Root Lock File** (Not Recommended)
- Create root `package-lock.json` if using root-level npm scripts
- Only if E2E tests actually install root dependencies

**Option 2: Update Cache Path** (Recommended)
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'npm'
    cache-dependency-path: 'apps/frontend/package-lock.json'  # Specify path
```

**Option 3: Multiple Cache Paths** (If E2E needs both)
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'npm'
    cache-dependency-path: |
      apps/frontend/package-lock.json
      apps/backend/package-lock.json
```

**Option 4: Disable Caching** (Fallback)
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    # cache: 'npm'  # Remove cache line
```

### Testing
- Verify workflow runs without errors
- Confirm dependencies are installed correctly
- Check if caching works (faster subsequent runs)
- Ensure E2E tests actually execute

## Acceptance Criteria
- [ ] Scheduled E2E test workflow runs without lock file error
- [ ] Node.js and npm setup completes successfully
- [ ] Dependencies are installed correctly
- [ ] E2E tests execute (may have other failures to address separately)
- [ ] Dependency caching works (if enabled)
- [ ] Workflow completes without "lock file not found" error
- [ ] Fix doesn't break main CI workflow

## Technical Notes

### Monorepo Structure
```
st44-home/
├── package.json (root - workspace config)
├── apps/
│   ├── frontend/
│   │   └── package-lock.json ✅ EXISTS
│   └── backend/
│       └── package-lock.json ✅ EXISTS
└── .github/
    └── workflows/
        ├── ci.yml (main CI - may have correct config)
        └── e2e-tests.yml (scheduled - failing?)
```

### Compare with Main CI Workflow
Check `.github/workflows/ci.yml` to see how it handles this:
```yaml
# If main CI doesn't fail, it likely has:
cache-dependency-path: 'apps/frontend/package-lock.json'
```

### E2E Test Workflow Location
Likely files to check:
- `.github/workflows/e2e-tests.yml`
- `.github/workflows/scheduled-tests.yml`
- `.github/workflows/nightly.yml`

### Actions/Setup-Node Documentation
- `cache-dependency-path`: Path to package-lock.json
- Supports multiple paths with `|` multiline string
- Caching is optional but improves speed

## Files to Check
- `.github/workflows/e2e-tests.yml` (or scheduled workflow file)
- `.github/workflows/ci.yml` (reference for correct config)
- `apps/frontend/package-lock.json` (verify exists)
- `apps/backend/package-lock.json` (verify exists)

## Related Issues
- E2E tests are currently failing in scheduled runs
- May reveal additional E2E test issues once this is fixed
- Could indicate other workflows have same issue

## Edge Cases
- Root `package.json` exists but has no `package-lock.json`
- E2E tests might need both frontend and backend dependencies
- Caching might need different strategy for monorepo

## Expected Behavior After Fix
1. Scheduled workflow triggers
2. Node.js setup completes without error
3. Dependencies install from correct locations
4. E2E tests run (may pass or fail on test assertions - that's separate)
5. Workflow completes without infrastructure errors

## Progress Log
- [2025-12-19 11:45] Task created based on scheduled E2E test CI failure
- [2025-12-19] Status changed to in-progress, investigating workflow files
- [2025-12-19] Found issue: e2e.yml uses `cache: 'npm'` without `cache-dependency-path`
- [2025-12-19] Applied fix: Added cache-dependency-path with both frontend and backend lock files
- [2025-12-19] Verified both package-lock.json files exist at expected paths
- [2025-12-19] Ready to test in CI
