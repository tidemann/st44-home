# Feature: Task Assignment Rule Engine

## Metadata
- **ID**: feature-014
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: completed
- **Priority**: critical
- **Created**: 2025-12-19
- **Estimated Duration**: 5-6 days

## Description
Automated service that generates daily task assignments based on task template rules. The rule engine calculates which child is assigned each task for each day, handling odd/even week rotation, repeating schedules, and daily tasks.

## User Stories
- As the system, I want to generate task assignments automatically so parents don't have to assign manually
- As a parent, I want odd/even week rotation to work correctly so children alternate fairly
- As a parent, I want repeating tasks to generate on the right days so my schedule is consistent
- As the system, I want idempotent assignment generation so re-running doesn't create duplicates

## Requirements

### Rule Engine Logic

#### Weekly Rotation (Odd/Even Week)
- Determines current ISO week number
- Odd weeks: assign to first child in assigned_children array
- Even weeks: assign to second child in assigned_children array
- Supports 2+ children (cycles through list)

#### Weekly Rotation (Alternating)
- Tracks last assigned child in assignment history
- Assigns to next child in rotation sequence
- Handles new tasks gracefully (starts with first child)

#### Repeating Tasks
- Generates assignments on specified weekdays
- Example: repeat_days=[1,3,5] creates Mon/Wed/Fri assignments
- Rotates through assigned_children for each occurrence

#### Daily Tasks
- Creates assignment every day
- If assigned_children specified: rotates daily
- If no children specified: all children can claim it

### Assignment Generation Service
- Runs daily (via cron job or scheduled task)
- Generates assignments for next 7 days
- Idempotent: skips already-generated assignments
- Logs all generation activity for debugging

### Backend Requirements
- Assignment generation function/service
- ISO week number calculation (use date-fns getISOWeek)
- Query existing assignments to prevent duplicates
- Batch insert new assignments
- Error handling and logging
- Manual trigger endpoint for testing

### API Endpoints
- `POST /api/admin/tasks/generate-assignments` - Manual trigger (for testing)
- `GET /api/households/:id/assignments?date=YYYY-MM-DD` - View generated assignments

## Acceptance Criteria
- [ ] Odd/even week rotation assigns correctly based on ISO week
- [ ] Alternating rotation cycles through children sequentially
- [ ] Repeating tasks generate on correct weekdays only
- [ ] Daily tasks generate every day
- [ ] Generation is idempotent (safe to re-run)
- [ ] Handles week boundaries correctly (Sunday → Monday)
- [ ] No duplicate assignments created
- [ ] Inactive tasks (active=false) are skipped
- [ ] Assignments reference correct child_id, task_id, date
- [ ] Assignment status initialized to 'pending'
- [ ] Generation logs timestamp and task count
- [ ] Manual trigger endpoint works for testing
- [ ] Performance acceptable with 50+ tasks per household

## Technical Notes

### ISO Week Numbering
Use ISO 8601 standard via date-fns:
```typescript
import { getISOWeek, getYear } from 'date-fns';

const weekNumber = getISOWeek(new Date());
const isEvenWeek = weekNumber % 2 === 0;
```

### Assignment Generation Algorithm
```typescript
interface AssignmentGenerationResult {
  created: number;
  skipped: number;
  errors: string[];
}

async function generateAssignments(
  startDate: Date,
  days: number
): Promise<AssignmentGenerationResult> {
  // 1. Load all active tasks
  // 2. For each date in range:
  //    a. Check which tasks should occur
  //    b. Calculate assigned child
  //    c. Check if assignment exists
  //    d. Create if missing
  // 3. Return summary
}
```

### Database Operations
- Query: SELECT from tasks WHERE active=true AND household_id=?
- Query: SELECT from task_assignments WHERE date BETWEEN ? AND ? (check existing)
- Batch Insert: INSERT INTO task_assignments (task_id, child_id, date, status) VALUES (...)

### Cron Schedule (Future)
- Daily at 2:00 AM (off-peak hours)
- Generates next 7 days of assignments
- Logs to monitoring system

### Performance Considerations
- Batch database operations (don't insert one-by-one)
- Index task_assignments by (date, child_id, task_id)
- Limit generation to active households
- Use connection pooling

## Dependencies
- feature-013 ✅ (must be complete - needs task templates)
- Existing task_assignments table (migration 015)
- date-fns library for ISO week calculations

## Tasks

Total: 3 tasks (18-23 hours estimated, 3-4 days)

- [x] [task-091](../items/done/task-091-assignment-generation-service.md): Assignment Generation Service (8-10h, backend-agent) **COMPLETED** 2025-12-19 ✅
- [x] [task-092](../items/done/task-092-assignment-api-endpoints.md): Assignment API Endpoints (4-5h, backend-agent) **COMPLETED** 2025-12-19 ✅
- [x] [task-093](../items/done/task-093-assignment-integration-tests.md): Assignment Integration Tests (6-8h, backend-agent) **COMPLETED** 2025-12-19 ✅

**Dependencies:**
- task-091 ✅ **COMPLETE** → task-092 ✅ **COMPLETE** → task-093 ✅ **COMPLETE**

**Progress**: 3/3 tasks complete (100%)

## Progress Log
- [2025-12-19 10:45] Feature created for Epic-002 breakdown
- [2025-12-19 11:00] Feature broken down into 3 tasks by orchestrator-agent
- [2025-12-19 23:39] All 3 tasks completed (task-091, task-092, task-093)
- [2025-12-19 23:40] Feature status changed to completed (100%)
