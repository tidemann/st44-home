# Task: Add NPM Scripts for Local E2E Test Execution

## Metadata
- **ID**: task-047
- **Feature**: feature-010 - Local E2E Test Execution Environment
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Assigned Agent**: devops + testing
- **Estimated Duration**: 2-3 hours

## Description
Add comprehensive npm scripts to make local E2E test execution simple and developer-friendly. Developers should be able to run tests, debug tests, and manage test services with single commands. Scripts should handle starting/stopping Docker services, running tests in various modes (full suite, watch mode, UI mode), and provide helpful output.

## Requirements
- Add scripts to `apps/frontend/package.json`
- Scripts for starting/stopping test services
- Scripts for running tests in different modes (full, debug, watch, UI)
- Script for resetting test database
- Scripts provide clear console output about what's happening
- Error handling with helpful messages
- Cross-platform compatibility (Windows and Unix)

## Acceptance Criteria
- [ ] `npm run test:e2e:local` - Starts services and runs full test suite
- [ ] `npm run test:e2e:debug` - Runs tests with Playwright inspector
- [ ] `npm run test:e2e:watch` - Runs tests in watch mode (re-run on changes)
- [ ] `npm run test:e2e:ui` - Opens Playwright UI for interactive testing
- [ ] `npm run test:e2e:start` - Starts Docker services only
- [ ] `npm run test:e2e:stop` - Stops all Docker services
- [ ] `npm run test:e2e:reset` - Resets test database to clean state
- [ ] `npm run test:e2e:logs` - Shows logs from Docker services
- [ ] All scripts work on Windows (PowerShell) and Unix (bash)
- [ ] Scripts provide helpful output messages
- [ ] Documentation added to package.json (comments or README)

## Dependencies
- task-046: Docker Compose configuration must exist
- `docker-compose.e2e-local.yml` created
- Playwright installed (already done ✅)

## Technical Notes

### Script Architecture

**test:e2e:local** - Full automated test run
```json
"test:e2e:local": "npm run test:e2e:start && npm run test:e2e && npm run test:e2e:stop"
```

**test:e2e:start** - Start services
```json
"test:e2e:start": "docker-compose -f ../../docker-compose.e2e-local.yml up -d && npm run test:e2e:wait"
```

**test:e2e:wait** - Wait for services to be healthy
```json
"test:e2e:wait": "node scripts/wait-for-services.js"
```

**test:e2e:stop** - Stop services
```json
"test:e2e:stop": "docker-compose -f ../../docker-compose.e2e-local.yml down"
```

**test:e2e:debug** - Debug with inspector
```json
"test:e2e:debug": "PWDEBUG=1 playwright test"
```

**test:e2e:watch** - Watch mode
```json
"test:e2e:watch": "playwright test --ui"
```

**test:e2e:ui** - Playwright UI
```json
"test:e2e:ui": "playwright test --ui"
```

**test:e2e:reset** - Reset database
```json
"test:e2e:reset": "docker-compose -f ../../docker-compose.e2e-local.yml exec postgres-test psql -U postgres -d st44_test_local -f /docker-entrypoint-initdb.d/init.sql"
```

**test:e2e:logs** - View service logs
```json
"test:e2e:logs": "docker-compose -f ../../docker-compose.e2e-local.yml logs -f"
```

### Helper Script: wait-for-services.js

Create `apps/frontend/scripts/wait-for-services.js`:
```javascript
// Polls backend health endpoint until services are ready
// Exits with code 0 when ready, code 1 on timeout
```

### Environment Configuration

Scripts should use environment variables:
- `E2E_BACKEND_URL=http://localhost:3001`
- `E2E_FRONTEND_URL=http://localhost:4201`
- `E2E_DB_HOST=localhost`
- `E2E_DB_PORT=5433`

## Affected Areas
- [x] Frontend (package.json scripts)
- [ ] Backend (none)
- [ ] Database (reset script)
- [x] Infrastructure (Docker Compose integration)
- [ ] CI/CD
- [x] Documentation (README updates)

## Implementation Steps

1. **Add Service Management Scripts**
   - `test:e2e:start` - Start Docker Compose services in detached mode
   - `test:e2e:stop` - Stop and remove containers
   - `test:e2e:restart` - Restart services
   - `test:e2e:logs` - Tail service logs

2. **Create wait-for-services.js Helper**
   - Poll backend /health endpoint
   - Poll frontend root URL
   - Retry with exponential backoff
   - Timeout after 60 seconds with clear error
   - Log progress to console

3. **Add Test Execution Scripts**
   - `test:e2e:local` - Full automated run (start → test → stop)
   - `test:e2e` - Run tests against already-running services
   - `test:e2e:headed` - Run with browser visible
   - `test:e2e:file` - Run specific test file

4. **Add Debug Scripts**
   - `test:e2e:debug` - PWDEBUG=1 for Playwright inspector
   - `test:e2e:ui` - Playwright UI mode
   - `test:e2e:watch` - Watch mode for rapid iteration

5. **Add Database Scripts**
   - `test:e2e:reset` - Reset database to clean state
   - `test:e2e:seed` - Run seed scripts (future enhancement)

6. **Update package.json**
   - Add all scripts with clear names
   - Add comments explaining each script
   - Organize in logical groups

7. **Test All Scripts**
   - Verify start/stop works correctly
   - Verify wait-for-services handles timing
   - Verify test execution modes work
   - Verify database reset works
   - Test on both Windows and Unix if possible

8. **Update Documentation**
   - Add section to README about running tests locally
   - Document each script and when to use it
   - Add troubleshooting tips

## Progress Log
- [2025-12-15 14:55] Task created by Planner Agent

## Testing Strategy
- Manual testing of each script
- Verify cross-platform compatibility
- Test error scenarios (services not running, etc.)
- Verify helpful error messages
- Test with fresh environment (no containers running)

## Related PRs
- TBD

## Lessons Learned
[To be filled after completion]
