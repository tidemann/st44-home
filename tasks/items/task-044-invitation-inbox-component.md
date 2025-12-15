# Task: Build Invitation Inbox Component

## Metadata
- **ID**: task-044
- **Feature**: feature-004 - User Invitation System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Assigned Agent**: frontend
- **Estimated Duration**: 4-5 hours

## Description
Build a component to display invitations received by the current user with accept/decline actions. Shows household name, inviter, and expiry date.

## Requirements
- Fetch invitations for current user
- Display household name, inviter, sent date, expiry
- Accept/decline buttons
- Confirmation dialog for accept/decline
- Success message redirects to accepted household
- Remove from list after action

## Acceptance Criteria
- [ ] InvitationInboxComponent created
- [ ] Fetches user's invitations via InvitationService
- [ ] Displays invitation details
- [ ] Accept/decline buttons
- [ ] Confirmation dialogs
- [ ] Accept redirects to household
- [ ] Decline removes from list
- [ ] WCAG AA compliant
- [ ] Notification badge in header when pending invitations

## Dependencies
- task-037 (invitation API)
- task-045 (InvitationService)

## Progress Log
- [2025-12-15] Task created from feature-004 breakdown
