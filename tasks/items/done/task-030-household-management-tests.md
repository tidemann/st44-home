# Task: Write Household Management Tests

## Metadata
- **ID**: task-030
- **Feature**: feature-003 - Household Management
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: medium (downgraded from high)
- **Created**: 2025-12-14
- **Started**: 2025-12-15
- **Blocked**: 2025-12-15 - Server architecture issue discovered
- **Unblocked**: 2025-12-15 - Server refactored, blocker resolved
- **Assigned Agent**: testing
- **Estimated Duration**: 6-8 hours

## Description
Write comprehensive tests for all household management functionality including backend API endpoints, frontend services, and E2E user flows. This ensures household management features work correctly and prevents regressions.

## Requirements

### Backend Integration Tests
- Test household CRUD API endpoints (create, list, get, update)
- Test children CRUD API endpoints (create, list, update, delete)
- Test household membership validation middleware
- Test authorization (admin vs parent roles)
- Test data isolation between households
- Test error handling and validation

### Frontend Unit Tests
- Test HouseholdService methods
- Test ChildrenService methods
- Test component logic (if complex enough to warrant unit tests)

### E2E Tests
- Test household creation flow
- Test household switcher functionality
- Test household settings page
- Test children management CRUD operations
- Test state persistence across page refreshes
- Test multi-household scenarios

### Security Tests
- Verify users cannot access other households' data
- Verify role-based authorization works correctly
- Verify household context is properly enforced

## Acceptance Criteria
- [ ] Backend integration tests for household endpoints
- [ ] Backend integration tests for children endpoints
- [ ] Backend tests for middleware (membership validation, roles)
- [ ] Frontend unit tests for HouseholdService
- [ ] Frontend unit tests for ChildrenService
- [ ] E2E test: household creation
- [ ] E2E test: household switching
- [ ] E2E test: household settings
- [ ] E2E test: children CRUD operations
- [ ] Security test: data isolation between households
- [ ] All tests passing
- [ ] Code coverage adequate (>80% for services)
- [ ] Tests integrated into CI/CD

## Dependencies
- task-021, task-022, task-023, task-024

## Progress Log
- [2025-12-14 16:45] Task created from feature-003 breakdown
- [2025-12-15] Started implementation - discovered server architecture blocker
- [2025-12-15] **BLOCKED**: Server.ts needs refactoring for test isolation
  - Issue: Auth routes registered on module-level fastify instance
  - Issue: buildApp() doesn't include auth routes (only households/children)
  - Issue: Module imports trigger server startup causing port conflicts
  - Partial fix: Added check so server only starts when run directly
  - Impact: Cannot write proper integration tests until refactoring complete
- [2025-12-15] **BLOCKER RESOLVED**: Server.ts refactored successfully
  - Fixed: All auth routes moved into buildApp() via plugin pattern
  - Fixed: build() now returns complete app with ALL routes
  - Verified: All 30 auth tests passing (no 404s, no hanging)
  - Status: Task-030 can now proceed with household/children tests
  - Decision: Defer comprehensive testing to prioritize Feature-006 (E2E Testing)
  
## Blocker Details

### Current Architecture Problem
The [`apps/backend/src/server.ts`](apps/backend/src/server.ts) file has a design issue that prevents proper test isolation:

1. **Module-level fastify instance**: All auth routes are registered on a fastify instance created at module level
2. **Incomplete buildApp()**: The `buildApp()` function only registers household/children routes, not auth routes
3. **Test isolation impossible**: When tests import from server.ts, they can't get a complete app instance

### What Was Attempted
- Created integration tests for household/children endpoints  
- Tests hung because server tried to start on port 3000
- Applied partial fix: server now only starts when run directly (using import.meta.url check)
- Discovered that build() function returns incomplete app (missing auth routes)
- Determined comprehensive testing blocked until refactoring complete

### Required Refactoring
To unblock testing, need to:
1. Extract auth routes into separate route module (like households/children)
2. Refactor buildApp() to register ALL routes (auth, households, children)
3. Ensure build() export returns fully configured app for testing
4. Keep module-level server startup only for direct execution

**Estimated refactoring effort**: 4-6 hours

### Recommendation
- Mark Feature-003 as complete without comprehensive tests (functional tests exist)
- Create new epic/feature for "Backend Architecture Improvements"
- Include server refactoring + comprehensive test suite in that feature
- Prioritize after completing Feature-004 (User Invitations)
