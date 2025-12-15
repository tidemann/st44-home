# Task: Create VS Code Debug Configurations for E2E Tests

## Metadata
- **ID**: task-048
- **Feature**: feature-010 - Local E2E Test Execution Environment
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: pending
- **Priority**: medium
- **Created**: 2025-12-15
- **Assigned Agent**: devops
- **Estimated Duration**: 2-3 hours

## Description
Create VS Code launch configurations that enable developers to debug E2E tests with breakpoints, step-through debugging, and variable inspection. Configurations should support debugging all tests, a single test file, or the currently open test. Integration with Playwright's inspector should also be available. This dramatically improves developer productivity when troubleshooting test failures.

## Requirements
- Create/update `.vscode/launch.json` with E2E debug configurations
- Configuration to debug all E2E tests
- Configuration to debug currently open test file
- Configuration to debug with Playwright inspector
- Configuration to attach to running test process
- Update `.vscode/settings.json` with Playwright extension settings
- Documentation on how to use debug configurations

## Acceptance Criteria
- [ ] `.vscode/launch.json` contains E2E debug configurations
- [ ] "Debug E2E Tests" config runs all tests with debugger attached
- [ ] "Debug Current E2E Test" config debugs the open test file
- [ ] "Debug E2E with Inspector" config launches Playwright inspector
- [ ] Breakpoints in test files work correctly
- [ ] Variables can be inspected during debugging
- [ ] Console output visible in Debug Console
- [ ] Playwright extension settings configured in `.vscode/settings.json`
- [ ] README section explaining how to debug tests

## Dependencies
- task-046: Docker Compose for local E2E (services must be running)
- task-047: NPM scripts for starting services
- VS Code with Playwright extension (recommended)

## Technical Notes

### Launch Configuration Examples

**Debug All E2E Tests:**
```json
{
  "name": "Debug E2E Tests",
  "type": "node",
  "request": "launch",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:e2e:debug"],
  "cwd": "${workspaceFolder}/apps/frontend",
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen",
  "env": {
    "PWDEBUG": "1"
  }
}
```

**Debug Current Test File:**
```json
{
  "name": "Debug Current E2E Test",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/apps/frontend/node_modules/.bin/playwright",
  "args": [
    "test",
    "${relativeFile}",
    "--headed",
    "--debug"
  ],
  "cwd": "${workspaceFolder}/apps/frontend",
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

**Debug with Playwright Inspector:**
```json
{
  "name": "Debug E2E with Inspector",
  "type": "node",
  "request": "launch",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:e2e:debug"],
  "cwd": "${workspaceFolder}/apps/frontend",
  "console": "integratedTerminal",
  "env": {
    "PWDEBUG": "1",
    "HEADED": "1"
  }
}
```

### VS Code Settings Configuration

Add to `.vscode/settings.json`:
```json
{
  "playwright.reuseBrowser": true,
  "playwright.showBrowser": true,
  "playwright.env": {
    "PWDEBUG": "console"
  }
}
```

### Prerequisites for Debugging
- Services must be running (docker-compose up)
- Or use preLaunchTask to start services automatically

### Pre-Launch Task Example

Add to `.vscode/tasks.json`:
```json
{
  "label": "Start E2E Services",
  "type": "npm",
  "script": "test:e2e:start",
  "path": "apps/frontend",
  "problemMatcher": [],
  "presentation": {
    "reveal": "silent",
    "panel": "dedicated"
  }
}
```

Reference in launch config:
```json
{
  "preLaunchTask": "Start E2E Services"
}
```

## Affected Areas
- [ ] Frontend (none)
- [ ] Backend (none)
- [ ] Database (none)
- [ ] Infrastructure (none)
- [ ] CI/CD (none)
- [x] VS Code Configuration
- [x] Documentation

## Implementation Steps

1. **Create/Update .vscode/launch.json**
   - Add "Debug E2E Tests" configuration
   - Add "Debug Current E2E Test" configuration
   - Add "Debug E2E with Inspector" configuration
   - Add compound configuration for running multiple

2. **Create/Update .vscode/tasks.json**
   - Add task to start E2E services
   - Add task to stop E2E services
   - Configure problem matchers if applicable

3. **Update .vscode/settings.json**
   - Configure Playwright extension settings
   - Set default browser behavior
   - Configure debug environment variables

4. **Test Debug Configurations**
   - Verify "Debug E2E Tests" runs and stops at breakpoints
   - Verify "Debug Current E2E Test" works with open files
   - Verify Playwright inspector launches
   - Test variable inspection and step-through debugging
   - Test on both Windows and Unix if possible

5. **Create Documentation**
   - Add "Debugging E2E Tests" section to README
   - Document each debug configuration and when to use it
   - Add screenshots/GIFs if helpful
   - Document keyboard shortcuts for debugging
   - Add troubleshooting tips

6. **Add Recommended Extensions**
   - Update `.vscode/extensions.json` with Playwright extension
   - Document why it's recommended

## Progress Log
- [2025-12-15 15:00] Task created by Planner Agent

## Testing Strategy
- Manual testing of each debug configuration
- Test breakpoints work correctly
- Test variable inspection
- Test with different test files
- Test error scenarios

## Related PRs
- TBD

## Lessons Learned
[To be filled after completion]
