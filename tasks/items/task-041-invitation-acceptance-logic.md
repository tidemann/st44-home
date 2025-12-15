# Task: Implement Invitation Acceptance Logic

## Metadata
- **ID**: task-041
- **Feature**: feature-004 - User Invitation System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Assigned Agent**: backend
- **Estimated Duration**: 3-4 hours

## Description
Implement the complex logic for accepting invitations including validation, transaction handling, and updating both invitations and household_members tables.

## Requirements
- Find invitation by token
- Validate invitation not expired
- Validate invitation status is pending
- Check user not already member
- Begin transaction
- Insert household_members record
- Update invitation (status='accepted', accepted_at=NOW())
- Commit transaction
- Return household details

## Acceptance Criteria
- [ ] Token validation logic implemented
- [ ] Expiration check (expires_at > NOW())
- [ ] Status check (status = 'pending')
- [ ] Duplicate member check before insert
- [ ] Transaction wraps member insert + invitation update
- [ ] Proper error handling and rollback
- [ ] Returns household info on success
- [ ] 400/404 errors for invalid/expired tokens

## Dependencies
- task-036 (invitations table)
- task-037 (invitation endpoints)

## Progress Log
- [2025-12-15] Task created from feature-004 breakdown
