# Feature: Local E2E Test Execution Environment

## Metadata
- **ID**: feature-010
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: in-progress
- **Priority**: medium
- **Created**: 2025-12-15
- **Estimated Duration**: 2-3 days

## Description
Provide developers with a complete, easy-to-use environment for running E2E tests locally during development. This includes Docker Compose configurations for local test infrastructure, npm scripts for common workflows, debugging support in VS Code, and comprehensive documentation. Developers should be able to run the full E2E test suite with a single command and debug tests interactively.

## User Stories
- **As a** developer, **I want** to run E2E tests locally before pushing, **so that** I can catch issues early and iterate faster
- **As a** developer, **I want** a single command to start all test services, **so that** I don't waste time with manual setup
- **As a** developer, **I want** to debug failing E2E tests in VS Code, **so that** I can quickly identify and fix issues
- **As a** developer, **I want** clear documentation on local testing, **so that** I can onboard quickly and troubleshoot problems
- **As a** developer, **I want** to run individual test files during development, **so that** I can iterate on specific features without running the full suite

## Requirements

### Functional Requirements
- FR-1: Docker Compose configuration for local E2E test environment (database, backend, frontend)
- FR-2: NPM scripts for starting/stopping test environment and running tests
- FR-3: VS Code launch configurations for debugging E2E tests
- FR-4: Test database seeding and reset scripts
- FR-5: Comprehensive documentation with examples and troubleshooting
- FR-6: Support for running individual test files or test suites
- FR-7: Environment variable configuration for local vs CI execution

### Non-Functional Requirements
- Performance: Test environment starts in < 30 seconds
- Developer Experience: Single command setup, clear error messages
- Reliability: Consistent test results between local and CI environments
- Documentation: Step-by-step guide with screenshots/examples

## Acceptance Criteria
- [ ] Docker Compose file for local E2E tests (separate from production docker-compose)
- [ ] NPM scripts: `npm run test:e2e:local`, `npm run test:e2e:debug`, `npm run test:e2e:watch`
- [ ] VS Code launch.json configurations for debugging tests
- [ ] Database initialization script for test data
- [ ] README.md with local E2E setup instructions
- [ ] Troubleshooting guide with common issues and solutions
- [ ] All E2E tests pass when run locally
- [ ] Tests can be debugged with breakpoints in VS Code
- [ ] Test environment can be started/stopped cleanly without manual intervention

## Tasks
- [x] **task-046**: Docker Compose configuration for local E2E (3-4h) ✅ COMPLETED [PR #71]
- [x] **task-047**: NPM scripts for local E2E execution (2-3h) ✅ COMPLETED [PR #72]
- [ ] **task-048**: VS Code debug configurations for E2E tests (2-3h)
- [ ] **task-049**: Database seeding and reset utilities (3-4h)
- [ ] **task-050**: Local E2E testing documentation (3-4h)

- [ ] **task-046**: Create docker-compose.e2e-local.yml for local test environment (3-4h)
- [ ] **task-047**: Add npm scripts for local E2E test execution (2-3h)
- [ ] **task-048**: Create VS Code debug configurations for E2E tests (2-3h)
- [ ] **task-049**: Create test database seeding/reset utilities (3-4h)
- [ ] **task-050**: Write comprehensive local E2E testing documentation (3-4h)

## Dependencies
- feature-006: E2E Testing Infrastructure (completed ✅)
- task-034: CI/CD E2E integration (completed ✅)
- Docker Desktop installed on developer machines
- VS Code with Playwright extension (optional but recommended)

## Technical Notes

### Docker Compose Strategy
- Create `docker-compose.e2e-local.yml` separate from production `docker-compose.yml`
- Use different ports to avoid conflicts (e.g., 5433 for test DB, 3001 for test backend)
- Mount local code directories for live reload during test development
- Include all services: PostgreSQL test DB, backend, frontend
- Use profiles to allow running individual services

### NPM Scripts Architecture
```json
{
  "test:e2e:local": "Start all services and run E2E tests",
  "test:e2e:debug": "Start services in debug mode with Playwright inspector",
  "test:e2e:watch": "Run tests in watch mode (re-run on file changes)",
  "test:e2e:ui": "Open Playwright UI for interactive testing",
  "test:e2e:start": "Start test services only (no test execution)",
  "test:e2e:stop": "Stop all test services",
  "test:e2e:reset": "Reset test database to clean state"
}
```

### VS Code Debug Configurations
- Launch test with debugger attached
- Debug single test file
- Debug with Playwright inspector
- Attach to running test process

### Database Seeding Strategy
- SQL scripts for common test scenarios (users, households, tasks)
- Utility functions for programmatic test data creation
- Reset script to clean database between test runs
- Environment-specific seed data (minimal for fast tests)

## UI/UX Considerations
N/A - This is a developer tooling feature with no end-user UI

## Implementation Plan

### Infrastructure Layer (task-046)
- Create `docker-compose.e2e-local.yml` with:
  - PostgreSQL 17 test database (port 5433)
  - Test-specific environment variables
  - Volume mounts for persistent test data (optional)
  - Network configuration for service communication
- Create `.env.e2e-local` for environment variables

### Script Layer (task-047)
- Add npm scripts to `apps/frontend/package.json`:
  - `test:e2e:local` - Full test run
  - `test:e2e:debug` - Debug mode
  - `test:e2e:watch` - Watch mode
  - `test:e2e:ui` - Playwright UI
- Add service management scripts:
  - `test:e2e:start` - Start services
  - `test:e2e:stop` - Stop services
- Create helper script `scripts/e2e-local-setup.sh` for initialization

### Debug Configuration Layer (task-048)
- Create `.vscode/launch.json` entries:
  - "Debug E2E Tests" - Run all tests with debugger
  - "Debug Current E2E Test" - Debug currently open test file
  - "Debug E2E with Inspector" - Launch Playwright inspector
- Add `.vscode/settings.json` for Playwright extension config

### Database Utilities Layer (task-049)
- Create `apps/frontend/e2e/helpers/seed-database.ts`:
  - `seedTestUser()` - Create test user
  - `seedTestHousehold()` - Create household with members
  - `seedTestTasks()` - Create task data
  - `resetDatabase()` - Clean all test data
- Create SQL seed files in `docker/postgres/test-seeds/`:
  - `01-users.sql` - Sample users
  - `02-households.sql` - Sample households
  - `03-tasks.sql` - Sample tasks

### Documentation Layer (task-050)
- Create `docs/LOCAL_E2E_TESTING.md`:
  - Prerequisites and setup
  - Running tests locally
  - Debugging tests
  - Writing new tests
  - Troubleshooting guide
- Update main README.md with link to E2E testing docs
- Create quick-start guide with examples

## Progress Log
- [2025-12-15 14:45] Feature created by Planner Agent
- [2025-12-15 14:45] Tasks defined (046-050)
- [2025-12-15 15:45] task-046 started (Docker Compose for local E2E)
- [2025-12-15 16:15] task-046 completed and merged [PR #71]
- [2025-12-15 16:17] Feature progress: 1/5 tasks complete (20%)
- [2025-12-15 16:43] task-047 completed and merged [PR #72]
- [2025-12-15 16:43] Feature progress: 2/5 tasks complete (40%)

## Testing Strategy
- [ ] Validate docker-compose starts all services correctly
- [ ] Verify npm scripts execute as expected
- [ ] Test VS Code debug configurations work
- [ ] Confirm database seeding/reset scripts function properly
- [ ] Validate documentation with fresh developer walkthrough

## Related PRs
- [PR #71](https://github.com/tidemann/st44-home/pull/71) - task-046: Docker Compose for local E2E testing ✅ MERGED
- [PR #72](https://github.com/tidemann/st44-home/pull/72) - task-047: NPM scripts for local E2E execution ✅ MERGED

## Success Metrics
- **Developer Efficiency**: Time to run E2E tests locally < 10 minutes (including setup)
- **Developer Satisfaction**: 100% of team can run tests locally without assistance
- **Test Reliability**: Local test results match CI results 100%
- **Debug Capability**: Developers can set breakpoints and inspect test state
- **Onboarding Speed**: New developers can run E2E tests within 30 minutes of setup

## Lessons Learned
[To be filled after completion]
