# Feature: Task Template Management

## Metadata
- **ID**: feature-013
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-19
- **Estimated Duration**: 4-5 days

## Description
Parents can create, read, update, and delete task templates with assignment rules. Each task has a title, description, and rules defining how it should be assigned to children (rotation, specific days, etc.).

## User Stories
- As a parent, I want to create a task template so I can define recurring household chores
- As a parent, I want to set assignment rules so tasks automatically rotate between children
- As a parent, I want to edit task rules so I can adjust assignments as needed
- As a parent, I want to delete tasks I no longer need while preserving history

## Requirements

### Task Template Fields
- **Title**: Short task name (e.g., "Take out trash")
- **Description**: Detailed instructions (optional)
- **Rule Type**: weekly_rotation | repeating | daily
- **Rotation Type**: odd_even_week | alternating (for weekly_rotation)
- **Repeat Days**: Array of weekdays [0-6] (for repeating)
- **Assigned Children**: Array of child IDs
- **Active**: Boolean to enable/disable without deleting

### Backend Requirements
- API endpoints: POST, GET, PUT, DELETE /api/households/:id/tasks
- Validate rule configurations (e.g., weekly_rotation needs children IDs)
- Ensure tasks belong to household (tenant isolation)
- Soft delete to preserve assignment history

### Frontend Requirements
- Task creation form with rule builder UI
- Task list view showing all household tasks
- Task edit modal with rule preview
- Visual indicators for rule types
- Confirmation dialogs for delete

## Acceptance Criteria
- [ ] Can create task with all required fields
- [ ] Can select rule type with appropriate configuration
- [ ] Rule type determines what fields are shown
- [ ] Can specify odd/even week rotation
- [ ] Can select multiple children for rotation
- [ ] Can select which days for repeating tasks
- [ ] Daily tasks have simplified creation (no extra config)
- [ ] Can list all tasks for household
- [ ] Can edit task and see preview of changes
- [ ] Can soft-delete task (sets active=false)
- [ ] Validation prevents invalid rule configurations
- [ ] UI clearly explains each rule type

## Technical Notes

### Database Schema Extensions
Uses existing `tasks` table from migration 014:
```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  household_id INTEGER NOT NULL REFERENCES households(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL,  -- 'weekly_rotation' | 'repeating' | 'daily'
  rotation_type VARCHAR(50),        -- 'odd_even_week' | 'alternating'
  repeat_days INTEGER[],            -- Array of 0-6 for repeating tasks
  assigned_children INTEGER[],      -- Array of child IDs
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints
- `POST /api/households/:householdId/tasks` - Create task template
- `GET /api/households/:householdId/tasks` - List household tasks
- `GET /api/households/:householdId/tasks/:taskId` - Get task details
- `PUT /api/households/:householdId/tasks/:taskId` - Update task
- `DELETE /api/households/:householdId/tasks/:taskId` - Soft delete task

### Frontend Components
- `TaskCreateComponent` - Form for creating new tasks
- `TaskListComponent` - Display all household tasks
- `TaskEditComponent` - Modal for editing tasks
- `TaskRuleBuilderComponent` - Reusable rule configuration UI
- `TaskService` - API integration service

### Validation Rules
- Title required, max 200 chars
- Rule type required, must be valid enum value
- If rule_type='weekly_rotation': assigned_children required (min 1)
- If rule_type='weekly_rotation': rotation_type required
- If rule_type='repeating': repeat_days required (min 1 day)
- If rule_type='repeating': assigned_children required
- If rule_type='daily': minimal config, assigned_children optional

## Dependencies
- Epic-001 ✅ Complete (households, children exist)
- feature-003 ✅ Complete (household management UI)

## Tasks
- [ ] [task-082](../items/task-082-task-templates-crud-api.md): Task Templates CRUD API Endpoints (6-8h) **Backend**
- [ ] [task-083](../items/task-083-task-template-frontend-service.md): Task Template Frontend Service (3-4h) **Frontend**
- [ ] [task-084](../items/task-084-task-template-creation-form.md): Task Template Creation Form Component (8-10h) **Frontend**
- [ ] [task-085](../items/task-085-task-template-list-component.md): Task Template List Component (5-6h) **Frontend**
- [ ] [task-086](../items/task-086-task-template-edit-modal.md): Task Template Edit Modal Component (6-7h) **Frontend**
- [ ] [task-087](../items/task-087-task-template-integration-tests.md): Task Template Management Integration Tests (4-5h) **Testing**

**Total Estimated**: 32-40 hours (4-5 days)

**Implementation Sequence**:
1. task-082 (Backend API) - Foundation
2. task-083 (Frontend Service) - Depends on task-082
3. task-084, task-085, task-086 (Frontend Components) - Depend on task-083, can be parallel
4. task-087 (Integration Tests) - Depends on all above

## Progress Log
- [2025-12-19 10:40] Feature created for Epic-002 breakdown
- [2025-12-19 12:00] Feature broken down into 6 tasks by Orchestrator Agent
