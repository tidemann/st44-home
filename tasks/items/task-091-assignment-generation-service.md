# Task: Assignment Generation Service

## Metadata
- **ID**: task-091
- **Feature**: [feature-014-task-assignment-rule-engine](../features/feature-014-task-assignment-rule-engine.md)
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-19
- **Assigned Agent**: backend-agent
- **Estimated Duration**: 8-10 hours (1-1.5 days)

## Description
Create the core assignment generation service that implements rule engine logic for all task types (daily, repeating, weekly_rotation). The service calculates which child should be assigned each task for each day based on the task's rule configuration.

## Requirements

### Assignment Generation Function
Create `src/services/assignment-generator.ts` with main function:

```typescript
interface AssignmentGenerationResult {
  created: number;
  skipped: number;
  errors: string[];
}

async function generateAssignments(
  householdId: string,
  startDate: Date,
  days: number
): Promise<AssignmentGenerationResult>
```

### Rule Type Implementations

#### 1. Weekly Rotation (Odd/Even Week)
- Import `getISOWeek` from date-fns
- Calculate ISO week number for target date
- Determine if odd (week % 2 === 1) or even (week % 2 === 0)
- Select child index: odd = 0, even = 1
- Support 2+ children (cycle: `childIndex % assigned_children.length`)

#### 2. Weekly Rotation (Alternating)  
- Query most recent assignment for this task
- Get `child_id` of last assignment
- Find index in `assigned_children` array
- Assign to next child: `(lastIndex + 1) % assigned_children.length`
- If no history: start with first child (index 0)

#### 3. Repeating Tasks
- Check if date's weekday is in `repeat_days` array
- Weekday mapping: 0=Sunday, 1=Monday, ..., 6=Saturday
- If not a repeat day: skip (don't create assignment)
- If repeat day: rotate through `assigned_children` based on occurrence count

#### 4. Daily Tasks
- Generate assignment for every date in range
- If `assigned_children` specified: rotate daily
- If `assigned_children` empty/null: assign to null (any child can claim)

### Idempotency
- Before creating assignment, check if exists:
  ```sql
  SELECT id FROM task_assignments 
  WHERE task_id = ? AND date = ? AND child_id = ?
  ```
- If exists: skip (count as 'skipped')
- If missing: create (count as 'created')

### Database Operations
- Use connection pool from existing database.ts
- Batch queries efficiently:
  1. Load all active tasks for household
  2. Load existing assignments for date range
  3. Calculate new assignments
  4. Batch insert new assignments
- Use transactions for data consistency

### Error Handling
- Catch and log all errors
- Return errors array with task_id and error message
- Don't fail entire generation if one task has issues
- Log warnings for tasks with invalid configurations

## Acceptance Criteria
- [ ] Function signature matches interface above
- [ ] All 4 rule types implemented correctly
- [ ] ISO week calculation uses date-fns getISOWeek
- [ ] Idempotency prevents duplicate assignments
- [ ] Existing assignments are skipped (not recreated)
- [ ] Batch operations used (not one-by-one inserts)
- [ ] Returns accurate created/skipped/errors counts
- [ ] Handles tasks with no assigned_children
- [ ] Skips inactive tasks (active=false)
- [ ] Transaction used for consistency
- [ ] Error handling doesn't crash entire generation
- [ ] Comprehensive logging for debugging

## Technical Notes

### ISO Week Example
```typescript
import { getISOWeek } from 'date-fns';

const weekNum = getISOWeek(new Date('2025-12-19')); // 51
const isEven = weekNum % 2 === 0; // false (odd week)
```

### Weekday Calculation
```typescript
const dayOfWeek = targetDate.getDay(); // 0-6 (Sun-Sat)
const shouldGenerate = task.rule_config.repeat_days.includes(dayOfWeek);
```

### Batch Insert Pattern
```typescript
const valueSets = assignments.map(a => 
  `('${a.task_id}', '${a.child_id}', '${a.date}', 'pending')`
);
const sql = `
  INSERT INTO task_assignments (task_id, child_id, date, status)
  VALUES ${valueSets.join(', ')}
  ON CONFLICT (task_id, child_id, date) DO NOTHING
`;
```

## Dependencies
- feature-013 ✅ (task templates exist)
- task_assignments table (migration 015)
- date-fns library (install if not present)

## Testing Strategy
- Unit tests in task-091 (NOT this task - separate task-093)
- Test each rule type in isolation
- Test idempotency (run twice, verify no duplicates)
- Test error handling

## Files to Create/Modify
- Create: `apps/backend/src/services/assignment-generator.ts`
- Modify: `apps/backend/package.json` (add date-fns if needed)

## Progress Log
- [2025-12-19] Task created for feature-014 breakdown
