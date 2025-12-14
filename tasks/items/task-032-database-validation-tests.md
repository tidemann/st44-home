# Task: Database Validation E2E Tests

## Metadata
- **ID**: task-032
- **Feature**: feature-006
- **Epic**: epic-006
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-14
- **Assigned Agent**: testing + database
- **Estimated Duration**: 3-4 hours

## Description
Implement E2E tests that validate database schema, migrations, and health endpoints. Ensures database is properly configured before application runs.

## Requirements
- Test health check endpoints
- Verify critical tables exist
- Validate migration status
- Test database connectivity

## Acceptance Criteria
- [ ] Test: /health endpoint returns 200
- [ ] Test: /health/database returns healthy status
- [ ] Test: all 8 migrations applied
- [ ] Test: all critical tables exist
- [ ] Test: schema_migrations table correct
- [ ] Test: database response time < 100ms

## Dependencies
- task-028 (test database)
- task-029 (test utilities)

## Progress Log
- [2025-12-14] Task created