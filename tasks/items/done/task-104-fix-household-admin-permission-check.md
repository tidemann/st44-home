# Task: Fix Household Admin Permission Check Bug

## Metadata
- **ID**: task-104
- **Feature**: feature-012 - Landing Pages After Login
- **Epic**: epic-003 - User Onboarding
- **Status**: in-progress
- **Priority**: high
- **Created**: 2025-12-22
- **Started**: 2025-12-22
- **Assigned Agent**: orchestrator
- **Estimated Duration**: 3-5 hours

## Description
Users who are household admins are incorrectly being blocked from editing household settings. When navigating to the household settings page, the application displays the message "Only household admins can edit household details." even when the current user is the household admin.

This is a critical bug that prevents household admins from performing their administrative duties, including editing household information, managing members, and configuring settings. The permission check logic is failing to correctly identify users as admins.

## Requirements
- Requirement 1: Correctly identify when the current user is a household admin
- Requirement 2: Allow household admins to access and edit household settings
- Requirement 3: Only show the restriction message to non-admin household members
- Requirement 4: Ensure permission check works consistently across all household admin features

## Acceptance Criteria
- [ ] Household admins can access household settings without seeing the restriction message
- [ ] Household admins can edit household details (name, settings, etc.)
- [ ] Non-admin members still see the appropriate restriction message
- [ ] Permission check logic correctly evaluates admin status from user session/context
- [ ] Permission check works on page load and after navigation
- [ ] Console shows no errors related to permission checking
- [ ] All existing household admin features remain functional
- [ ] All tests pass
- [ ] Code follows project standards (linting, formatting)
- [ ] Accessibility requirements met (WCAG AA, AXE checks pass)

## Dependencies
- None - This is a standalone bug fix

## Technical Notes
**Areas to investigate:**
- Check household settings component permission logic
- Verify how admin status is determined (user roles, household membership data)
- Review household membership API response structure
- Check if user context/session includes household admin information
- Verify household data loading and state management
- Check for timing issues (permission check before data loads)

**Likely causes:**
- Permission check comparing wrong values or using incorrect property names
- Admin status not included in API response or user session
- Race condition where permission is checked before household data loads
- Incorrect role/permission mapping logic
- Frontend state not updated after household data is fetched

**Existing patterns to follow:**
- Use Angular signals for state management
- Use computed signals for derived permission state
- Follow existing permission check patterns in the codebase
- Use proper TypeScript interfaces for household and membership data

**Data structure to verify:**
- User object structure and admin flag location
- Household membership structure and role field
- Session/authentication data structure

**Security considerations:**
- Ensure permission checks also exist on backend (defense in depth)
- Verify that permission checks cannot be bypassed by manipulating frontend state

## Affected Areas
- [x] Frontend (Angular)
- [x] Backend (Fastify/Node.js) - May need to verify API response includes admin status
- [ ] Database (PostgreSQL)
- [ ] Infrastructure (Docker/Nginx)
- [ ] CI/CD
- [ ] Documentation

## Implementation Plan
[To be filled by Orchestrator Agent]

### Research Phase
- [ ] Locate household settings component with permission check
- [ ] Identify where admin status is determined
- [ ] Review household membership API endpoint and response structure
- [ ] Check user session/context data structure
- [ ] Trace data flow from API to permission check
- [ ] Review similar permission checks in other components

### Design Phase
- [ ] Identify root cause of incorrect permission check
- [ ] Determine correct property path for admin status
- [ ] Design fix for permission check logic
- [ ] Verify backend API includes necessary admin information

### Implementation Steps
1. Fix permission check logic to correctly identify admins
2. Ensure household data is loaded before permission check
3. Add proper error handling for missing data
4. Update TypeScript interfaces if needed
5. Add defensive checks for edge cases
6. Test with admin and non-admin users
7. Verify across different households

### Testing Strategy
- Unit tests for permission check logic
- Unit tests for admin status determination
- Integration tests for household data loading
- E2E tests for admin user accessing settings
- E2E tests for non-admin user seeing restriction
- Manual testing with multiple user roles
- Cross-browser testing

## Agent Assignments
[To be filled by Orchestrator Agent]

## Progress Log
- [2025-12-22] Task created by Planner Agent - Bug reported by user

## Testing Results
[To be filled during testing phase]

## Review Notes
[To be filled during review phase]

## Related PRs
[To be added when PR is created]

## Lessons Learned
[To be filled after completion]
