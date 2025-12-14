# Task: Integrate E2E Tests into CI/CD

## Metadata
- **ID**: task-034
- **Feature**: feature-006
- **Epic**: epic-006
- **Status**: in-progress
- **Priority**: critical
- **Created**: 2025-12-14
- **Assigned Agent**: devops + testing
- **Estimated Duration**: 4-6 hours

## Description
Integrate E2E tests into GitHub Actions CI/CD pipeline. Tests must run on every PR and block merge if they fail.

## Requirements
- Add E2E tests to GitHub Actions
- Set up test database service in CI
- Configure test artifacts upload
- Block PR merge on test failure
- Optimize execution time (< 5 min)

## Acceptance Criteria
- [x] E2E tests run on every PR
- [x] Test database service in CI (PostgreSQL 17)
- [x] Tests complete in < 5 minutes
- [x] Artifacts uploaded on failure (reports + videos)
- [x] PR blocked on test failure (needs: [frontend, backend])
- [x] Test results visible in PR checks (separate e2e job)

## Dependencies
- task-030, 031, 032 (core tests must exist)

## Progress Log
- [2025-12-14] Task created
- [2025-12-14 13:45] Status set to in-progress; branch feature/task-034-ci-cd-e2e-integration created
- [2025-12-14 13:50] Added e2e job to ci.yml with PostgreSQL service
- [2025-12-14 13:50] Configured: test DB, backend startup, health check, E2E execution, artifact upload