# Task: Write Invitation System Tests

## Metadata
- **ID**: task-046
- **Feature**: feature-004 - User Invitation System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Assigned Agent**: testing
- **Estimated Duration**: 6-8 hours

## Description
Write comprehensive tests for the invitation system including backend integration tests, frontend unit tests, and E2E tests for the complete invitation flow.

## Requirements

### Backend Integration Tests
- POST /api/households/:id/invitations
- GET /api/households/:id/invitations
- DELETE /api/households/:id/invitations/:id
- GET /api/users/me/invitations
- POST /api/invitations/:token/accept
- POST /api/invitations/:token/decline
- Authorization tests
- Validation tests
- Expiration tests

### Frontend Unit Tests
- InvitationService methods
- Component logic

### E2E Tests
- Send invitation flow
- Accept invitation flow
- Decline invitation flow
- Cancel invitation flow

## Acceptance Criteria
- [ ] Backend: Invitation CRUD endpoint tests
- [ ] Backend: Authorization tests (admin/parent only)
- [ ] Backend: Validation tests (duplicate, invalid email)
- [ ] Backend: Expiration tests
- [ ] Backend: Accept invitation transaction tests
- [ ] Frontend: InvitationService unit tests
- [ ] Frontend: Component unit tests
- [ ] E2E: Send invitation complete flow
- [ ] E2E: Accept invitation complete flow
- [ ] E2E: Decline invitation flow
- [ ] Security: Cannot accept others' invitations
- [ ] Security: Cannot accept expired invitations
- [ ] All tests passing
- [ ] >80% code coverage

## Dependencies
- task-036 through task-045 (all implementation tasks)

## Progress Log
- [2025-12-15] Task created from feature-004 breakdown
