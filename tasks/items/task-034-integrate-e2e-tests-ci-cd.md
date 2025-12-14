# Task: Integrate E2E Tests into CI/CD

## Metadata
- **ID**: task-034
- **Feature**: feature-006
- **Epic**: epic-006
- **Status**: pending
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
- [ ] E2E tests run on every PR
- [ ] Test database service in CI
- [ ] Tests complete in < 5 minutes
- [ ] Artifacts uploaded on failure
- [ ] PR blocked on test failure
- [ ] Test results visible in PR checks

## Dependencies
- task-030, 031, 032 (core tests must exist)

## Progress Log
- [2025-12-14] Task created