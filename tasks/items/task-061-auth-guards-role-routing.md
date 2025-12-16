# Task: Implement Auth Guards and Role-Based Routing

## Metadata
- **ID**: task-061
- **Feature**: feature-012 - Landing Pages After Login
- **Epic**: epic-003 - User Onboarding & Experience
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-16
- **Assigned Agent**: frontend
- **Estimated Duration**: 3-4 hours

## Description
Implement Angular route guards for authentication and role-based access control. Update the routing configuration to protect landing pages and redirect users based on their authentication state and role (parent/admin vs child).

## Requirements
- AuthGuard: Redirect unauthenticated users to /login
- RoleGuard: Check user role from household membership
- Role-based routing: admin/parent → /dashboard, child → /my-tasks
- Handle users without households → /household/create
- Update app.routes.ts with protected routes
- Persist return URL for post-login redirect

## Acceptance Criteria
- [ ] AuthGuard implemented using canActivate
- [ ] RoleGuard implemented for parent/admin and child routes
- [ ] Unauthenticated users redirected to /login
- [ ] Users without households redirected to /household/create
- [ ] Parents/admins routed to /dashboard
- [ ] Children routed to /my-tasks
- [ ] Return URL preserved and used after login
- [ ] app.routes.ts updated with guard configuration
- [ ] Guards use signals-based reactive pattern
- [ ] Tests written for guards

## Dependencies
- task-059 (Dashboard API) - for determining role
- feature-001 (AuthService) ✅

## Progress Log
- [2025-12-16] Task created from feature-012 breakdown
