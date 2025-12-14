# Task: Set Up Test Database and Migration Runner

## Metadata
- **ID**: task-028
- **Feature**: feature-006 - E2E Testing Infrastructure
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-14
- **Assigned Agent**: database + testing
- **Estimated Duration**: 4-6 hours

## Description
Create isolated PostgreSQL test database using Docker Compose for E2E tests. Configure database on separate port (5433) to avoid conflicts with development database. Set up migration runner script that can apply migrations to test database before tests run.

## Requirements
- Docker Compose config for test database (port 5433)
- Environment variables for test database connection
- Script to run migrations against test database
- Database health check before running tests
- Utility to reset test database between test runs
- Documentation for database setup

## Acceptance Criteria
- [ ] `docker-compose.e2e.yml` created for test database
- [ ] Test database runs on port 5433
- [ ] Database credentials: postgres/testpassword
- [ ] Database name: st44_test
- [ ] Health check configured (pg_isready)
- [ ] Migration script can target test database
- [ ] Reset database utility created (`resetTestDatabase()`)
- [ ] Test database starts before E2E tests
- [ ] All 8 migrations applied successfully to test DB
- [ ] Documentation added for test database setup

## Dependencies
- task-027 (Playwright setup must be complete)
- Existing migrations in `docker/postgres/migrations/`

## Implementation Plan
1. Create `apps/frontend/docker-compose.e2e.yml`
2. Configure PostgreSQL 17 on port 5433
3. Create test database initialization script
4. Update migration runner to support test database
5. Create database reset utility in `e2e/helpers/database.ts`
6. Test database setup and migration application
7. Document setup process

## Progress Log
- [2025-12-14] Task created by Orchestrator Agent
