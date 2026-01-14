# CLAUDE.md

**IMPORTANT**: This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. YOU MUST follow all conventions and workflows described here.

## Project Overview

Full-stack TypeScript monorepo: Angular 21+ frontend, Fastify backend, PostgreSQL database.

**CRITICAL**: This is a production application with strict quality requirements. Always run local tests before pushing.

## Platform Awareness

**CRITICAL: Check the Platform field in <env> at the start of EVERY session**

Claude Code CLI automatically provides environment information at the start of each conversation:

```xml
<env>
Working directory: C:\code\st44-home
Is directory a git repo: Yes
Platform: win32          ← CHECK THIS FIRST!
OS Version:
Today's date: 2026-01-09
</env>
```

**Platform Detection:**

- `Platform: win32` = **Windows**
  - Use Windows path format: `C:\path\to\file` (NOT `/c/path/to/file`)
  - Prefer PowerShell for complex operations
  - Git Bash available but has limitations
  - Don't assume Linux utilities exist (`jq`, `awk`, `sed`)
  - Use `ConvertFrom-Json` instead of `jq`
  - Use `Select-String` instead of `grep` in PowerShell

- `Platform: linux` = **Linux**
  - Use Unix path format: `/path/to/file`
  - Full bash utilities available
  - Standard Linux tools (`jq`, `awk`, `sed`, etc.)

- `Platform: darwin` = **macOS**
  - Use Unix path format: `/path/to/file`
  - Mostly bash compatible
  - Some BSD-specific differences

**NEVER assume the platform. ALWAYS check `<env>` before writing commands.**

## Commands

### Build

```bash
npm run build                    # Build all (types → backend → frontend)
npm run build:types              # Build shared types package
npm run build:backend            # Build backend only
npm run build:frontend           # Build frontend only
```

### Development

```bash
# Start database
cd infra && docker compose up -d db

# Start dev servers (opens separate windows)
npm run dev:backend              # Backend at localhost:3000
npm run dev:frontend             # Frontend at localhost:4200
npm run dev:all                  # Both servers
npm run dev:stop                 # Stop all dev servers
```

### Testing

**CRITICAL: ALWAYS test locally BEFORE pushing to avoid slow CI feedback loops!**

```bash
# REQUIRED before every push - Test locally first!
cd apps/frontend && npm run build    # Build frontend
cd apps/frontend && npm test          # Run frontend tests
cd apps/backend && npm test           # Run backend tests

# Comprehensive testing
npm test                         # All tests
npm run test:types               # packages/types tests (vitest)
npm run test:backend             # Backend tests (tsx --test)
npm run test:frontend            # Frontend tests (karma)

# Single test file (backend)
cd apps/backend && npx tsx --test src/routes/tasks.test.ts

# Single test file (types package)
cd packages/types && npx vitest run src/schemas/task.schema.test.ts

# E2E tests
cd apps/frontend
npm run test:e2e:full            # Start services, run tests, stop services
npm run test:e2e:local           # Run tests against running services
npm run test:e2e:ui              # Interactive UI mode

# For comprehensive e2e testing guide, see: docs/E2E.md
# Use /e2e skill for interactive test execution
```

### Type Checking & Formatting

```bash
npm run type-check               # Check types (backend + types package)

# Formatting is AUTOMATIC via pre-commit hooks (Husky + lint-staged)
# When you commit, code is automatically formatted and linted
# Manual formatting only needed for uncommitted changes:
cd apps/frontend && npm run format  # Format frontend
cd apps/backend && npm run format   # Format backend
```

### Docker

```bash
npm run docker:up                # Start full stack
npm run docker:down              # Stop stack
npm run db:test:up               # Start test database
npm run db:test:down             # Stop test database
```

### Production Deployment

**CRITICAL DEPLOYMENT RULES:**

1. **NO .env FILES ON SERVER** - The production server does NOT use .env files. All secrets (DB_PASSWORD, etc.) are stored in GitHub Secrets and passed directly via the deployment workflow.

2. **Server has NO git** - The deployment server does not have git installed. GitHub Actions has full control over deployment via SSH/SCP.

3. **Server has NO source code** - The server only runs pre-built Docker images from GHCR. It cannot build images locally.

4. **Docker Compose on server** - The server has its own docker-compose.yml at `/srv/st44-home/infra/`. Changes to infra/docker-compose.yml require manual sync or SCP.

### Storybook (Component Development)

**IMPORTANT: All new components MUST have corresponding Storybook stories.**

```bash
# Start Storybook dev server
cd apps/frontend
npm run storybook                # Opens at localhost:6006

# Build static Storybook (for deployment)
npm run build-storybook          # Output: storybook-static/

# Generate Compodoc docs (before running Storybook)
npm run storybook:docs

# Full workflow
npm run storybook:docs && npm run storybook
```

**Storybook Workflow:**

1. Create component: `ng generate component components/button --standalone`
2. Create story file: `button.stories.ts` (next to component)
3. Run Storybook: `npm run storybook`
4. Develop component in isolation with hot reload
5. Test all states/variants in stories
6. Check accessibility with a11y addon
7. Test responsive behavior (viewports)
8. Integrate component into app

**Story Requirements:**

- One `.stories.ts` file per component
- Multiple story variants (Default, Disabled, Loading, etc.)
- Accessibility testing enabled (a11y addon)
- All @Input() properties in argTypes
- tags: ['autodocs'] for automatic documentation

**Naming Convention:**

- Components: `Components/Button`, `Components/Cards/TaskCard`
- Pages: `Pages/Home`, `Pages/Auth/Login`
- Design System: `Design System/Colors`, `Design System/Typography`

See `.claude/skills/storybook/SKILL.md` for complete guidance.

## Architecture

```
apps/
├── frontend/                    # Angular 21+ (standalone components, signals)
│   └── src/app/
│       ├── components/          # UI components
│       └── services/            # API services
├── backend/                     # Fastify API
│   └── src/
│       ├── routes/              # Route handlers
│       ├── middleware/          # Auth, etc.
│       └── test-helpers/        # Test utilities
packages/
├── types/                       # @st44/types - shared Zod schemas and types
docker/
└── postgres/
    ├── init.sql                 # Database schema
    └── migrations/              # Versioned migrations (NNN_name.sql)
infra/                           # Docker Compose configuration
```

## Key Conventions

**YOU MUST follow these conventions in all code:**

### TypeScript

- **CRITICAL: camelCase everywhere** - variables, properties, database columns (NEVER use snake_case)
- Strict mode, ESM modules
- **NEVER use `any`** - use `unknown` instead

### Angular (Frontend)

- Standalone components only (no NgModules, `standalone: true` is implicit)
- Use `signal()`, `computed()` for state (not RxJS for component state)
- Use `inject()` for DI (not constructor injection)
- Use `input()`, `output()` functions (not decorators)
- Use `@if`, `@for`, `@switch` (not `*ngIf`, `*ngFor`)
- Use `[class.x]="..."` (not `ngClass`)
- `ChangeDetectionStrategy.OnPush` required

### Fastify (Backend)

- Async/await, type-safe route handlers
- Parameterized queries only (SQL injection prevention)
- Use `@st44/types` schemas for validation
- Connection pooling via `pg.Pool`

### Database

**CRITICAL - MIGRATION-FIRST WORKFLOW (MANDATORY)**:

- **ALL database changes MUST have a migration file** in `docker/postgres/migrations/NNN_name.sql`
- **WITHOUT MIGRATION, CHANGES WILL NOT DEPLOY TO PRODUCTION**
- Make migrations idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- Wrap in `BEGIN`/`COMMIT` transactions
- Update `schema_migrations` table in each migration
- Also update `init.sql` for new tables
- Test migrations locally BEFORE pushing

## Git Workflow

**CRITICAL: NEVER PUSH DIRECTLY TO MAIN - Always use feature branches**

1. Create feature branch: `git checkout -b feature/name`
2. Make changes (pre-commit hooks automatically format/lint on commit)
3. **MANDATORY LOCAL TESTING BEFORE PUSHING**:

   ```bash
   # Run all tests
   cd apps/backend && npm test
   cd apps/frontend && npm test

   # Build and run locally
   cd apps/backend
   npm run build              # Compile TypeScript
   npm start                  # Start server
   # Test endpoints with curl
   curl http://localhost:3000/api/your-endpoint
   curl http://localhost:3000/health
   ```

4. **Verify in browser/API client** - Test new endpoints/features work
5. Push and create PR: `gh pr create --base main`
6. Squash merge after CI passes

**Pre-push validation is MANDATORY**:

- ❌ DO NOT push if tests fail locally
- ❌ DO NOT push if build fails
- ❌ DO NOT push if server won't start
- ❌ DO NOT push if endpoints return 404/500
- ✅ ONLY push when everything works locally

## Shared Types (@st44/types)

Zod schemas in `packages/types/src/schemas/` define validation for both frontend and backend:

```typescript
import { TaskSchema, type Task } from '@st44/types/schemas';
```

When modifying schemas, rebuild: `npm run build:types`

## Autonomous Development Mode

**⚠️ IMPORTANT: All work is now tracked in GitHub Issues, not local markdown files.**

This repo supports fully autonomous development. To take over development:

### Start the Loop

```bash
# Query GitHub Issues for next priority
gh issue list --label "mvp-blocker" --state open
gh issue list --milestone "MVP Launch" --state open
```

### Orchestrator Workflow

The orchestrator runs an autonomous loop:

1. **Query GitHub Issues** → Get next priority (mvp-blocker > critical > high-priority)
2. **Read issue details** → `gh issue view <NUMBER>`
3. **Break down if needed** → Features must be decomposed into task issues first
4. **Mark as in-progress** → `gh issue edit <NUMBER> --add-label "in-progress"`
5. **Delegate to subagents** → Spawn specialized agents for implementation
6. **Validate** → Run tests locally, ensure all pass
7. **Ship** → Create PR with "Closes #<NUMBER>", wait for CI, merge
8. **Auto-close** → Issue closes automatically when PR merges
9. **Loop** → Pull main, go back to step 1

### Subagent Delegation

Use the **Task tool** to spawn specialized agents. Each agent should be given:

- GitHub issue number and details
- Path to its agent spec file for context
- Relevant files to read/modify

**agent-github-issues** - Issue creation, tracking, milestones

```
Spawn Task agent with subagent_type="agent-github-issues" and prompt:
"Read .claude/agents/agent-github-issues.md for context. Create issues for: [description]"
```

**agent-frontend** - Angular components, services, UI

```
Spawn Task agent with subagent_type="agent-frontend" and prompt:
"Read .claude/agents/agent-frontend.md for context. Implement GitHub issue #XXX"
```

**agent-storybook** - Component stories, visual testing, design system docs

```
Spawn Task agent with subagent_type="agent-storybook" and prompt:
"Read .claude/agents/agent-storybook.md and .claude/skills/storybook/SKILL.md for context. Create Storybook story for ComponentName (#XXX) with all variants"
```

**agent-e2e** - Playwright e2e testing, test debugging, page objects

```
Spawn Task agent with subagent_type="agent-e2e" and prompt:
"Read .claude/agents/agent-e2e.md for context. Debug e2e test failures in GitHub issue #XXX"
```

**agent-backend** - Fastify routes, business logic, middleware

```
Spawn Task agent with subagent_type="agent-backend" and prompt:
"Read .claude/agents/agent-backend.md for context. Implement GitHub issue #XXX"
```

**agent-database** - Migrations, schema changes, queries

```
Spawn Task agent with subagent_type="agent-database" and prompt:
"Read .claude/agents/agent-database.md for context. Implement GitHub issue #XXX"
```

**agent-cicd** - GitHub Actions monitoring, quality gates

```
Spawn Task agent with subagent_type="agent-cicd" and prompt:
"Read .claude/agents/agent-cicd.md for context. Monitor CI for commit/PR"
```

### Parallel Execution

When tasks are independent, spawn multiple agents in parallel:

```
// Example: Feature requires both frontend and backend work
1. Spawn agent-backend for API endpoint (run_in_background: true)
2. Spawn agent-database for migration (run_in_background: true)
3. Wait for both to complete
4. Spawn agent-frontend for UI (depends on API)
```

### Critical Rules

1. **Never push to main** - Always use feature branches
2. **Test before PR** - Run `npm test` and `npm run type-check` locally
3. **Track in GitHub** - ALL work must have a GitHub issue
4. **Update issue status** - Mark as "in-progress" when starting, comment with progress
5. **Close via PR** - Use "Closes #XXX" in PR description
6. **Pull after merge** - Always `git checkout main && git pull` after merge

### Task System - GitHub Issues

**All work tracked as GitHub Issues with labels and milestones:**

**Issue Types** (labels):

- `epic` - Large initiatives (weeks), tracked in milestones
- `feature` - User-facing functionality (days)
- `task` - Atomic work items (hours)
- `bug` - Defects to fix

**Priority Labels**:

- `mvp-blocker` - Must fix before launch
- `critical` - Blocks core functionality
- `high-priority` - Important for current milestone
- `medium-priority`, `low-priority`

**Workflow**:

1. Create issue with proper labels and milestone
2. Mark "in-progress" when starting
3. Comment with progress updates
4. Create PR with "Closes #XXX"
5. Issue auto-closes on merge

**Common Commands**:

```bash
# Find work
gh issue list --label "mvp-blocker" --state open

# Create issue
gh issue create --title "..." --body "..." --label "..." --milestone "..."

# Update status
gh issue edit 123 --add-label "in-progress"
gh issue comment 123 --body "Progress update..."

# Close issue
# (Automatic via PR with "Closes #123")
```

### Agent Specs

Detailed agent specifications in `.claude/agents/`:

- `agent-orchestrator.md` - Full workflow documentation
- `agent-github-issues.md` - Issue management workflows
- `agent-frontend.md` - Angular patterns and conventions
- `agent-backend.md` - Fastify patterns and conventions
- `agent-database.md` - Migration and query patterns
- `agent-cicd.md` - CI/CD monitoring and quality gates
- `agent-storybook.md` - Storybook component development
- `agent-e2e.md` - Playwright e2e testing
