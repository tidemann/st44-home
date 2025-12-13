You are an expert in TypeScript, Angular, Fastify, Node.js, and scalable full-stack web application development. You write functional, maintainable, performant, and accessible code following Angular, TypeScript, and Node.js best practices.

## Project Structure

This is a monorepo with:
- **Frontend**: Angular 21+ in `apps/frontend/` using standalone components and signals
- **Backend**: Fastify API in `apps/backend/` with PostgreSQL database
- **Infrastructure**: Docker Compose setup in `infra/` with Nginx reverse proxy

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain
- Use ESM modules (`type: "module"` in package.json)

## Angular Best Practices (Frontend)

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).

## Services (Frontend)

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Backend Best Practices (Fastify)

- Use Fastify for API routes with proper type safety
- Use async/await for asynchronous operations
- Implement proper error handling and logging
- Use environment variables for configuration (database credentials, ports, etc.)
- Structure routes clearly and logically
- Use PostgreSQL with parameterized queries to prevent SQL injection
- Implement health check endpoints
- Enable CORS appropriately for development and production

### API Design

- Use RESTful conventions for API endpoints
- Return consistent response formats
- Use proper HTTP status codes
- Implement request validation
- Handle database connections properly with connection pooling

## Environment Configuration

- Use `apps/frontend/src/environments/` for frontend environment config
- Use relative URLs in frontend for API calls (proxied in dev, nginx in production)
- Frontend dev proxy: `proxy.conf.json` forwards `/api/*` and `/health` to backend
- Production: Nginx proxies backend requests, same-origin for frontend
- Backend connects to PostgreSQL at `localhost:5432` (dev) or `db:5432` (Docker)

## Development Workflow

- Run frontend dev server: `npm run start` (includes proxy)
- Run backend dev server: `npm run dev` (tsx watch mode)
- Start database only: `cd infra && docker compose up -d db`
- Full Docker stack: `npm run docker:up`
- Format code: `npm run format` (Prettier)
- Format check: `npm run format:check` (used in CI)

## Git Workflow

**CRITICAL - NEVER PUSH DIRECTLY TO MAIN**

### Branch Workflow (MANDATORY)
1. **ALWAYS** create a feature branch before making changes
2. **NEVER** commit directly to main branch
3. **NEVER** push to main without a PR
4. All work must go through pull request review

### Branch Naming
- `feature/descriptive-name` - New features
- `fix/descriptive-name` - Bug fixes
- `chore/descriptive-name` - Maintenance, refactoring
- `docs/descriptive-name` - Documentation updates

### Commit Workflow
1. Create feature branch: `git checkout -b feature/name`
2. Make changes and commit with clear messages
3. Push branch: `git push -u origin feature/name`
4. Create PR: `gh pr create --title "..." --body "..." --base main`
5. Wait for CI checks to pass
6. Merge PR: `gh pr merge <number> --squash --delete-branch`
7. Pull latest main: `git checkout main && git pull`

### Pull Request Requirements
- Clear title with conventional commit prefix (feat:, fix:, chore:, docs:)
- Detailed description of changes
- List of files changed
- Testing notes
- CI must pass before merging
- Use squash merge to keep history clean
