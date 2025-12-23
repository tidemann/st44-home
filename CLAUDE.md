# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack TypeScript monorepo: Angular 21+ frontend, Fastify backend, PostgreSQL database.

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
```bash
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
```

### Type Checking & Formatting
```bash
npm run type-check               # Check types (backend + types package)
cd apps/frontend && npm run format && cd ../backend && npm run format  # Format before commit
```

### Docker
```bash
npm run docker:up                # Start full stack
npm run docker:down              # Stop stack
npm run db:test:up               # Start test database
npm run db:test:down             # Stop test database
```

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

### TypeScript
- **camelCase everywhere** - variables, properties, database columns (no snake_case)
- Strict mode, ESM modules
- Use `unknown` over `any`

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
- Migrations in `docker/postgres/migrations/NNN_name.sql`
- Make migrations idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- Wrap in `BEGIN`/`COMMIT` transactions
- Update `schema_migrations` table in each migration
- Also update `init.sql` for new tables

## Git Workflow

1. Create feature branch: `git checkout -b feature/name`
2. Make changes, format code
3. Push and create PR: `gh pr create --base main`
4. Squash merge after CI passes

Never push directly to main.

## Shared Types (@st44/types)

Zod schemas in `packages/types/src/schemas/` define validation for both frontend and backend:
```typescript
import { TaskSchema, type Task } from '@st44/types/schemas';
```

When modifying schemas, rebuild: `npm run build:types`

## Autonomous Development Mode

This repo supports fully autonomous development. To take over development:

### Start the Loop
```
Read tasks/ROADMAP.md and execute the top priority from the "Now" section
```

### Orchestrator Workflow

The orchestrator runs an autonomous loop:

1. **Read ROADMAP.md** → Get next priority (task, feature, or epic)
2. **Break down if needed** → Features must be decomposed into tasks first
3. **Delegate to subagents** → Spawn specialized agents for implementation
4. **Validate** → Run tests locally, ensure all pass
5. **Ship** → Create PR, wait for CI, merge
6. **Loop** → Pull main, go back to step 1

### Subagent Delegation

Use the **Task tool** to spawn specialized agents. Each agent should be given:
- The task description and acceptance criteria
- Path to its agent spec file for context
- Relevant files to read/modify

**Frontend Agent** - Angular components, services, UI
```
Spawn Task agent with prompt:
"Read .github/agents/frontend-agent.md for context. Then implement: [task description]"
```

**Backend Agent** - Fastify routes, business logic, middleware
```
Spawn Task agent with prompt:
"Read .github/agents/backend-agent.md for context. Then implement: [task description]"
```

**Database Agent** - Migrations, schema changes, queries
```
Spawn Task agent with prompt:
"Read .github/agents/database-agent.md for context. Then implement: [task description]"
```

### Parallel Execution

When tasks are independent, spawn multiple agents in parallel:
```
// Example: Feature requires both frontend and backend work
1. Spawn backend agent for API endpoint (run_in_background: true)
2. Spawn database agent for migration (run_in_background: true)
3. Wait for both to complete
4. Spawn frontend agent for UI (depends on API)
```

### Critical Rules

1. **Never push to main** - Always use feature branches
2. **Test before PR** - Run `npm test` and `npm run type-check` locally
3. **Update ROADMAP.md** - After completing work, update status
4. **Move to done/** - Completed tasks go to `tasks/items/done/`
5. **Pull after merge** - Always `git checkout main && git pull` after merge

### Task System

```
tasks/
├── ROADMAP.md           # Prioritized backlog (start here)
├── epics/               # Large initiatives (weeks)
├── features/            # User-facing functionality (days)
├── items/               # Atomic tasks (hours)
│   └── done/            # Completed tasks
└── templates/           # Templates for new items
```

### Agent Specs

Detailed agent specifications in `.github/agents/`:
- `orchestrator-agent.md` - Full workflow documentation
- `frontend-agent.md` - Angular patterns and conventions
- `backend-agent.md` - Fastify patterns and conventions
- `database-agent.md` - Migration and query patterns
