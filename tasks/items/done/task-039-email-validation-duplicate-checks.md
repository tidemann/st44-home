# Task: Add Email Validation and Duplicate Member Checks

## Metadata
- **ID**: task-039
- **Feature**: feature-004 - User Invitation System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: completed
- **Priority**: medium
- **Created**: 2025-12-15
- **Completed**: 2025-12-15
- **Assigned Agent**: backend
- **Estimated Duration**: 2-3 hours
- **Actual Duration**: 0 hours (implemented in task-037)

## Description
Implement email validation and duplicate member checks to prevent inviting users who are already household members or have pending invitations.

## Requirements
- Validate email format
- Check if email already belongs to household member
- Check if pending invitation already exists for email
- Return appropriate error messages

## Acceptance Criteria
- [ ] Email format validation (regex or library)
- [ ] Query household_members by user email
- [ ] Query invitations for pending invites to same email
- [ ] Return 409 Conflict if already member
- [ ] Return 409 Conflict if pending invitation exists
- [ ] Clear error messages
- [ ] Validation integrated into POST invitation endpoint

## Dependencies
- task-037 (invitation endpoints)

## Progress Log
- [2025-12-15] Task created from feature-004 breakdown
- [2025-12-15] Task-037 implementation included all email validation logic:
  - Email format validation: Lines 74-79 in invitations.ts (regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  - Duplicate member check: Lines 91-100 (queries household_members by email)
  - Pending invitation check: Lines 103-112 (queries invitations by email + status)
  - Error responses: 409 Conflict for both cases
- [2025-12-15] Marked complete - no additional work needed
