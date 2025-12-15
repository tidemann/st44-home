# Task: Create Invitation Service (Frontend)

## Metadata
- **ID**: task-045
- **Feature**: feature-004 - User Invitation System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Assigned Agent**: frontend
- **Estimated Duration**: 3-4 hours

## Description
Create a frontend service to handle all invitation-related API calls including sending invitations, listing sent/received invitations, accepting/declining, and cancelling.

## Requirements
- Injectable service with providedIn: 'root'
- Methods for all invitation API endpoints
- TypeScript interfaces for Invitation type
- Promise-based API using ApiService
- Error handling

## Acceptance Criteria
- [ ] InvitationService created in services/
- [ ] sendInvitation(householdId, email, role?) method
- [ ] listSentInvitations(householdId, status?) method
- [ ] listReceivedInvitations() method
- [ ] acceptInvitation(token) method
- [ ] declineInvitation(token) method
- [ ] cancelInvitation(householdId, invitationId) method
- [ ] Invitation interface exported
- [ ] Uses ApiService for HTTP calls
- [ ] Proper error handling

## Dependencies
- task-037 (invitation API endpoints)
- ApiService (already exists)

## Technical Notes

### Interfaces
```typescript
export interface Invitation {
  id: string;
  householdId: string;
  householdName?: string;
  invitedEmail: string;
  invitedBy: string;
  inviterName?: string;
  role: 'admin' | 'parent';
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  token?: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}
```

## Progress Log
- [2025-12-15] Task created from feature-004 breakdown
