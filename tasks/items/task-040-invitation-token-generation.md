# Task: Implement Invitation Token Generation

## Metadata
- **ID**: task-040
- **Feature**: feature-004 - User Invitation System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: medium
- **Created**: 2025-12-15
- **Assigned Agent**: backend
- **Estimated Duration**: 1-2 hours

## Description
Implement secure random token generation for invitation links using crypto.randomBytes. Ensure tokens are unique and sufficiently random.

## Requirements
- Use crypto.randomBytes(32) for token generation
- Convert to hex string (64 characters)
- Ensure uniqueness in database
- Handle collision (retry if duplicate)

## Acceptance Criteria
- [ ] generateInvitationToken() function created
- [ ] Uses crypto.randomBytes(32).toString('hex')
- [ ] Returns 64-character hex string
- [ ] Integrated into POST invitation endpoint
- [ ] Handles unlikely token collisions

## Dependencies
- task-037 (invitation endpoints)

## Progress Log
- [2025-12-15] Task created from feature-004 breakdown
