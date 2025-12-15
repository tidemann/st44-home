# Task: CI Pipeline Integration for Backend Tests

## Metadata
- **ID**: task-057
- **Feature**: feature-011 - Backend Testing Infrastructure
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Assigned Agent**: backend + devops
- **Estimated Duration**: 2-3 hours

## Description
Integrate backend tests into the CI/CD pipeline with npm test execution, code coverage reporting, coverage thresholds enforcement, and test result artifacts. Ensures all PRs are validated with comprehensive backend testing before merge.

## Requirements
- Add backend test execution to CI workflow (.github/workflows/ci.yml)
- Configure code coverage reporting with c8
- Set coverage thresholds (80% minimum for lines, branches, functions)
- Generate coverage reports as CI artifacts
- Display coverage summary in CI logs
- Fail CI if tests fail or coverage drops below threshold
- Configure test database for CI environment
- Optimize test execution time (parallel where possible)

## Acceptance Criteria
- [ ] CI workflow runs `npm test` for backend
- [ ] CI workflow runs `npm run test:coverage` for backend
- [ ] Coverage report generated and saved as artifact
- [ ] Coverage summary displayed in CI logs
- [ ] CI fails if tests fail
- [ ] CI fails if coverage below 80%
- [ ] Test database configured for CI (PostgreSQL service)
- [ ] Backend tests complete in < 60 seconds in CI
- [ ] Coverage badge added to README (optional)

## Dependencies
- task-051: Test infrastructure must be complete
- task-052, 053, 054, 055, 056: Tests must exist
- Existing CI workflow (.github/workflows/ci.yml)

## Technical Notes

### CI Workflow Modifications

**Current CI Workflow:**
- File: `.github/workflows/ci.yml`
- Has `frontend` and `backend` jobs
- Backend job currently runs lint and build only

**Required Changes:**
1. Add PostgreSQL service to backend job
2. Add test database initialization
3. Add `npm test` step
4. Add `npm run test:coverage` step
5. Upload coverage artifacts
6. Display coverage summary

### PostgreSQL Service Configuration

```yaml
services:
  postgres:
    image: postgres:17
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: st44_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

### Test Steps

```yaml
- name: Initialize test database
  run: |
    psql -h localhost -U postgres -d st44_test -f docker/postgres/init.sql
  env:
    PGPASSWORD: postgres

- name: Run backend tests
  run: npm test
  working-directory: ./apps/backend
  env:
    DB_HOST: localhost
    DB_PORT: 5432
    DB_NAME: st44_test
    DB_USER: postgres
    DB_PASSWORD: postgres

- name: Run backend tests with coverage
  run: npm run test:coverage
  working-directory: ./apps/backend
  env:
    DB_HOST: localhost
    DB_PORT: 5432
    DB_NAME: st44_test
    DB_USER: postgres
    DB_PASSWORD: postgres

- name: Upload coverage reports
  uses: actions/upload-artifact@v4
  with:
    name: backend-coverage
    path: apps/backend/coverage/
```

### Coverage Threshold Configuration

In `apps/backend/package.json`:
```json
{
  "scripts": {
    "test:coverage": "c8 --reporter=text --reporter=lcov --check-coverage --lines 80 --branches 80 --functions 80 npm test"
  }
}
```

## Affected Areas
- [ ] CI/CD (.github/workflows/ci.yml)
- [x] Backend (package.json scripts)
- [ ] Documentation (README.md)

## Implementation Plan

### Phase 1: PostgreSQL Service Setup
1. Add PostgreSQL service to backend CI job
2. Configure health checks
3. Set environment variables
4. Test database connection

### Phase 2: Database Initialization
1. Add step to run init.sql
2. Verify schema is created
3. Handle initialization errors

### Phase 3: Test Execution
1. Add `npm test` step to CI
2. Configure environment variables for test DB
3. Verify tests run successfully
4. Add timeout for test execution (5 minutes max)

### Phase 4: Coverage Reporting
1. Add `npm run test:coverage` step
2. Verify coverage thresholds are enforced
3. Upload coverage reports as artifacts
4. Add coverage summary to CI logs

### Phase 5: Optimization
1. Analyze test execution time
2. Optimize slow tests if needed
3. Consider test parallelization
4. Cache dependencies for faster CI

### Phase 6: Documentation
1. Update README with CI badge (optional)
2. Document CI test process
3. Add troubleshooting guide for CI failures

## Progress Log
- [2025-12-15 16:30] Task created by Orchestrator Agent

## Testing Strategy
- Test CI workflow locally with act (if possible)
- Create test PR to verify CI runs correctly
- Verify coverage thresholds work
- Verify artifacts are uploaded
- Test failure scenarios (failing test, low coverage)

## Related PRs
[To be added during implementation]

## Lessons Learned
[To be filled after completion]
