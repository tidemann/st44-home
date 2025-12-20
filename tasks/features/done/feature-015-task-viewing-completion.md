# Feature: Task Viewing & Completion

## Metadata
- **ID**: feature-015
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: completed
- **Priority**: critical
- **Created**: 2025-12-19
- **Completed**: 2025-12-20
- **Estimated Duration**: 4-5 days
- **Actual Duration**: 1.5 days

## Description
Children can view their assigned tasks and mark them complete. Parents can view all household tasks with status, override assignments, and see completion history. Different views optimized for parent vs child perspectives.

## User Stories
- As a child, I want to see my tasks for today so I know what chores to do
- As a child, I want to mark tasks complete so I can track my progress
- As a parent, I want to see all household tasks so I can monitor completion
- As a parent, I want to see which child is assigned each task
- As a parent, I want to override assignments if needed
- As a parent, I want to see task completion history

## Requirements

### Child Task View
- Shows only tasks assigned to current child
- Grouped by date (Today, Tomorrow, This Week)
- Clear visual status (pending, completed, overdue)
- Simple completion action (tap/click to complete)
- Shows task title and description
- Mobile-optimized (primary use case)

### Parent Task View
- Shows all household tasks across all children
- Filterable by child, date, status
- Shows assigned child name
- Ability to reassign tasks
- Completion history visible
- Desktop and mobile optimized

### Task Completion
- Mark task complete with single action
- Records completion timestamp
- Updates status from 'pending' to 'completed'
- Immediate UI feedback (optimistic update)
- Cannot un-complete (intentional - teaches accountability)
- Optionally add completion note/photo (future enhancement)

### Backend Requirements
- API endpoints for task assignments by child/household
- Completion endpoint with validation
- Assignment reassignment endpoint
- Status filters (pending, completed, overdue)
- Date range queries
- Performance optimized for large task lists

### Frontend Requirements
- Child task list component
- Parent task dashboard component
- Task completion action with confirmation
- Real-time status updates
- Loading states and error handling
- Accessible (keyboard navigation, ARIA labels)

## Acceptance Criteria
- [ ] Child sees only their assigned tasks
- [ ] Child can filter by date (today, week, all)
- [ ] Child can mark task complete with one action
- [ ] Completion updates immediately in UI
- [ ] Parent sees all household tasks
- [ ] Parent can filter by child name
- [ ] Parent can filter by status (pending/completed)
- [ ] Parent can filter by date range
- [ ] Parent can reassign task to different child
- [ ] Task status badge shows visual indicator (color, icon)
- [ ] Overdue tasks highlighted clearly
- [ ] Completed tasks show timestamp and child name
- [ ] Empty states handled (no tasks today)
- [ ] Loading states shown during API calls
- [ ] Error handling with user-friendly messages
- [ ] Mobile responsive (touch-friendly tap targets)
- [ ] WCAG AA accessible

## Technical Notes

### API Endpoints
- `GET /api/children/:childId/tasks?date=YYYY-MM-DD&status=pending` - Child's tasks
- `GET /api/households/:householdId/tasks/assignments?date=YYYY-MM-DD` - All household assignments
- `PUT /api/tasks/assignments/:assignmentId/complete` - Mark complete
- `PUT /api/tasks/assignments/:assignmentId/reassign` - Change assigned child
- `GET /api/tasks/assignments/:assignmentId/history` - Completion history

### Database Queries
```sql
-- Child's tasks for date
SELECT ta.*, t.title, t.description, t.rule_type
FROM task_assignments ta
JOIN tasks t ON ta.task_id = t.id
WHERE ta.child_id = ? AND ta.date = ? AND ta.status = 'pending'
ORDER BY t.title;

-- Household tasks with child names
SELECT ta.*, t.title, c.name as child_name
FROM task_assignments ta
JOIN tasks t ON ta.task_id = t.id
JOIN children c ON ta.child_id = c.id
WHERE t.household_id = ? AND ta.date = ?
ORDER BY c.name, t.title;

-- Mark complete
UPDATE task_assignments
SET status = 'completed', completed_at = NOW()
WHERE id = ? AND status = 'pending';
```

### Frontend Components
- `ChildTaskListComponent` - Child's task view
  - Uses signals for reactive state
  - TaskService.getChildTasks()
  - TaskService.completeTask()
- `ParentTaskDashboardComponent` - Parent's overview
  - TaskService.getHouseholdTasks()
  - TaskService.reassignTask()
  - Filter controls (child, date, status)
- `TaskCardComponent` - Reusable task display
  - Shows title, description, status
  - Completion action button
  - Child name (parent view)
- `TaskService` - API integration
  - getChildTasks(childId, date, status)
  - getHouseholdTasks(householdId, filters)
  - completeTask(assignmentId)
  - reassignTask(assignmentId, newChildId)

### State Management (Signals)
```typescript
// TaskService
private tasks = signal<TaskAssignment[]>([]);
public tasks$ = computed(() => this.tasks().filter(t => ...));

completeTask(id: number) {
  // Optimistic update
  this.tasks.update(tasks => 
    tasks.map(t => t.id === id ? {...t, status: 'completed'} : t)
  );
  
  // API call
  return this.http.put(`/api/tasks/assignments/${id}/complete`, {});
}
```

### Status Badge Colors
- Pending: Blue badge
- Completed: Green badge with checkmark
- Overdue: Red badge with warning icon
- Due Today: Yellow badge

### Mobile Optimization
- Large touch targets (min 44x44px)
- Swipe gestures for completion (future)
- Bottom sheet for task details
- Pull-to-refresh for task list

## UI/UX Considerations

### Child View
- Gamified completion (animations, sounds)
- Progress indicator (X of Y tasks complete)
- Encouraging messages ("Great job!", "Almost done!")
- Simple, focused interface

### Parent View
- Quick overview dashboard
- At-a-glance status for all children
- Drill-down to details
- Bulk actions (reassign multiple tasks)

### Accessibility
- Clear focus indicators
- Keyboard shortcuts (Space to complete)
- Screen reader announcements for completion
- High contrast mode support

## Dependencies
- feature-013 ✅ (needs task templates to exist)
- feature-014 ✅ (needs assignments generated)
- feature-003 ✅ Complete (household context, child data)

## Tasks

Total: 6 tasks (26-33 hours estimated, 4-5 days)

- [x] [task-094](../items/done/task-094-task-assignments-query-api.md): Task Assignments Query API (4-5h, backend-agent) ✅ COMPLETED 2025-12-20
- [x] [task-095](../items/done/task-095-task-completion-reassignment-api.md): Task Completion & Reassignment API (4-5h, backend-agent) ✅ COMPLETED 2025-12-20
- [x] [task-096](../items/done/task-096-frontend-task-service.md): Frontend TaskService for Viewing & Completion (3-4h, frontend-agent) ✅ COMPLETED 2025-12-20
- [x] [task-097](../items/done/task-097-child-task-list-component.md): Child Task List Component (4-5h, frontend-agent) ✅ COMPLETED 2025-12-20
- [x] [task-098](../items/done/task-098-parent-task-dashboard.md): Parent Task Dashboard Component (5-6h, frontend-agent) ✅ COMPLETED 2025-12-20
- [x] [task-099](../items/done/task-099-viewing-completion-tests.md): Integration Tests for Viewing & Completion (6-8h, testing-agent) ✅ COMPLETED 2025-12-20

**Dependencies:** ✅ ALL COMPLETE
- task-094 → task-096 (service needs API) ✅
- task-095 → task-096 (service needs API) ✅
- task-096 → task-097, task-098 (components need service) ✅
- task-094, task-095, task-096, task-097, task-098 → task-099 (tests need all implementations) ✅

**Progress**: 6/6 tasks complete (100%) ✅

## Progress Log
- [2025-12-19 10:50] Feature created for Epic-002 breakdown
- [2025-12-20 00:15] Feature broken down into 6 tasks by orchestrator-agent
- [2025-12-20 01:30] Task-094 (Assignment Query API) completed and merged (PR #118) - 1/6 complete (17%)
- [2025-12-20 02:00] Task-095 (Completion & Reassignment API) completed and merged (PR #119) - 2/6 complete (33%)
- [2025-12-20 10:45] Task-096 (Frontend TaskService) completed and merged (PR #122) - 3/6 complete (50%)
- [2025-12-20 11:30] Task-097 (Child Task List Component) completed and merged (PR #123) - 4/6 complete (67%)
- [2025-12-20 11:45] Task-098 (Parent Task Dashboard) completed and merged (PR #124) - 5/6 complete (83%)
- [2025-12-20 13:23] Task-099 (Integration Tests) completed and merged (PR #125) - 6/6 complete (100%) ✅
- [2025-12-20 13:25] Feature status changed to completed - All 6 tasks done!
- [2025-12-20 13:25] **FEATURE-015 COMPLETE** 🎉 Task Viewing & Completion is live!
