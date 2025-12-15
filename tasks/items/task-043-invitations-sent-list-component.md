# Task: Build Invitations Sent List Component

## Metadata
- **ID**: task-043
- **Feature**: feature-004 - User Invitation System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: medium
- **Created**: 2025-12-15
- **Assigned Agent**: frontend
- **Estimated Duration**: 3-4 hours

## Description
Build a component to display list of invitations sent from current household with status badges and cancel action.

## Requirements
- List invitations for current household
- Show email, status, sent date, expiry
- Status badges (color-coded)
- Cancel button for pending invitations
- Confirm cancellation dialog
- Refresh list after actions

## Acceptance Criteria
- [ ] InvitationsSentListComponent created
- [ ] Fetches invitations via InvitationService
- [ ] Displays invitation details in table/list
- [ ] Status badges color-coded
- [ ] Cancel button for pending only
- [ ] Confirmation dialog before cancel
- [ ] List refreshes after cancel
- [ ] WCAG AA compliant
- [ ] Integrated into household settings

## Dependencies
- task-037 (invitation API)
- task-045 (InvitationService)

## Progress Log
- [2025-12-15] Task created from feature-004 breakdown
