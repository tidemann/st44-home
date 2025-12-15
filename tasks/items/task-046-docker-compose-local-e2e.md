# Task: Create Docker Compose for Local E2E Testing

## Metadata
- **ID**: task-046
- **Feature**: feature-010 - Local E2E Test Execution Environment
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Assigned Agent**: devops
- **Estimated Duration**: 3-4 hours

## Description
Create a Docker Compose configuration specifically for local E2E test execution. This setup should be separate from the production docker-compose.yml and use different ports to avoid conflicts. It should include PostgreSQL test database, backend server, and frontend server, all configured for the E2E testing environment with appropriate environment variables and networking.

## Requirements
- Create `docker-compose.e2e-local.yml` in project root
- PostgreSQL 17 test database on port 5433 (avoid conflict with dev DB on 5432)
- Backend server configured for test environment
- Frontend server configured for test environment
- All services in same Docker network for communication
- Environment file `.env.e2e-local` for local test configuration
- Services can be started/stopped independently using profiles
- Test database initializes with schema from `docker/postgres/init.sql`

## Acceptance Criteria
- [ ] `docker-compose.e2e-local.yml` created with all required services
- [ ] PostgreSQL test database runs on port 5433 with test database name `st44_test_local`
- [ ] Backend service configured with test environment variables
- [ ] Frontend service configured to proxy API calls to backend
- [ ] All services can communicate via Docker network
- [ ] `.env.e2e-local` file with documented environment variables
- [ ] Services start cleanly with `docker-compose -f docker-compose.e2e-local.yml up`
- [ ] Services stop cleanly with down command
- [ ] Database schema initializes on first startup
- [ ] README section added explaining usage

## Dependencies
- Docker Desktop installed
- `docker/postgres/init.sql` schema file exists ✅
- Backend Dockerfile exists ✅
- Frontend can be run via npm start ✅

## Technical Notes

### Port Allocation
- PostgreSQL: 5433 (avoid 5432 used by dev DB)
- Backend: 3001 (avoid 3000 used by dev backend)
- Frontend: 4201 (avoid 4200 used by dev frontend)

### Service Configuration

**PostgreSQL Service:**
```yaml
postgres-test:
  image: postgres:17-alpine
  container_name: st44-postgres-test
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    POSTGRES_DB: st44_test_local
  ports:
    - "5433:5432"
  volumes:
    - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 5s
    timeout: 5s
    retries: 5
```

**Backend Service:**
- Build from `apps/backend/Dockerfile`
- Depends on postgres-test
- Environment variables from `.env.e2e-local`
- Port 3001:3000

**Frontend Service:**
- Use node:24 image with npm start
- Mount local source for live reload
- Depends on backend
- Port 4201:4200
- Configure proxy to backend at 3001

### Environment Variables (.env.e2e-local)
```
# Database
DB_HOST=postgres-test
DB_PORT=5432
DB_NAME=st44_test_local
DB_USER=postgres
DB_PASSWORD=postgres

# Backend
PORT=3000
HOST=0.0.0.0
NODE_ENV=test

# Frontend
CI=false
```

## Affected Areas
- [x] Infrastructure (Docker Compose)
- [ ] Frontend (configuration)
- [ ] Backend (configuration)
- [x] Database (PostgreSQL)
- [ ] CI/CD
- [x] Documentation

## Implementation Steps

1. **Create docker-compose.e2e-local.yml**
   - Define services: postgres-test, backend-test, frontend-test
   - Configure networks for service communication
   - Set up health checks for each service
   - Configure volumes for database initialization

2. **Create .env.e2e-local**
   - Document all environment variables
   - Set test-specific values
   - Add comments explaining each variable

3. **Configure PostgreSQL Service**
   - Use postgres:17-alpine image
   - Map to port 5433
   - Mount init.sql for schema setup
   - Configure health check

4. **Configure Backend Service**
   - Build from existing Dockerfile
   - Set test environment variables
   - Depend on postgres-test with condition: service_healthy
   - Expose port 3001

5. **Configure Frontend Service**
   - Use node:24 image
   - Mount source directory for live reload
   - Install dependencies and run npm start
   - Configure proxy to backend
   - Depend on backend-test

6. **Add Documentation**
   - Create README section explaining usage
   - Document how to start/stop services
   - Document port mappings
   - Add troubleshooting tips

7. **Test Setup**
   - Verify services start correctly
   - Verify database initializes with schema
   - Verify frontend can reach backend
   - Verify backend can reach database
   - Verify services stop cleanly

## Progress Log
- [2025-12-15 14:50] Task created by Planner Agent

## Testing Strategy
- Manual testing: Start services and verify connectivity
- Check database tables exist after startup
- Test API calls from frontend to backend
- Verify clean startup and shutdown
- Test with fresh Docker environment (no cached volumes)

## Related PRs
- TBD

## Lessons Learned
[To be filled after completion]
