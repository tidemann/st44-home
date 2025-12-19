# Task: Skip CI/CD Deployment for Documentation-Only Changes

## Metadata
- **ID**: task-079
- **Feature**: DevOps Optimization
- **Epic**: N/A (Infrastructure improvement)
- **Status**: in-progress
- **Priority**: medium
- **Created**: 2025-12-19
- **Assigned Agent**: orchestrator (DevOps)
- **Estimated Duration**: 1-2 hours

## Description
Modify GitHub Actions workflows to skip deployment when only documentation files change (tasks/, ROADMAP.md, agent specs, etc.). Currently every push to main triggers full CI/CD including deployment, even for task planning or ROADMAP updates that don't affect application code.

## Problem
- Pushing task files, ROADMAP updates, or agent documentation triggers full deployment
- Wastes CI/CD minutes and deployment time
- Unnecessary production deployments for non-code changes
- Slows down planning and documentation work

## Requirements

### Path Filtering
Skip deployment (but still run tests) when **only** these paths change:
- `tasks/**` - Task planning files
- `.github/agents/**` - Agent specifications
- `.github/prompts/**` - Prompt templates
- `docs/**` - Documentation
- `*.md` - Markdown files at root (README, AGENTS, etc.)
- `ROADMAP.md`
- `.github/copilot-instructions.md`

### Always Deploy When These Paths Change
- `apps/backend/**` - Backend code
- `apps/frontend/**` - Frontend code
- `infra/**` - Infrastructure config
- `docker/**` - Docker images and database
- `.github/workflows/**` - CI/CD workflows themselves
- `package.json` - Dependencies
- `package-lock.json` - Lock file

### Workflow Behavior
1. **Documentation-only changes**: Run tests, skip deployment
2. **Code changes**: Run tests AND deploy
3. **Mixed changes** (code + docs): Run tests AND deploy

## Acceptance Criteria
- [ ] Pushing task files to main runs CI tests but skips deployment
- [ ] Pushing ROADMAP updates runs CI tests but skips deployment
- [ ] Pushing agent/prompt updates runs CI tests but skips deployment
- [ ] Pushing backend code changes runs CI tests AND deploys
- [ ] Pushing frontend code changes runs CI tests AND deploys
- [ ] Pushing mixed changes (code + docs) runs CI tests AND deploys
- [ ] Deployment step shows clear skip message for docs-only changes
- [ ] CI pipeline completes faster for docs-only changes

## Technical Implementation

### GitHub Actions Path Filtering
Use `paths` or `paths-ignore` in workflow triggers, or use conditional deployment step:

**Option A: Conditional Deployment Step** (Recommended)
```yaml
# .github/workflows/ci.yml
jobs:
  test:
    # Always runs
    
  deploy:
    needs: test
    if: |
      contains(github.event.head_commit.modified, 'apps/backend/') ||
      contains(github.event.head_commit.modified, 'apps/frontend/') ||
      contains(github.event.head_commit.modified, 'infra/') ||
      contains(github.event.head_commit.modified, 'docker/') ||
      contains(github.event.head_commit.modified, '.github/workflows/')
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: # deployment steps
```

**Option B: GitHub Actions Paths Filter Action**
```yaml
- uses: dorny/paths-filter@v2
  id: filter
  with:
    filters: |
      code:
        - 'apps/**'
        - 'infra/**'
        - 'docker/**'
        
- name: Deploy
  if: steps.filter.outputs.code == 'true'
  run: # deployment steps
```

**Option C: Smart Detection Script**
```bash
# Check if any code files changed
if git diff --name-only ${{ github.event.before }} ${{ github.sha }} | grep -qE '^(apps|infra|docker)/'; then
  echo "code_changed=true" >> $GITHUB_OUTPUT
else
  echo "code_changed=false" >> $GITHUB_OUTPUT
fi
```

## Files to Modify
- `.github/workflows/ci.yml` - Main CI/CD workflow
- `.github/workflows/deploy.yml` - If separate deploy workflow exists

## Testing Strategy
1. Create test branch
2. Push only task file changes → verify no deployment
3. Push only code changes → verify deployment occurs
4. Push mixed changes → verify deployment occurs
5. Check CI logs show clear skip reason

## Benefits
- Faster CI/CD for planning work
- Reduced deployment churn
- Clearer separation of planning vs code work
- Lower infrastructure costs
- Faster iteration on documentation

## Edge Cases
- First push after documentation changes should still deploy if code was changed before
- Empty commits should not trigger deployment
- Merge commits should check all changed files
- Reverts should be treated as code changes

## Related Documentation
- GitHub Actions path filtering: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onpushpull_requestpull_request_targetpathspaths-ignore
- dorny/paths-filter: https://github.com/dorny/paths-filter

## Progress Log
- [2025-12-19 11:25] Task created based on user feedback about unnecessary deployments
- [2025-12-19] Status changed to in-progress
- [2025-12-19] Implementing Option B: dorny/paths-filter action for clean path detection
- [2025-12-19] Will add path filter to deploy.yml to check for code changes
