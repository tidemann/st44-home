Follow the workflow defined in `.github/prompts/merge-pr.prompt.md`.

**CRITICAL: VERIFY CI BEFORE MERGE**

## Merge Workflow

1. **Check CI Status** (REQUIRED):
   ```bash
   gh pr checks <PR_NUMBER> --watch
   ```

2. **If CI FAILS**:
   - DO NOT MERGE
   - Investigate failure: `gh run view <RUN_ID> --log-failed`
   - Fix the issue
   - Push fix and wait for CI to pass

3. **If CI PASSES**:
   ```bash
   gh pr merge <PR_NUMBER> --squash --delete-branch
   ```

**NEVER merge a PR with failing CI checks!**

This defeats the entire purpose of CI/CD.
