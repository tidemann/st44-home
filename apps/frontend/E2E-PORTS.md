# E2E Testing Port Configuration

## Port Strategy Overview

Different environments use different ports to avoid conflicts and match their infrastructure setup.

## Environment Configurations

### 1. Local Development (Docker Compose)
**Used for**: Local E2E testing with `npm run test:e2e:full`

- **Frontend**: `4201` (maps to container 4200)
- **Backend**: `3001` (maps to container 3000)
- **Database**: `5433` (maps to container 5432)
- **Database Name**: `st44_test_local`
- **Docker Compose**: `docker-compose.e2e-local.yml`

**Usage**:
```bash
npm run test:e2e:full     # Start services, run tests, stop services
npm run test:e2e:local    # Run tests only (services must be running)
npm run test:e2e:ui       # Run tests in UI mode (services must be running)
```

### 2. GitHub Actions CI
**Used for**: Automated E2E testing in CI/CD pipeline

- **Frontend**: `4200` (direct, no container)
- **Backend**: `3000` (direct, no container)
- **Database**: `55432` (GitHub service container)
- **Database Name**: `st44_test`
- **Workflow**: `.github/workflows/e2e.yml`

**Environment Variables Set in Workflow**:
```yaml
FRONTEND_PORT: 4200
FRONTEND_HOST: localhost
BACKEND_PORT: 3000
BACKEND_HOST: localhost
DB_HOST: localhost
DB_PORT: 55432
DB_NAME: st44_test
USE_DOCKER_COMPOSE: false
```

### 3. Production
**Used for**: Actual deployed application

- **Frontend**: `8080` (via Nginx)
- **Backend**: `3000` (internal container)
- **Database**: `5432` (internal container)
- **Database Name**: `st44`
- **Docker Compose**: `docker-compose.yml`

## NPM Scripts

### Core E2E Commands

- `npm run test:e2e` - Run tests using environment variables (for CI)
- `npm run test:e2e:local` - Run tests with local docker ports
- `npm run test:e2e:full` - Complete local workflow (start → test → stop)

### Local Docker Management

- `npm run test:e2e:start` - Start local E2E docker services
- `npm run test:e2e:stop` - Stop local E2E docker services
- `npm run test:e2e:restart` - Restart services
- `npm run test:e2e:wait` - Wait for services to be ready
- `npm run test:e2e:logs` - View service logs
- `npm run test:e2e:reset` - Reset test database

### Debug Commands

- `npm run test:e2e:headed` - Run with browser visible (local ports)
- `npm run test:e2e:debug` - Run in debug mode (local ports)
- `npm run test:e2e:ui` - Run in Playwright UI mode (local ports)
- `npm run test:e2e:report` - View HTML test report

## How It Works

### playwright.config.ts
Sets default values that can be overridden by environment variables:
```typescript
const frontendPort = process.env.FRONTEND_PORT || '4201';
const backendPort = process.env.BACKEND_PORT || '3001';
const dbPort = process.env.DB_PORT || '5433';
```

### test-helpers.ts
Uses environment variables with sensible defaults:
```typescript
const apiPort = process.env.BACKEND_PORT || '3001';
const dbPort = parseInt(process.env.DB_PORT || '5433');
```

### NPM Scripts
- `test:e2e` - No env vars, respects existing environment (for CI)
- `test:e2e:local` - Sets local docker ports explicitly
- `test:e2e:full` - Orchestrates full local workflow

## Troubleshooting

### Tests Fail Locally
1. Ensure services are running: `npm run test:e2e:start`
2. Check services are healthy: `npm run test:e2e:logs`
3. Reset database if needed: `npm run test:e2e:reset`
4. Run tests: `npm run test:e2e:local`

### Tests Fail in CI
1. Check GitHub Actions workflow sets correct env vars
2. Verify backend/frontend are started successfully
3. Check health check steps pass
4. Review full workflow logs in GitHub Actions UI

### Port Conflicts
- **Local**: Change ports in `docker-compose.e2e-local.yml`
- **CI**: Update workflow `.github/workflows/e2e.yml`
- **Tests**: Environment variables automatically adapt

## Quick Reference

| Environment | Frontend | Backend | Database | DB Name |
|------------|----------|---------|----------|---------|
| Local Docker | 4201 | 3001 | 5433 | st44_test_local |
| GitHub CI | 4200 | 3000 | 55432 | st44_test |
| Production | 8080 | 3000 | 5432 | st44 |

## Best Practices

1. **Never hardcode ports in test files** - Use environment variables
2. **Use npm scripts** - Don't run playwright directly (use `test:e2e:*` scripts)
3. **Local development** - Always use `test:e2e:full` for complete workflow
4. **CI configuration** - Set all env vars explicitly in workflow file
5. **Debugging** - Use `test:e2e:ui` or `test:e2e:headed` for visual debugging
