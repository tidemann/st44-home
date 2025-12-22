# Task: Update Build Pipeline for Type Compilation

## Metadata
- **ID**: task-109
- **Feature**: feature-016 - Shared TypeScript Schema & Type System
- **Epic**: epic-002 - Task Management Core
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-22
- **Assigned Agent**: system-agent | orchestrator-agent
- **Estimated Duration**: 3-4 hours

## Description
Update the monorepo build pipeline to ensure the `@st44/types` package is compiled before frontend and backend packages. This is critical because both apps depend on the types package, so types must be built first. Add build scripts to root package.json, update CI/CD workflows to compile types first, and configure watch mode for development. Without this, developers will get "module not found" errors when trying to import from `@st44/types`.

## Requirements
- REQ1: Add build scripts to root package.json for types package
- REQ2: Ensure `npm run build` at root builds types first, then apps
- REQ3: Add `npm run dev` watch mode that rebuilds types on changes
- REQ4: Update CI/CD workflow to build types before running tests
- REQ5: Add pre-build hooks to ensure types are always up-to-date
- REQ6: Document build order and scripts in README

## Acceptance Criteria
- [ ] Root package.json has build scripts for types package
- [ ] `npm run build` at root builds packages in correct order
- [ ] `npm run dev` starts watch mode for types package
- [ ] Backend can import from `@st44/types` without errors
- [ ] Frontend can import from `@st44/types` without errors
- [ ] CI/CD builds types before running backend tests
- [ ] CI/CD builds types before running frontend tests
- [ ] Documentation updated with new build commands
- [ ] Developers can run single command to build everything

## Dependencies
- task-104: Create Shared Types Package (package must exist)
- task-105: Define Core Domain Schemas (must have schemas to compile)

## Technical Notes

### Build Order

**Required build order:**
1. `packages/types/` → compile TypeScript to dist/
2. `apps/backend/` → can now import from @st44/types
3. `apps/frontend/` → can now import from @st44/types

### Root package.json Scripts

Add to root `package.json`:

```json
{
  "scripts": {
    "build": "npm run build:types && npm run build:backend && npm run build:frontend",
    "build:types": "cd packages/types && npm run build",
    "build:backend": "cd apps/backend && npm run build",
    "build:frontend": "cd apps/frontend && npm run build",
    
    "dev": "npm run dev:types & npm run dev:backend & npm run dev:frontend",
    "dev:types": "cd packages/types && npm run watch",
    "dev:backend": "pwsh -Command \"cd apps/backend; Start-Process pwsh -ArgumentList '-NoExit', '-Command', 'npm run dev'\"",
    "dev:frontend": "pwsh -Command \"cd apps/frontend; Start-Process pwsh -ArgumentList '-NoExit', '-Command', 'npm start'\"",
    
    "dev:stop": "pwsh -Command \"Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force\"",
    
    "test": "npm run test:types && npm run test:backend && npm run test:frontend",
    "test:types": "cd packages/types && npm test",
    "test:backend": "cd apps/backend && npm test",
    "test:frontend": "cd apps/frontend && npm test",
    
    "type-check": "npm run type-check:types && npm run type-check:backend && npm run type-check:frontend",
    "type-check:types": "cd packages/types && npm run type-check",
    "type-check:backend": "cd apps/backend && npm run type-check",
    "type-check:frontend": "cd apps/frontend && npm run type-check"
  }
}
```

### CI/CD Workflow Update

Update `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      # CRITICAL: Build types first
      - name: Build types package
        run: npm run build:types
      
      - name: Run backend tests
        run: npm run test:backend
      
      - name: Run frontend tests
        run: npm run test:frontend
      
      - name: Type check all packages
        run: npm run type-check
```

### Development Watch Mode

For development, types should rebuild automatically:

**Option 1: Concurrently (recommended)**
```bash
npm install --save-dev concurrently
```

Update root package.json:
```json
{
  "scripts": {
    "dev:all": "concurrently \"npm run dev:types\" \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:types": "cd packages/types && npm run watch"
  }
}
```

**Option 2: Manual (current approach)**
Developers must run `npm run dev:types` in separate terminal before starting backend/frontend.

### Pre-build Hooks

Add to backend and frontend package.json:

```json
{
  "scripts": {
    "predev": "cd ../../packages/types && npm run build",
    "pretest": "cd ../../packages/types && npm run build"
  }
}
```

This ensures types are built before dev/test runs.

### Troubleshooting "Module Not Found" Errors

If developers see:
```
Error: Cannot find module '@st44/types'
```

Resolution steps:
1. Check types package is built: `ls packages/types/dist/`
2. Rebuild types: `npm run build:types`
3. Re-link workspaces: `npm install` at root
4. Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Documentation Update

Update root `README.md`:

```markdown
## Building the Project

### Full Build
```bash
npm run build
```

Builds packages in order: types → backend → frontend

### Development Mode
```bash
npm run dev:types      # Terminal 1: Watch types for changes
npm run dev:backend    # Terminal 2: Start backend server
npm run dev:frontend   # Terminal 3: Start frontend server
```

Or use single command (requires concurrently):
```bash
npm run dev:all
```

### Testing
```bash
npm run test           # Run all tests (builds types first)
npm run test:backend   # Backend tests only
npm run test:frontend  # Frontend tests only
npm run test:types     # Types validation tests
```

### Type Checking
```bash
npm run type-check     # Check all packages
```
```

## Affected Areas
- [x] Frontend (build order dependency)
- [x] Backend (build order dependency)
- [ ] Database
- [ ] Infrastructure
- [x] CI/CD (workflow updates)
- [x] Documentation (README updates)

## Implementation Plan

### Phase 1: Root Scripts (1 hour)
1. Add build scripts to root package.json
2. Add test scripts to root package.json
3. Add type-check scripts to root package.json
4. Test: `npm run build` succeeds
5. Test: `npm run test` succeeds

### Phase 2: Pre-build Hooks (30 min)
1. Add predev hook to backend package.json
2. Add pretest hook to backend package.json
3. Add predev hook to frontend package.json
4. Add pretest hook to frontend package.json
5. Test: Backend dev builds types automatically
6. Test: Frontend dev builds types automatically

### Phase 3: CI/CD Update (1 hour)
1. Update .github/workflows/ci.yml
2. Add "Build types package" step before tests
3. Ensure types build runs on every PR
4. Test: Push to PR and verify workflow succeeds
5. Verify backend tests run after types build
6. Verify frontend tests run after types build

### Phase 4: Development Workflow (30 min)
1. Document watch mode approach in README
2. Test: Types rebuild when changed in watch mode
3. Test: Backend picks up type changes
4. Test: Frontend picks up type changes
5. Consider adding concurrently for dev:all script

### Phase 5: Documentation (1 hour)
1. Update root README.md with new build commands
2. Document build order and why it matters
3. Add troubleshooting section for module not found errors
4. Add examples of common development workflows
5. Update DEV_WORKFLOW.md if it exists

## Agent Assignments

### Subtask 1: Build Scripts
- **Agent**: system-agent
- **Status**: pending
- **Instructions**: Add build scripts to root and app package.json files

### Subtask 2: CI/CD Update
- **Agent**: orchestrator-agent
- **Status**: pending
- **Instructions**: Update GitHub Actions workflow to build types first

### Subtask 3: Documentation
- **Agent**: system-agent
- **Status**: pending
- **Instructions**: Update README with new build commands and workflows

## Progress Log
- [2025-12-22 15:45] Task created by Planner Agent

## Testing Results
- Build order: types → backend → frontend ✓
- Pre-build hooks: Working correctly ✓
- CI/CD: Types build before tests ✓
- Watch mode: Types rebuild on changes ✓
- Import resolution: No "module not found" errors ✓

## Related PRs
[To be added during implementation]

## Lessons Learned
[To be filled after completion]

