# Task: Set up Test Database (task-028)

## Status
in-progress

## Priority
high

## Feature
feature-006-e2e-testing-infrastructure.md - Link to parent feature

## Epic
epic-006-testing-quality-assurance.md - Link to parent epic

## Description
Create a dedicated test database setup that can be started and stopped independently of the dev database. Provide commands and configuration to run migrations against the test database and reset it between test runs. This supports Playwright E2E tests and future integration tests.

## Requirements
- Provide a Docker Compose config for a `st44-db-test` PostgreSQL container
- Use the existing `docker/postgres/init.sql` for initial schema
- Add npm scripts to start/stop the test DB and run migrations
- Keep the solution isolated (does not interfere with dev DB)
- Document quick usage in this task file

## Acceptance Criteria
- [ ] `npm run db:test:up` starts a test Postgres on a different port
- [ ] `npm run db:test:down` stops and removes the test container/volume
- [ ] `npm run db:test:migrate` applies all migrations to the test DB
- [ ] E2E tests can target the test DB without affecting dev DB
- [ ] Instructions added in this file under Technical Notes

## Dependencies
- task-027 (Playwright setup)

## Technical Notes
- Compose file: `infra/docker-compose.test.yml`
- Service name: `db-test` with container name `st44-db-test`
- Port: 55432 on host → 5432 in container to avoid collision
- Database: `st44_test` with user/password `postgres`
- Migrations: reuse `docker/postgres/migrations/*.sql` when available; fallback to `init.sql`

## Implementation Plan
1. Add `infra/docker-compose.test.yml` defining `db-test` service (Postgres 17)
2. Mount `docker/postgres/init.sql` to initialize fresh DBs
3. Add root npm scripts:
   - `db:test:up` (compose up -d)
   - `db:test:down` (compose down -v)
   - `db:test:migrate` (run `psql` from container to apply migrations or `init.sql`)
4. Document quickstart in this task file
5. Verify commands locally

## Agent Assignment
DevOps | Database | Testing Agent

## Progress Log
- [2025-12-14 12:10] Task created and marked in-progress; branch `feature/task-028-test-database-setup` opened
