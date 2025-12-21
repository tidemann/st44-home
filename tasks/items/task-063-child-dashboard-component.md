# Task: Build Child Dashboard Component

## Metadata
- **ID**: task-063
- **Feature**: feature-012 - Landing Pages After Login
- **Epic**: epic-003 - User Onboarding & Experience
- **Status**: in-progress
- **Priority**: high
- **Created**: 2025-12-21
- **Assigned Agent**: frontend-agent
- **Estimated Duration**: 3-4 hours

## Description
Create the child dashboard component that serves as the landing page for users with 'child' role after login. This is a simplified, child-friendly interface showing today's tasks, points earned, and completion status. Unlike the full task list (`/tasks`), this dashboard focuses on immediate action items for today only, providing motivation through points display and simple completion actions.

**Context:** Task-060 completed the backend API (`GET /api/children/my-tasks`). Feature-012 parent dashboard is complete (tasks 059, 061, 062, 064, 066). This is the final task to complete Feature-012.

## Requirements

### Component Specification
```
Component: ChildDashboardComponent
Location: apps/frontend/src/app/pages/child-dashboard/
Route: /my-tasks
Guard: authGuard (requires child role verification)
Lazy-loaded: Yes
```

### UI Requirements
1. **Greeting Section**
   - Display: "Hi [Child Name]! 👋"
   - Friendly, encouraging tone
   - Large, readable font

2. **Points Display**
   - Show: "Today's Points: [completed]/[total]"
   - Visual progress indicator (progress bar or circular)
   - Color-coded: green for 70%+, yellow for 40-69%, red for <40%
   - Celebrate when 100% complete

3. **Today's Tasks List**
   - Show only today's tasks (date = current date)
   - Each task card displays:
     - Task name (large, clear font)
     - Task description (optional, can be hidden if too long)
     - Points value (badge or pill)
     - Status indicator (pending/completed)
     - Action button: "Mark Done" (pending) or "✓ Completed" (completed)
   - Sort: Pending tasks first, then completed
   - Empty state: "No tasks for today! 🎉"

4. **Action Buttons**
   - Each pending task: "Mark Done" button (large touch target)
   - Completed tasks: Show checkmark, disabled button
   - Loading state during API call
   - Success feedback: Brief animation or message

5. **Visual Design**
   - Child-friendly: bright colors, large buttons, clear text
   - Mobile-first: Large touch targets (min 44x44px)
   - Simple layout: No complex navigation
   - WCAG AA compliant: Color contrast, keyboard nav, ARIA labels

### Functional Requirements
1. Call `GET /api/children/my-tasks` on component init
2. Parse response: tasks array, total_points_today, completed_points, child_name
3. Display greeting with child_name
4. Render task list with completion actions
5. Handle "Mark Done" click → Call task completion API → Refresh data
6. Show loading state during API calls
7. Handle errors gracefully with retry option
8. Persist household context (if user has multiple households)

### API Integration
**Endpoint**: `GET /api/children/my-tasks`
**Query Params**: 
  - `household_id` (optional, defaults to user's household)
  - `date` (optional, defaults to today)

**Response**:
```json
{
  "tasks": [
    {
      "id": "uuid",
      "task_name": "Make bed",
      "task_description": "Make your bed neatly",
      "points": 10,
      "date": "2025-12-21",
      "status": "pending" | "completed",
      "completed_at": "2025-12-21T10:30:00Z" | null
    }
  ],
  "total_points_today": 30,
  "completed_points": 10,
  "child_name": "Emma"
}
```

### State Management
- Use Angular signals for reactive state
- State signals:
  - `childDashboard`: Full API response
  - `isLoading`: Boolean
  - `errorMessage`: String
- Computed signals:
  - `tasks`: Array of tasks
  - `childName`: String
  - `totalPoints`: Number
  - `completedPoints`: Number
  - `progressPercent`: Number (0-100)
  - `hasTasks`: Boolean
  - `allCompleted`: Boolean

## Acceptance Criteria
- [ ] Component created at `apps/frontend/src/app/pages/child-dashboard/`
- [ ] Files: `child-dashboard.ts`, `child-dashboard.html`, `child-dashboard.css`
- [ ] Uses Angular standalone component pattern
- [ ] Uses `ChangeDetectionStrategy.OnPush`
- [ ] Implements `OnInit` lifecycle hook
- [ ] Route added to `app.routes.ts`: `/my-tasks`
- [ ] Protected by `authGuard`
- [ ] Lazy-loaded component
- [ ] Service method added to `DashboardService`: `getMyTasks(householdId?, date?)`
- [ ] Calls `GET /api/children/my-tasks` via DashboardService
- [ ] Displays child name in greeting
- [ ] Shows points progress (completed/total)
- [ ] Renders today's tasks with name, description, points, status
- [ ] "Mark Done" button for pending tasks
- [ ] Checkmark for completed tasks
- [ ] Loading state during API calls
- [ ] Error state with retry button
- [ ] Empty state when no tasks today
- [ ] Mobile-responsive design
- [ ] Large touch targets (44x44px minimum)
- [ ] WCAG AA accessible (keyboard nav, ARIA, color contrast)
- [ ] TypeScript compiles without errors
- [ ] Unit tests for component logic
- [ ] E2E test for child dashboard flow
- [ ] No console errors or warnings

## Dependencies
- **Required**: task-060 (Child tasks API endpoint) ✅ Complete
- **Required**: task-061 (Auth guards) ✅ Complete
- **Required**: feature-001 (Authentication) ✅ Complete
- **Beneficial**: feature-015 (Task completion API) ✅ Complete

## Technical Notes

### File Structure
```
apps/frontend/src/app/pages/child-dashboard/
  ├── child-dashboard.ts           # Component class
  ├── child-dashboard.html          # Template
  ├── child-dashboard.css           # Styles
  └── child-dashboard.spec.ts       # Unit tests
```

### Service Method (DashboardService)
```typescript
export interface ChildTask {
  id: string;
  task_name: string;
  task_description: string;
  points: number;
  date: string;
  status: 'pending' | 'completed';
  completed_at: string | null;
}

export interface MyTasksResponse {
  tasks: ChildTask[];
  total_points_today: number;
  completed_points: number;
  child_name: string;
}

async getMyTasks(householdId?: string, date?: string): Promise<MyTasksResponse> {
  const params = new URLSearchParams();
  if (householdId) params.set('household_id', householdId);
  if (date) params.set('date', date);
  
  const query = params.toString() ? `?${params.toString()}` : '';
  return this.api.get<MyTasksResponse>(`/children/my-tasks${query}`);
}
```

### Task Completion
Use existing TaskService method:
```typescript
async completeTask(assignmentId: string): Promise<void> {
  await this.taskService.completeTask(assignmentId);
  await this.loadMyTasks(); // Refresh data
}
```

### Routing Configuration
```typescript
// app.routes.ts
{
  path: 'my-tasks',
  loadComponent: () =>
    import('./pages/child-dashboard/child-dashboard').then((m) => m.ChildDashboardComponent),
  canActivate: [authGuard],
}
```

### Role-Based Redirect (in auth guard)
Child users should be redirected to `/my-tasks` after login (not `/dashboard`).
Update `authGuard` or create separate logic in login component.

### Styling Notes
- Use TailwindCSS utility classes for rapid development
- Child-friendly colors: Primary (blue), Success (green), Warning (yellow)
- Large fonts: headings 24-32px, body 16-18px
- Spacing: generous padding/margin for touch
- Progress bar: Consider using native `<progress>` element or CSS gradient

### Testing Strategy
**Unit Tests** (child-dashboard.spec.ts):
- Component initializes correctly
- Loads data from DashboardService
- Displays child name, points, tasks
- Handles loading state
- Handles error state
- Handles empty state
- Mark done button triggers completion API

**E2E Tests** (apps/frontend/e2e/features/child-dashboard.spec.ts):
- Child user logs in → Redirected to /my-tasks
- Dashboard displays child name and points
- Today's tasks are visible
- Can mark task as complete
- Completed task shows checkmark
- Points update after completion

## Implementation Plan

### Phase 1: Service Method (30 min)
1. Add `ChildTask` and `MyTasksResponse` interfaces to `dashboard.service.ts`
2. Implement `getMyTasks(householdId?, date?)` method
3. Handle query parameters correctly
4. Add unit tests for service method

### Phase 2: Component Structure (45 min)
1. Create `apps/frontend/src/app/pages/child-dashboard/` directory
2. Create `child-dashboard.ts` component file
3. Set up imports: CommonModule, RouterLink, signals, inject, etc.
4. Define component metadata: selector, imports, template/style URLs
5. Implement state signals: childDashboard, isLoading, errorMessage
6. Implement computed signals: tasks, childName, points, progress
7. Implement `ngOnInit()` → call `loadMyTasks()`
8. Implement `loadMyTasks()` method
9. Implement `onMarkDone(taskId)` method
10. Implement error handling

### Phase 3: Template & Styling (60 min)
1. Create `child-dashboard.html` template file
2. Add greeting section with child name
3. Add points progress display
4. Add tasks list with *ngFor
5. Add task cards with name, description, points, status
6. Add "Mark Done" buttons with click handlers
7. Add loading state UI
8. Add error state UI with retry button
9. Add empty state UI
10. Create `child-dashboard.css` stylesheet
11. Style with mobile-first approach
12. Ensure WCAG AA compliance

### Phase 4: Routing Integration (15 min)
1. Add `/my-tasks` route to `app.routes.ts`
2. Configure lazy loading
3. Apply `authGuard`
4. Test navigation to /my-tasks

### Phase 5: Testing (45 min)
1. Create `child-dashboard.spec.ts` unit tests
2. Test component initialization
3. Test data loading
4. Test task completion
5. Test error handling
6. Create E2E test file
7. Test child login → dashboard flow
8. Test task completion flow
9. Verify all tests pass

### Phase 6: Final Validation (15 min)
1. Run `npm run build` → Verify TypeScript compilation
2. Run `npm run lint` → Fix any linting issues
3. Run `npm run test:ci` → Verify unit tests pass
4. Run E2E tests → Verify dashboard flow works
5. Manual testing: Login as child, verify UI
6. Check accessibility with browser DevTools
7. Verify mobile responsiveness
8. Check for console errors/warnings

## Progress Log
- [2025-12-21 06:30] Task created
- [2025-12-21 06:30] Status: in-progress
- [2025-12-21 06:30] Dependency verified: task-060 complete ✅
- [2025-12-21 06:30] Beginning implementation

## Testing Results
[To be filled during testing phase]

## Review Notes
[To be filled during review phase]

## Related PRs
[To be added when PR is created]

## Lessons Learned
[To be filled after completion]
