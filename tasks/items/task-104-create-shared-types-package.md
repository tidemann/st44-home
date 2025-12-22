# Task: Create Shared Types Package Structure

## Metadata
- **ID**: task-104
- **Feature**: feature-016 - Shared TypeScript Schema & Type System
- **Epic**: epic-002 - Task Management Core
- **Status**: in-progress
- **Priority**: high
- **Created**: 2025-12-22
- **Assigned Agent**: orchestrator | frontend | backend
- **Estimated Duration**: 4-6 hours

## Description
Create the foundational structure for the shared TypeScript types package that will be used by both frontend and backend. This package will serve as the single source of truth for all data models in the application. The package needs proper TypeScript configuration, build setup, and monorepo integration to enable type-safe imports in other packages.

## Requirements
- Requirement 1: Create `packages/types/` directory with proper package structure
- Requirement 2: Configure TypeScript with strict mode and proper exports
- Requirement 3: Set up build scripts that compile TypeScript to CommonJS and ESM
- Requirement 4: Integrate with monorepo workspace configuration
- Requirement 5: Enable imports from `@st44/types` in frontend and backend
- Requirement 6: Include Zod for runtime schema validation
- Requirement 7: Create basic directory structure for schemas, types, and generators

## Acceptance Criteria
- [ ] `packages/types/` directory created with proper structure
- [ ] `package.json` configured with name `@st44/types`, main/types exports
- [ ] `tsconfig.json` configured with strict mode, declaration files
- [ ] Build script compiles TypeScript successfully
- [ ] Zod dependency installed and configured
- [ ] Root `package.json` workspace includes `packages/types`
- [ ] Frontend can import from `@st44/types` (verified with test import)
- [ ] Backend can import from `@st44/types` (verified with test import)
- [ ] README.md with package purpose and usage instructions
- [ ] All tests pass (no existing tests should break)

## Dependencies
- None - this is the foundational task for feature-016

## Technical Notes

### Package Structure
```
packages/types/
├── package.json          # Package configuration
├── tsconfig.json         # TypeScript configuration
├── vitest.config.ts      # Testing configuration
├── README.md             # Package documentation
├── src/
│   ├── schemas/          # Zod schemas (source of truth)
│   │   └── index.ts      # Export all schemas
│   ├── types/            # Generated TypeScript types
│   │   ├── domain.types.ts    # Core domain models
│   │   ├── api.types.ts       # API request/response types
│   │   └── index.ts           # Export all types
│   ├── generators/       # Code generators
│   │   ├── openapi.generator.ts
│   │   ├── case-converter.ts
│   │   └── index.ts
│   └── index.ts          # Main export file
└── dist/                 # Compiled output (gitignored)
```

### TypeScript Configuration
- Strict mode enabled
- ESM + CommonJS output
- Declaration files (`.d.ts`) generated
- Source maps for debugging
- Composite project for monorepo

### Package.json Configuration
```json
{
  "name": "@st44/types",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "test": "vitest"
  },
  "dependencies": {
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### Monorepo Integration
Update root `package.json`:
```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

### Testing Strategy
- Create simple test file to verify build works
- Test imports from frontend (create temporary import in a service)
- Test imports from backend (create temporary import in server.ts)
- Verify TypeScript compilation succeeds in all packages

## Affected Areas
- [x] Frontend (Angular) - will import from shared types
- [x] Backend (Fastify/Node.js) - will import from shared types
- [ ] Database (PostgreSQL) - no direct impact
- [ ] Infrastructure (Docker/Nginx) - no direct impact
- [ ] CI/CD - build order must compile types first
- [x] Documentation - README.md for package

## Implementation Plan

### Phase 1: Directory Structure
1. Create `packages/types/` directory
2. Create subdirectories: `src/schemas/`, `src/types/`, `src/generators/`
3. Create placeholder `index.ts` files in each subdirectory
4. Create main `src/index.ts` that exports everything

### Phase 2: Package Configuration
1. Create `package.json` with:
   - Package name: `@st44/types`
   - Proper exports configuration
   - Zod dependency
   - TypeScript dev dependency
   - Build scripts
2. Create `tsconfig.json` with:
   - Strict mode enabled
   - Declaration file generation
   - Composite project setup
   - ESM module resolution
3. Create `vitest.config.ts` for testing setup
4. Create `README.md` with package overview

### Phase 3: Monorepo Integration
1. Update root `package.json` to include `packages/*` in workspaces
2. Run `npm install` at root to link packages
3. Verify `@st44/types` appears in node_modules of frontend and backend

### Phase 4: Build Verification
1. Add temporary export in `src/index.ts`: `export const TEST = 'types-package'`
2. Run `npm run build` in `packages/types/`
3. Verify `dist/index.js` and `dist/index.d.ts` are generated
4. Check that declaration files are valid TypeScript

### Phase 5: Import Verification
1. In `apps/frontend/src/app/app.component.ts`:
   - Add temporary import: `import { TEST } from '@st44/types'`
   - Add console.log to verify import works
2. In `apps/backend/src/server.ts`:
   - Add temporary import: `import { TEST } from '@st44/types'`
   - Add console.log to verify import works
3. Run frontend: `cd apps/frontend && npm start`
4. Run backend: `cd apps/backend && npm run dev`
5. Verify no import errors, console.log shows expected value
6. Remove temporary test imports

### Phase 6: Documentation
1. Write comprehensive README.md:
   - Package purpose and benefits
   - How to add new schemas
   - How to use types in frontend/backend
   - Build and testing instructions
   - Examples of imports
2. Add comments to `tsconfig.json` explaining settings

### Phase 7: Testing
1. Create `src/schemas/index.test.ts` with basic test
2. Run `npm test` to verify test infrastructure works
3. Add type-checking test to verify exports are valid

## Agent Assignments

### Subtask 1: Create Package Structure and Configuration
- **Agent**: backend-agent (familiar with TypeScript/Node.js packages)
- **Status**: pending
- **Instructions**:
  1. Create directory structure as outlined above
  2. Write `package.json` with correct configuration
  3. Write `tsconfig.json` with strict settings
  4. Write `vitest.config.ts` for testing
  5. Write basic README.md

### Subtask 2: Monorepo Integration
- **Agent**: orchestrator-agent (handles multi-package coordination)
- **Status**: pending
- **Instructions**:
  1. Update root `package.json` workspaces
  2. Run `npm install` to link packages
  3. Verify package appears in other packages' node_modules
  4. Test imports in frontend and backend

### Subtask 3: Build and Testing Verification
- **Agent**: frontend-agent | backend-agent
- **Status**: pending
- **Instructions**:
  1. Add temporary test exports
  2. Verify compilation works
  3. Test imports in both frontend and backend
  4. Remove temporary code after verification
  5. Create basic unit test file

## Progress Log
- [2025-12-22 16:00] Task created by Orchestrator Agent
- [2025-12-22 16:30] Status changed to in-progress
- [2025-12-22 16:30] Created feature branch: feature/task-104-create-shared-types-package
- [2025-12-22 16:30] Beginning implementation of shared types package

## Testing Results
[To be filled during testing phase]

## Review Notes
[To be filled during review phase]

## Related PRs
[To be added during implementation]

## Lessons Learned
[To be filled after completion]
