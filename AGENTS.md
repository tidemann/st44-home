# Project Root - Agent Context

## Project Overview

This is a full-stack TypeScript monorepo with Angular frontend and Fastify backend, using PostgreSQL as the database. The project uses modern practices including standalone Angular components, signals for state management, and ESM modules throughout.

## Architecture

```
┌─────────────────┐
│   Angular 21+   │  Frontend (Port 4200 dev, served via Nginx in prod)
│   Standalone     │
└────────┬────────┘
         │ HTTP (proxied)
         ↓
┌─────────────────┐
│   Fastify API   │  Backend (Port 3000)
│   Node.js/TS    │
└────────┬────────┘
         │ pg Pool
         ↓
┌─────────────────┐
│  PostgreSQL 17  │  Database (Port 5432)
└─────────────────┘
```

## Monorepo Structure

```
home/
├── apps/
│   ├── frontend/        # Angular 21+ application
│   └── backend/         # Fastify API server
├── infra/              # Docker Compose setup
├── docker/             # Docker images and init scripts
├── tasks/              # Work items (epics, features, tasks)
└── .github/            # CI/CD, copilot instructions, agent specs
```

## Technology Stack

### Frontend
- **Framework**: Angular 21+
- **Language**: TypeScript 5.x (strict mode)
- **State**: Signals and computed values (no NgRx)
- **HTTP**: HttpClient with environment-based configuration
- **Routing**: Standalone component routing
- **Styling**: CSS (TailwindCSS ready)
- **Testing**: Jasmine + Karma

### Backend
- **Framework**: Fastify 5.x
- **Language**: TypeScript 5.x (ESM modules)
- **Database Client**: pg (PostgreSQL driver)
- **Validation**: Fastify JSON Schema
- **Logging**: Fastify built-in logger
- **Testing**: (To be determined)

### Database
- **Engine**: PostgreSQL 17
- **Schema**: Defined in `docker/postgres/init.sql`
- **Migrations**: Manual SQL files (migration system TBD)
- **Connection**: Connection pooling via pg.Pool

### Infrastructure
- **Development**: Local processes with Angular proxy
- **Production**: Docker Compose with Nginx reverse proxy
- **CI/CD**: GitHub Actions (TBD)

## Development Workflow

### Local Development
```bash
# Start database only
cd infra && docker compose up -d db

# Start backend dev server (detached - opens new window)
npm run dev:backend

# Start frontend dev server (detached - opens new window)
npm run dev:frontend

# Or start both at once
npm run dev:all

# Stop all dev servers
npm run dev:stop
```

**CRITICAL FOR AGENTS**: When testing endpoints, NEVER run `npm run dev` directly in your working terminal. Always use the detached scripts above (`npm run dev:backend` or `npm run dev:frontend`) which open new PowerShell windows. This keeps your working terminal free for running test commands.

Access:
- Frontend: http://localhost:4200
- Backend: http://localhost:3000
- Database: localhost:5432

### Docker Development
```bash
# From project root
npm run docker:up        # Starts all services
npm run docker:down      # Stops all services
```

Access:
- Frontend: http://localhost:8080
- Backend: http://localhost:8080/api (proxied by Nginx)

## Environment Configuration

### Frontend
- **Dev**: Uses `proxy.conf.json` to proxy `/api` and `/health` to `localhost:3000`
- **Prod**: Uses relative URLs, proxied by Nginx to backend container

Files:
- `apps/frontend/src/environments/environment.development.ts` - Dev config
- `apps/frontend/src/environments/environment.ts` - Prod config
- `apps/frontend/proxy.conf.json` - Dev proxy configuration

### Backend
Environment variables (via .env or Docker):
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: st44)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password (default: postgres)
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `CORS_ORIGIN` - CORS origin (default: *)

## Key Conventions

### TypeScript
- Strict mode enabled
- ESM modules (`type: "module"` in package.json)
- Prefer type inference over explicit types
- No `any` types - use `unknown` when uncertain

### Angular
- Standalone components only (no NgModules)
- `standalone: true` is implicit (Angular 20+)
- Use `input()` and `output()` functions, not decorators
- Use signals (`signal`, `computed`) for state
- `ChangeDetectionStrategy.OnPush` required
- Use `inject()` instead of constructor injection
- Native control flow (`@if`, `@for`, `@switch`)
- No `ngClass` or `ngStyle` - use class/style bindings

### Fastify
- Async/await for all async operations
- Type-safe route handlers with generics
- Use connection pooling for database queries
- Parameterized queries to prevent SQL injection
- Proper error handling with appropriate status codes
- Enable CORS for development

### Git Workflow
1. Create feature branch: `git checkout -b feature/description`
2. Make changes and commit with conventional commits
3. Push: `git push -u origin feature/description`
4. Create PR: `gh pr create --base main`
5. Squash merge after review

## Important Files

### Project Configuration
- `package.json` - Root workspace scripts
- `.github/copilot-instructions.md` - Coding standards and best practices
- `README.md` - Project setup and getting started

### Agent System
- `.github/agents/` - AI agent specifications
- `tasks/` - Work items (epics, features, tasks)
- `tasks/ROADMAP.md` - Product roadmap

### Infrastructure
- `infra/docker-compose.yml` - Multi-service setup
- `infra/nginx/nginx.conf` - Reverse proxy config
- `docker/postgres/init.sql` - Database initialization

## When Making Changes

### Adding a New Feature
1. Planner Agent creates feature file in `tasks/features/`
2. Orchestrator Agent breaks down into tasks in `tasks/items/`
3. Expert Agents implement tasks
4. Update relevant AGENTS.md files with new patterns
5. Update documentation if user-facing

### Modifying Existing Code
1. Read relevant AGENTS.md for context
2. Follow established patterns in that area
3. Update AGENTS.md if patterns change
4. Ensure tests pass
5. Update documentation if necessary

### Database Changes
1. **ALWAYS create a migration file** in `docker/postgres/migrations/`
2. Follow naming convention: `NNN_descriptive_name.sql` (001, 002, etc.)
3. Use `TEMPLATE.sql` as starting point
4. Make migrations idempotent (IF NOT EXISTS, etc.)
5. Test locally before committing
6. Also update `init.sql` for new tables (fresh installs)

**Migration File Structure**:
```sql
-- Migration: NNN_name
-- Description: What this changes
-- Date: YYYY-MM-DD
-- Related Task: task-XXX

BEGIN;

CREATE TABLE IF NOT EXISTS my_table (...);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('NNN', 'name', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

**Apply Migration**:
```bash
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/NNN_name.sql
```

**Verify**:
```bash
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT * FROM schema_migrations ORDER BY version;"
```

**See `docker/postgres/migrations/README.md` for complete documentation.**

### API Changes
1. Update backend route handler
2. Update frontend service calling the API
3. Update types on both sides
4. Test the integration
5. Document in API docs (TBD)

## Testing Strategy

### Frontend
- Unit tests: `npm test` (Jasmine + Karma)
- E2E tests: TBD
- Accessibility: Manual AXE checks required

### Backend
- Unit tests: TBD
- Integration tests: TBD
- API tests: Manual testing for now

### End-to-End
- Full stack testing: TBD
- Docker deployment verification: Manual

## Common Tasks

### Add a New Database Table
1. Add CREATE TABLE to `docker/postgres/init.sql`
2. Restart database: `cd infra && docker compose down db && docker compose up -d db`
3. Create TypeScript interface in backend
4. Create API endpoints if needed

### Add a New API Endpoint
1. Add route handler in `apps/backend/src/server.ts` (or new route file)
2. Follow existing patterns (async/await, error handling)
3. Create/update service method in frontend
4. Use the service in components

### Add a New Angular Component
1. Create component file: `component-name.ts`
2. Use standalone component pattern
3. Use signals for state
4. Import in routes or parent component
5. Follow accessibility guidelines

## Known Issues & TODOs

- [x] Migration system implemented (December 2025)
- [ ] Testing setup incomplete
- [ ] CI/CD pipeline not configured (needs migration runner)
- [ ] API documentation needed
- [ ] Error tracking/monitoring not set up
- [ ] Production deployment guide needed

## Resources

- [Angular Best Practices](.github/copilot-instructions.md)
- [Agent System](.github/agents/README.md)
- [Project Roadmap](tasks/ROADMAP.md)
- [Frontend Context](apps/frontend/AGENTS.md)
- [Backend Context](apps/backend/AGENTS.md)
- [Infrastructure Context](infra/AGENTS.md)

---

**Last Updated**: 2025-12-13
**Update This File**: When architecture changes, new patterns emerge, or conventions evolve
