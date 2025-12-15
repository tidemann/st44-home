# Task: Build Invite User Component (Frontend)

## Metadata
- **ID**: task-042
- **Feature**: feature-004 - User Invitation System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Assigned Agent**: frontend
- **Estimated Duration**: 3-4 hours

## Description
Build a frontend component for inviting users to a household by email. Includes form validation, role selection, success/error handling.

## Requirements
- Email input with validation
- Optional role selector (admin/parent)
- Submit invitation
- Success message with invitation link
- Error handling (duplicate member, invalid email)
- WCAG AA compliant

## Acceptance Criteria
- [ ] InviteUserComponent created
- [ ] Reactive form with email input
- [ ] Email validation (format, required)
- [ ] Role selector (optional)
- [ ] Submit calls InvitationService
- [ ] Success message shows invitation link
- [ ] Error messages displayed
- [ ] WCAG AA compliant
- [ ] Integrated into household settings page

## Dependencies
- task-037 (invitation API endpoints)
- task-045 (InvitationService)

## Progress Log
- [2025-12-15] Task created from feature-004 breakdown
