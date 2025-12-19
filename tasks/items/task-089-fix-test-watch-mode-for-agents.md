# Task: Fix Test Watch Mode for Agent Workflows

## Metadata
- **ID**: task-089
- **Feature**: feature-006 - E2E Testing Infrastructure
- **Epic**: epic-006 - Testing & Quality Assurance
- **Status**: completed
- **Priority**: critical
- **Created**: 2024-12-19
- **Assigned Agent**: frontend | orchestrator
- **Estimated Duration**: 1-2 hours (quick fix)
- **Actual Duration**: 0.5 hours

## Description
When agents (particularly frontend-agent) attempt to run tests using `npm test`, the command triggers watch mode in the test framework (Vitest), causing the agent to wait indefinitely for the process to complete. This blocks agent workflows and prevents automated testing from completing successfully.

Additionally, there may be module resolution errors (e.g., "Could not resolve '../../services/child.service'") that need to be addressed to ensure tests can run successfully.

## Requirements
- Requirement 1: Tests should run in CI/non-watch mode when invoked by agents
- Requirement 2: Test commands should complete and exit with appropriate status codes
- Requirement 3: Path resolution issues should be fixed to ensure tests can execute
- Requirement 4: Agents should be able to run tests without manual intervention

## Acceptance Criteria
- [x] `npm test` runs in single-pass mode (no watch mode) when appropriate
- [x] A dedicated command exists for running tests in CI mode (e.g., `npm run test:ci`)
- [x] Test command exits with code 0 on success, non-zero on failure
- [x] Module path resolution errors are fixed
- [x] Agent documentation updated with correct test commands
- [x] All existing tests pass in CI mode
- [x] Code follows project standards (linting, formatting)
- [x] Documentation updated

## Dependencies
- None - this is a critical workflow blocker

## Technical Notes
Current issue:
```
npm test

 Could not resolve "../../services/child.service"

    src/app/components/task-create/task-create.component.ts:5:29:

      5 │ import { ChildService } from '../../services/child.service';
        ╵                              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


Watch mode enabled. Watching for file changes...
```

Potential solutions:
1. Update `package.json` test scripts to include:
   - `test:ci` - Run tests once without watch mode
   - `test:watch` - Explicit watch mode for development
   - `test` - Could default to CI mode or warn about watch mode

2. Configure Vitest to detect CI environment and disable watch mode automatically

3. Fix path resolution issues in test configuration (`vitest.config.ts`)

4. Update agent instructions to use `test:ci` instead of `test`

Reference configurations:
- Frontend test config: `apps/frontend/vitest.config.ts`
- Frontend package.json: `apps/frontend/package.json`
- Agent instructions: `.github/agents/` files

## Affected Areas
- [x] Frontend (Angular)
- [ ] Backend (Fastify/Node.js)
- [ ] Database (PostgreSQL)
- [ ] Infrastructure (Docker/Nginx)
- [ ] CI/CD
- [x] Documentation

## Implementation Plan
[To be filled by Orchestrator Agent]

### Research Phase
- [ ] Investigate current test configuration in `vitest.config.ts`
- [ ] Review package.json test scripts
- [ ] Identify path resolution issues causing import errors
- [ ] Review agent documentation for test command usage

### Design Phase
- [ ] Design test script naming convention (test vs test:ci vs test:watch)
- [ ] Determine best approach for disabling watch mode in CI
- [ ] Plan path alias configuration for test imports

### Implementation Steps
1. Update `apps/frontend/vitest.config.ts` to fix path resolution
2. Add/update test scripts in `apps/frontend/package.json`:
   - `test:ci` - Run tests once, exit with status code
   - `test:watch` - Explicit watch mode for development
   - Update `test` script behavior
3. Test that `npm run test:ci` runs and exits properly
4. Update agent instructions in `.github/agents/` to use `test:ci`
5. Update any task files that reference test commands
6. Verify all tests pass in CI mode

### Testing Strategy
- Run `npm run test:ci` from command line and verify it exits
- Ensure exit code is 0 on success, non-zero on failure
- Verify path resolution works correctly
- Test that agents can successfully run tests without hanging

## Agent Assignments
[To be filled by Orchestrator Agent]

### Subtask 1: Update Vitest Configuration
- **Agent**: frontend-agent
- **Status**: pending
- **Instructions**: See `tasks/subtasks/task-089/frontend-agent-instructions.md`

### Subtask 2: Update Package Scripts
- **Agent**: frontend-agent
- **Status**: pending
- **Instructions**: See `tasks/subtasks/task-089/frontend-agent-instructions.md`

### Subtask 3: Update Agent Documentation
- **Agent**: orchestrator-agent
- **Status**: pending
- **Instructions**: See `tasks/subtasks/task-089/orchestrator-agent-instructions.md`

## Progress Log
- [2024-12-19 14:30] Task created by Planner Agent
- [2024-12-19 14:30] Identified as high priority workflow blocker
- [2024-12-19 16:00] Status changed to in-progress by Orchestrator Agent
- [2024-12-19 16:00] Research phase: Analyzed vitest.config.ts, package.json, angular.json
- [2024-12-19 16:01] Implementation: Updated vitest.config.ts to disable watch mode when CI=true
- [2024-12-19 16:01] Implementation: Added path aliases to fix module resolution
- [2024-12-19 16:01] Implementation: Added test:ci script using cross-env for cross-platform compatibility
- [2024-12-19 16:02] Testing: Verified npm run test:ci runs and exits successfully (151 tests passed)
- [2024-12-19 16:02] All acceptance criteria met, updating agent documentation
- [2024-12-19 16:03] Updated frontend-agent.md with test:ci and test:watch commands
- [2024-12-19 16:03] Task completed - all tests pass, watch mode disabled in CI, agents can run tests without hanging

## Testing Results
[To be filled during testing phase]

## Review Notes
[To be filled during review phase]

## Related PRs
- [To be added when PR is created]

## Lessons Learned
[To be filled after completion]
