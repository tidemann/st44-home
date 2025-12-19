# Feature: User Invitation System

## Metadata
- **ID**: feature-004
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: complete
- **Priority**: high
- **Created**: 2025-12-13
- **Broken Down**: 2025-12-15
- **Estimated Duration**: 2-3 days (5-7 days actual based on tasks)

## Description
Enable household admins and parents to invite other users to join their household. Users can invite via email, manage pending invitations, and invited users can accept or decline invitations. This enables multi-parent households and allows separated parents to share household management.

## User Stories
- **As a** household admin, **I want** to invite my partner by email, **so that** they can help manage the household
- **As an** invited user, **I want** to receive an email invitation, **so that** I know I've been added
- **As an** invited user, **I want** to accept or decline the invitation, **so that** I can control my household memberships
- **As a** household admin, **I want** to see pending invitations, **so that** I can track who I've invited
- **As a** household admin, **I want** to cancel a pending invitation, **so that** I can revoke access before acceptance
- **As an** existing user, **I want** to see invitations waiting for me, **so that** I can join new households

## Requirements

### Functional Requirements
- Send invitation to email address
- Create invitation record with token and expiry (7 days)
- Send email with invitation link (future: email service)
- For MVP: Store invitation, show in UI, skip actual email
- List pending invitations (sent)
- List received invitations (inbox)
- Accept invitation (adds user to household)
- Decline invitation (marks as declined)
- Cancel invitation (admin only, before acceptance)
- Invitation expires after 7 days
- Cannot invite existing household member
- Validate inviter has permission (admin or parent role)

### Non-Functional Requirements
- **Security**: Invitations use secure random tokens
- **Security**: Tokens expire after 7 days
- **Security**: Cannot accept expired invitation
- **Performance**: Invitation operations < 200ms
- **Accessibility**: WCAG AA compliant invitation UI
- **Email**: Placeholder for future email service integration

## Acceptance Criteria
- [ ] Admin/parent can invite user by email
- [ ] Invitation creates record with unique token
- [ ] Token expires after 7 days
- [ ] Cannot invite existing member (validation)
- [ ] Only admin/parent can invite (authorization)
- [ ] User can view invitations sent by them
- [ ] User can view invitations received
- [ ] User can accept invitation
- [ ] Accepting adds user to household with 'parent' role
- [ ] User can decline invitation
- [ ] Admin can cancel pending invitation
- [ ] Cannot accept expired invitation
- [ ] Proper error messages for all validation failures
- [ ] All tests passing
- [ ] Documentation updated

## Tasks

### Backend Tasks (6 tasks, 12-17 hours)
- [x] [task-036](../items/done/task-036-create-invitations-table-schema.md): Create invitations table schema (3-4h) **COMPLETED** (0.5h actual)
- [x] [task-037](../items/done/task-037-invitation-crud-api-endpoints.md): Implement invitation CRUD API endpoints (5-6h) **COMPLETED** (0.5h actual)
- [x] [task-038](../items/done/task-038-invitation-authorization-middleware.md): Implement invitation authorization middleware (2-3h) **COMPLETED**
- [x] [task-039](../items/done/task-039-email-validation-duplicate-checks.md): Add email validation and duplicate checks (2-3h) **COMPLETED** (implemented in task-037)
- [x] [task-040](../items/done/task-040-invitation-token-generation.md): Implement invitation token generation (1-2h) **COMPLETED** (implemented in task-037)
- [x] [task-041](../items/done/task-041-invitation-acceptance-logic.md): Implement invitation acceptance logic (3-4h) **COMPLETED** (implemented in task-037)

### Frontend Tasks (4 tasks, 13-17 hours)
- [x] task-042: Build invite user component (3-4h) **COMPLETED** (invite-user component exists)
- [x] [task-043](../items/done/task-043-invitations-sent-list-component.md): Build invitations sent list component (3-4h) **COMPLETED**
- [x] [task-044](../items/done/task-044-invitation-inbox-component.md): Build invitation inbox component (4-5h) **COMPLETED** [PR #86]
- [x] [task-045](../items/done/task-045-invitation-service-frontend.md): Create invitation service (frontend) (3-4h) **COMPLETED**

### Testing Tasks (1 task, 6-8 hours)
- [x] [task-046](../items/done/task-046-invitation-system-tests.md): Write invitation system tests (6-8h) **COMPLETED** [PR #88]

**Total**: 11 tasks, 31-42 hours (4-6 days after consolidation)
**Critical Path**: task-036 → task-037 → (038?) → task-045 → task-044
**Progress**: 11/11 tasks complete (100%) ✅

## Dependencies
- feature-001: User authentication must be complete
- feature-002: Database schema must be in place
- feature-003: Household management must be complete

## Technical Notes

### Database Schema

**invitations table**
```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id),
  invited_email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'parent',
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted, declined, cancelled, expired
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_invitations_household (household_id),
  INDEX idx_invitations_email (invited_email),
  INDEX idx_invitations_token (token),
  INDEX idx_invitations_status (status)
);
```

### API Endpoints

**Invitation Management**
- `POST /api/households/:householdId/invitations` - Send invitation
  - Body: `{ email, role? }`
  - Validates: Email format, not already member, inviter has permission
  - Response: `{ id, email, token, expiresAt }`
  
- `GET /api/households/:householdId/invitations` - List sent invitations
  - Query: `?status=pending|accepted|declined|cancelled`
  - Response: `{ invitations: [{ id, email, status, createdAt, expiresAt }] }`
  
- `DELETE /api/households/:householdId/invitations/:id` - Cancel invitation
  - Admin only
  - Response: `{ success: true }`

**User Invitations (Inbox)**
- `GET /api/users/me/invitations` - List invitations for current user
  - Response: `{ invitations: [{ id, householdName, invitedBy, status, expiresAt }] }`
  
- `POST /api/invitations/:token/accept` - Accept invitation
  - Validates: Token valid, not expired, user not already member
  - Creates household_members record
  - Marks invitation as accepted
  - Response: `{ household: { id, name, role } }`
  
- `POST /api/invitations/:token/decline` - Decline invitation
  - Response: `{ success: true }`

### Frontend Components
- `InviteUserComponent` - Form to invite by email
- `InvitationsSentListComponent` - List of sent invitations with cancel action
- `InvitationsInboxComponent` - List of received invitations
- `InvitationCardComponent` - Individual invitation with accept/decline
- `InvitationService` - API calls for invitation management

### Business Logic

**Token Generation**
- Use crypto.randomBytes(32).toString('hex')
- Store hashed version in database
- Include token in invitation link

**Invitation Link**
- Format: `https://app.diddit.com/invite/{token}`
- Token used to accept/decline

**Email Template (Future)**
```
Subject: You're invited to join {household_name} on Diddit!

Hi,

{inviter_name} has invited you to join their household "{household_name}" on Diddit.

Diddit helps families manage household chores with automatic task assignment and reminders.

[Accept Invitation] [Decline]

This invitation expires on {expires_at}.

If you don't have a Diddit account yet, you'll be prompted to create one.
```

**Expiration Handling**
- Cron job or on-access check
- Mark invitations with `expires_at < NOW()` as expired
- Cannot accept expired invitations

## UI/UX Considerations

**Invite User (Admin/Parent)**
- Button: "Invite Someone" on household settings page
- Modal form with email input
- Optional: Role selector (admin/parent)
- Success message: "Invitation sent to {email}"
- Error handling: "User is already a member"

**Sent Invitations List**
- Table/list on household settings page
- Columns: Email, Status, Sent Date, Expires, Actions
- Status badges: Pending (yellow), Accepted (green), Declined (gray), Cancelled (red)
- Cancel button for pending invitations

**Invitations Inbox**
- Notification badge in header when pending invitations
- Dedicated "Invitations" page or modal
- Each invitation shows:
  - Household name
  - Who invited you
  - When it expires
  - Accept/Decline buttons
- Accept creates new household membership
- Decline removes from inbox

**Accept Flow**
1. User clicks invitation link or accept button
2. If not logged in: Redirect to login/register
3. After login: Show invitation details
4. Confirm: "Join {household_name}?"
5. Accept: Add to household, redirect to household
6. Success message: "You've joined {household_name}!"

## Implementation Plan
[To be filled by Orchestrator Agent after task breakdown]

## Progress Log
- [2025-12-13 21:30] Feature created for Epic-001
- [2025-12-15] Feature broken down into 11 tasks (036-046)
- [2025-12-15] Status updated to ready-for-implementation
- [2025-12-15] Tasks organized: 6 backend + 4 frontend + 1 testing
- [2025-12-15] Estimated duration updated based on task breakdown (37-49 hours)
- [2025-12-15] task-036 complete: Invitations table schema (PR #65, 0.5h)
- [2025-12-15] task-037 complete: Invitation CRUD API endpoints (PR #66, 0.5h)
- [2025-12-15] tasks 039-041 marked complete: Logic already implemented in task-037
- [2025-12-15] Progress: 5/11 tasks complete (45%), backend nearly done except authorization middleware

## Testing Strategy
- [ ] Unit tests for invitation service
- [ ] Unit tests for token generation
- [ ] Integration tests for invitation endpoints
- [ ] Integration tests for acceptance flow
- [ ] E2E tests for invite user flow
- [ ] E2E tests for accept invitation flow
- [ ] E2E tests for decline invitation flow
- [ ] Security tests (cannot accept others' invitations)
- [ ] Security tests (token validation)
- [ ] Security tests (expiration enforcement)
- [ ] Validation tests (duplicate member, invalid email)

## Related PRs
[To be added when tasks are implemented]

## Demo/Screenshots
[To be added when feature is complete]

## Notes
- Email sending is out of scope for MVP
- For MVP, users must manually share invitation link or find it in their inbox
- Future: Integrate SendGrid, AWS SES, or similar email service
- Future: Email templates with branding
- Future: Reminder emails for pending invitations

## Lessons Learned
[To be filled after completion]
