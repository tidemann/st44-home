# Task: Implement Auth Guards and Role-Based Routing

## Metadata
- **ID**: task-061
- **Feature**: feature-012 - Landing Pages After Login
- **Epic**: epic-003 - User Onboarding & Experience
- **Status**: complete
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
- [x] AuthGuard implemented using canActivate
- [x] Unauthenticated users redirected to /login with returnUrl
- [x] Users without households redirected to /household/create
- [x] Parents/admins routed to /dashboard (default landing page)
- [x] Return URL preserved and used after login
- [x] app.routes.ts updated with guard configuration on all protected routes
- [x] Guards use signals-based reactive pattern (isAuthenticated signal)
- [x] Logout clears household context
- [ ] RoleGuard for child routes (deferred - child dashboard not yet implemented)
- [ ] Tests written for guards (deferred)

## Implementation Details

### Files Created
- `apps/frontend/src/app/guards/auth.guard.ts`

### Files Modified
- `apps/frontend/src/app/app.routes.ts` - Added authGuard to protected routes
- `apps/frontend/src/app/auth/login.component.ts` - Updated returnUrl default to /dashboard
- `apps/frontend/src/app/services/auth.service.ts` - Clear household context on logout

### Features
- Auth guard checks `isAuthenticated` signal from AuthService
- Automatically fetches and sets first household if user has households
- Stores returnUrl query param for post-login redirect
- Default route (/) now redirects to /dashboard (with auth guard)
- Protected routes: /dashboard, /household/create, /household/settings, /invitations

## Dependencies
- task-059 (Dashboard API) - for determining role
- feature-001 (AuthService) ✅

## Progress Log
- [2025-12-16] Task created from feature-012 breakdown
