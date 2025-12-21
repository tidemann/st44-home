# Feature: Landing Pages After Login

## Metadata
- **ID**: feature-012
- **Epic**: epic-003 - User Onboarding & Experience
- **Status**: partially-complete
- **Priority**: high
- **Created**: 2025-12-16
- **Estimated Duration**: 3-4 days (22-31 hours)
- **Completion Note**: Parent dashboard complete (5/8 tasks), child tasks API complete (task-060), child dashboard UI remaining (task-063)

## Description
Create role-appropriate landing pages that users see after logging in. Parents see a dashboard with household overview and quick actions. Children (users with child role) see a simplified task list focused on their daily assignments. This feature establishes the core post-authentication experience and provides the foundation for more detailed dashboards in Epic-005.

## User Stories
- **As a** logged-in parent, **I want** to see a dashboard summary after login, **so that** I can quickly understand my household's task status
- **As a** parent with multiple households, **I want** to select which household to view, **so that** I can manage different families
- **As a** new user without households, **I want** to be guided to create one, **so that** I can start using the app
- **As a** logged-in child, **I want** to see my assigned tasks for today, **so that** I know what I need to do
- **As a** child, **I want** a simple interface, **so that** I'm not overwhelmed with options
- **As a** child, **I want** to see my points/progress, **so that** I feel motivated

## Requirements

### Functional Requirements
- Authenticated users routed to appropriate landing page based on role
- Unauthenticated users redirected to /login
- Users without households redirected to /household/create
- Parent dashboard shows: household name, week summary, children list, quick actions
- Child dashboard shows: greeting, today's tasks, points earned
- Household switcher accessible from parent dashboard
- Tasks can be marked complete from child dashboard
- Current household context persists across sessions

### Non-Functional Requirements
- **Performance**: Dashboard loads in < 2 seconds
- **Security**: Auth guards protect all landing pages
- **Accessibility**: WCAG AA compliant (keyboard nav, ARIA, color contrast)
- **Responsive**: Mobile-first design, works on all screen sizes
- **Browser Support**: Chrome, Firefox, Safari, Edge (last 2 versions)

## Acceptance Criteria

### Routing & Navigation
- [ ] Authenticated users are routed to appropriate landing page (not /login)
- [ ] Unauthenticated users are redirected to /login
- [ ] Users without households are redirected to /household/create
- [ ] Role-based routing: admin/parent → /dashboard, child → /my-tasks
- [ ] Auth guard protects all landing pages
- [ ] Default route (/) redirects appropriately based on auth state

### Parent Landing Page (/dashboard)
- [ ] Shows current household name in header
- [ ] Shows week summary: total tasks, completed, pending, overdue
- [ ] Shows list of children with completion percentage
- [ ] Quick action buttons: Create Task, View Settings
- [ ] Household switcher accessible from header
- [ ] Handles empty states (no tasks yet, no children yet)
- [ ] Loading state while fetching data
- [ ] Error state with retry option
- [ ] Mobile-friendly responsive design
- [ ] WCAG AA accessible

### Child Landing Page (/my-tasks)
- [ ] Shows child-friendly greeting with name
- [ ] Shows today's assigned tasks
- [ ] Each task displays: name, points, due time, status
- [ ] Can mark task as complete (button)
- [ ] Shows total points earned
- [ ] Completed tasks visually distinguished
- [ ] Simple, uncluttered interface
- [ ] Large touch targets for mobile
- [ ] WCAG AA accessible

### State Management
- [ ] Current household ID persists in localStorage
- [ ] Switching households updates all views
- [ ] Logout clears household context
- [ ] Role determined from household_members table

## Tasks
**⚠️ Feature must be broken down into tasks by Orchestrator Agent before implementation**

### Backend Tasks (2 tasks, 5-7 hours)
- [x] **task-059**: Create dashboard summary API endpoint (3-4h) **COMPLETED** [PR #90]
  - GET /api/households/:id/dashboard
  - Returns week summary, children stats, recent activity
- [x] **task-060**: Create child tasks API endpoint (2-3h) **COMPLETED** [Commit d8f8eab]
  - GET /api/children/my-tasks
  - Returns today's tasks for authenticated child user
  - Previously deferred - no longer blocked

### Frontend Tasks (5 tasks, 13-18 hours)
- [x] **task-061**: Implement auth guards and role-based routing (3-4h) **COMPLETED** [PR #93]
  - AuthGuard, RoleGuard (parent/child)
  - Update app.routes.ts with protected routes
  - Redirect logic for no-household users
- [x] **task-062**: Build parent dashboard component (4-6h) **COMPLETED** [PR #92]
  - Week summary card
  - Children list with completion bars
  - Quick action buttons
  - Empty states
- [ ] **task-063**: Build child dashboard component (3-4h) **DEFERRED** - requires 'child' role in household_members schema
  - Task list for today
  - Mark complete functionality
  - Points display
  - Child-friendly design
- [x] **task-064**: Create dashboard service (2-3h) **COMPLETED** [PR #91]
  - API calls for dashboard data
  - Caching for performance
- [ ] **task-065**: Integrate household context with dashboards (1-2h) **N/A** - Already integrated via auth guards and dashboard component
  - Connect household switcher
  - Persist selection

### Testing Tasks (1 task, 4-6 hours)
- [x] **task-066**: Write landing pages tests (4-6h) **COMPLETED** [PR #94]
  - Unit tests for guards
  - Unit tests for dashboard components
  - Integration tests for routing
  - E2E tests for login → dashboard flow

**Total**: 8 tasks, 22-31 hours (3-4 days)
**Completed**: 6/8 tasks (059, 060, 061, 062, 064, 066)
**Remaining**: 1 task (063)
**N/A**: 1 task (065) - functionality already implemented
**Critical Path**: task-059 → task-064 → task-062 → task-061 → task-060 ✅

## Dependencies
- **Required**: feature-001 (User Authentication) ✅ Complete
- **Required**: feature-002 (Multi-Tenant Schema) ✅ Complete
- **Required**: feature-003 (Household Management) - backend complete, frontend in progress
- **Beneficial**: Epic-002 (Task Management Core) - for real task data
- **Beneficial**: feature-004 (Invitations) - for invitation badge

## Technical Notes

### Database Queries

**Dashboard Summary** (for parent dashboard):
```sql
-- Week summary
SELECT 
  COUNT(*) as total_tasks,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue
FROM task_assignments
WHERE household_id = $1 
  AND due_date BETWEEN date_trunc('week', CURRENT_DATE) AND date_trunc('week', CURRENT_DATE) + INTERVAL '6 days';

-- Per-child completion
SELECT 
  c.id, c.name,
  COUNT(ta.id) as tasks_total,
  SUM(CASE WHEN ta.status = 'completed' THEN 1 ELSE 0 END) as tasks_completed
FROM children c
LEFT JOIN task_assignments ta ON ta.child_id = c.id 
  AND ta.due_date BETWEEN date_trunc('week', CURRENT_DATE) AND date_trunc('week', CURRENT_DATE) + INTERVAL '6 days'
WHERE c.household_id = $1
GROUP BY c.id, c.name
ORDER BY c.name;
```

**Child's Today Tasks**:
```sql
SELECT 
  ta.id, ta.status, ta.due_date,
  t.name, t.description, t.points
FROM task_assignments ta
JOIN tasks t ON ta.task_id = t.id
WHERE ta.child_id = $1 AND ta.due_date = CURRENT_DATE
ORDER BY ta.status, t.name;
```

### API Endpoints

**Dashboard Summary**
```
GET /api/households/:householdId/dashboard

Response:
{
  "household": { "id": "uuid", "name": "The Smith Family" },
  "weekSummary": {
    "total": 15,
    "completed": 10,
    "pending": 3,
    "overdue": 2,
    "completionRate": 67
  },
  "children": [
    { "id": "uuid", "name": "Julie", "tasksCompleted": 8, "tasksTotal": 10, "completionRate": 80 },
    { "id": "uuid", "name": "Leon", "tasksCompleted": 2, "tasksTotal": 5, "completionRate": 40 }
  ]
}
```

**Child's Tasks**
```
GET /api/households/:householdId/my-tasks?date=2025-12-16

Response:
{
  "child": { "id": "uuid", "name": "Julie" },
  "totalPoints": 120,
  "tasks": [
    { "id": "uuid", "name": "Tidy Room", "points": 10, "status": "pending", "dueTime": "17:00" },
    { "id": "uuid", "name": "Feed Cat", "points": 5, "status": "completed", "dueTime": "19:00" }
  ]
}
```

### Frontend Components

```
src/app/
├── pages/
│   ├── parent-dashboard/
│   │   ├── parent-dashboard.ts
│   │   ├── parent-dashboard.html
│   │   └── parent-dashboard.css
│   └── child-dashboard/
│       ├── child-dashboard.ts
│       ├── child-dashboard.html
│       └── child-dashboard.css
├── guards/
│   ├── auth.guard.ts
│   └── role.guard.ts
└── services/
    └── dashboard.service.ts
```

### Route Configuration

```typescript
export const routes: Routes = [
  // Public routes
  { path: 'login', loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./auth/register.component').then(m => m.RegisterComponent) },
  
  // Protected routes
  { 
    path: 'dashboard', 
    loadComponent: () => import('./pages/parent-dashboard/parent-dashboard').then(m => m.ParentDashboardComponent),
    canActivate: [authGuard, parentRoleGuard]
  },
  { 
    path: 'my-tasks', 
    loadComponent: () => import('./pages/child-dashboard/child-dashboard').then(m => m.ChildDashboardComponent),
    canActivate: [authGuard, childRoleGuard]
  },
  { 
    path: 'household/create', 
    loadComponent: () => import('./components/household-create/household-create').then(m => m.HouseholdCreateComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'household/settings', 
    loadComponent: () => import('./components/household-settings/household-settings').then(m => m.HouseholdSettingsComponent),
    canActivate: [authGuard, parentRoleGuard]
  },
  
  // Default redirect
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
];
```

### Role Determination Logic

```typescript
// In auth guard or app initialization
async function determineUserRole(userId: string, householdId: string): Promise<'admin' | 'parent' | 'child'> {
  const result = await db.query(
    'SELECT role FROM household_members WHERE user_id = $1 AND household_id = $2',
    [userId, householdId]
  );
  return result.rows[0]?.role || 'parent'; // default to parent if no role found
}

// Route based on role
if (role === 'child') {
  router.navigate(['/my-tasks']);
} else {
  router.navigate(['/dashboard']);
}
```

## UI/UX Considerations

### Parent Dashboard Layout (Mobile-First)
```
┌─────────────────────────────────┐
│ 🏠 The Smith Family      [⚙️]  │
│ ─────────────────────────────── │
│                                 │
│ 📊 This Week                    │
│ ┌─────────────────────────────┐ │
│ │ 15 Tasks  │  67% Complete   │ │
│ │ 10 ✅ 3 ⏳ 2 ⚠️            │ │
│ └─────────────────────────────┘ │
│                                 │
│ 👧 Julie         80% ████████░░ │
│ 👦 Leon          40% ████░░░░░░ │
│                                 │
│ ⚠️ Overdue Tasks                │
│ • Leon: Take out trash          │
│ • Leon: Clean bathroom          │
│                                 │
│ ─────────────────────────────── │
│ [+ Add Task]  [📋 All Tasks]    │
└─────────────────────────────────┘
```

### Child Dashboard Layout (Mobile-First)
```
┌─────────────────────────────────┐
│ 👋 Hi Julie!            ⭐ 120  │
│ ─────────────────────────────── │
│                                 │
│ Today's Tasks                   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🧹 Tidy Room         10 pts │ │
│ │ Due by 5:00 PM              │ │
│ │              [✅ Done]      │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🐱 Feed Cat          5 pts  │ │
│ │ Due by 7:00 PM              │ │
│ │              [Mark Done]    │ │
│ └─────────────────────────────┘ │
│                                 │
│ 🎉 Great job! 2 of 3 done       │
│                                 │
└─────────────────────────────────┘
```

### Empty States

**No Household**:
- Message: "Welcome to Diddit! Let's set up your household."
- CTA: [Create Household] button
- Redirect to /household/create

**No Children (Parent)**:
- Message: "Add your children to start assigning tasks"
- CTA: [Add Child] button

**No Tasks (Parent)**:
- Message: "No tasks this week. Create your first task!"
- CTA: [Create Task] button

**No Tasks (Child)**:
- Message: "🎉 All done! No tasks for today."
- Celebratory visual

### Color Coding
- Green: Completed tasks, high completion rate (70%+)
- Yellow/Orange: Pending tasks, medium completion rate (40-69%)
- Red: Overdue tasks, low completion rate (<40%)

## Implementation Plan
[To be filled by Orchestrator Agent after task breakdown]

### Phase 1: Backend (task-059, task-060)
- Create dashboard summary endpoint
- Create child tasks endpoint
- Add role to JWT token payload (if not already)

### Phase 2: Frontend Core (task-061, task-064)
- Implement auth guards
- Create dashboard service
- Set up routing

### Phase 3: UI Components (task-062, task-063, task-065)
- Build parent dashboard
- Build child dashboard
- Connect household context

### Phase 4: Testing (task-066)
- Unit tests
- Integration tests
- E2E tests

## Progress Log
- [2025-12-19] Status updated to **partially-complete** - Parent dashboard functional, child dashboard deferred
  - 5 of 8 tasks completed (059, 061, 062, 064, 066)
  - Parent dashboard live and tested
  - Child dashboard tasks (060, 063) deferred pending 'child' role in schema
  - Task 065 marked N/A - functionality already implemented
- [2025-12-16] Feature created based on planning session
- [2025-12-16] Status: pending (ready for task breakdown)

## Testing Strategy
- [ ] Unit tests for auth guards (authGuard, roleGuard)
- [ ] Unit tests for dashboard service
- [ ] Unit tests for parent dashboard component
- [ ] Unit tests for child dashboard component
- [ ] Integration tests for routing (role-based redirects)
- [ ] E2E test: Login as parent → see parent dashboard
- [ ] E2E test: Login as child → see child dashboard
- [ ] E2E test: User with no household → redirect to create
- [ ] E2E test: Mark task complete from child dashboard
- [ ] Accessibility testing (AXE)
- [ ] Cross-browser testing
- [ ] Mobile responsiveness testing

## Related PRs
[To be added when tasks are implemented]

## Demo/Screenshots
[To be added when feature is complete]

## Notes
- This feature provides a basic dashboard. Epic-005 (Parent Dashboard) will add more advanced features like historical trends, charts, and detailed analytics.
- If Epic-002 (Task Management Core) is not complete, dashboards will show empty states or placeholder data.
- Child dashboard assumes users with "child" role in household_members - not child profiles in the children table.
- Consider adding a "tour" or onboarding tips for first-time dashboard visitors (future enhancement).

## Lessons Learned
[To be filled after completion]

