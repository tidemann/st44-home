# Single Task Feature - Testing Checklist

## Overview

This checklist provides comprehensive manual testing scenarios for the Single Task feature. Use this to verify all functionality works correctly before deployment.

**Feature Version:** 1.0.0
**Test Environment:** Staging
**Tester:** _______________
**Test Date:** _______________

---

## Pre-Testing Setup

### Test Data Requirements

- [ ] At least 2 parent users created
- [ ] At least 3 child users per household
- [ ] Each child has profile with `user_id` set
- [ ] Test household has sufficient points balance

### Database Verification

```sql
-- Verify migrations applied
SELECT version, name, applied_at
FROM schema_migrations
WHERE version IN ('040', '041', '042', '043', '044')
ORDER BY version;

-- Verify tables exist
\dt task_candidates
\dt task_responses

-- Verify sample data
SELECT id, name, rule_type, deadline FROM tasks WHERE rule_type = 'single' LIMIT 5;
```

- [ ] All 5 migrations applied
- [ ] New tables exist with correct schema
- [ ] Sample single tasks created

---

## Test Suite 1: Single Task Creation (Parent)

### TC-001: Create Single Task with All Fields

**Steps:**
1. Log in as parent user
2. Navigate to Tasks page
3. Click "Create Task" button
4. Select task type: **Single**
5. Fill in all fields:
   - Name: "Clean the garage"
   - Description: "Organize tools and sweep floor"
   - Points: 50
   - Deadline: Tomorrow at 5 PM
   - Candidates: Select all 3 children
6. Click "Create" button

**Expected Result:**
- [ ] Task created successfully
- [ ] Success message displayed
- [ ] Task appears in task list with "Single" badge
- [ ] Deadline displayed correctly
- [ ] All 3 children listed as candidates

**Database Verification:**
```sql
SELECT * FROM tasks WHERE name = 'Clean the garage';
SELECT * FROM task_candidates WHERE task_id = '<task_id>';
```
- [ ] Task has `rule_type = 'single'`
- [ ] 3 rows in task_candidates table

---

### TC-002: Create Single Task with Minimum Fields

**Steps:**
1. Create single task with only required fields:
   - Name: "Quick chore"
   - Points: 10
   - Candidates: 1 child (no deadline)

**Expected Result:**
- [ ] Task created successfully
- [ ] Deadline shows as "No deadline"
- [ ] Single candidate assigned

---

### TC-003: Validation - No Candidates Selected

**Steps:**
1. Try to create single task without selecting any candidates

**Expected Result:**
- [ ] Validation error: "At least one candidate required"
- [ ] Form does not submit
- [ ] Error message highlighted in red

---

### TC-004: Validation - Deadline in Past

**Steps:**
1. Try to create single task with deadline yesterday

**Expected Result:**
- [ ] Validation error: "Deadline must be in the future"
- [ ] Form does not submit

---

## Test Suite 2: Child Dashboard - Available Tasks

### TC-101: View Available Tasks Section

**Steps:**
1. Log out from parent account
2. Log in as Child 1 (one of the candidates)
3. Navigate to child dashboard

**Expected Result:**
- [ ] "Available Tasks" section visible at top of page
- [ ] Task "Clean the garage" is listed
- [ ] Task shows:
  - [ ] Task name and description
  - [ ] Points: 50 pts
  - [ ] Deadline badge with countdown
  - [ ] "Accept" button (green)
  - [ ] "Decline" button (red)
  - [ ] Candidate count: "3 candidates"

---

### TC-102: Accept Single Task

**Steps:**
1. As Child 1, click "Accept" button on task

**Expected Result:**
- [ ] Loading spinner appears briefly
- [ ] Task disappears from "Available Tasks" section
- [ ] Task appears in regular "My Tasks" list
- [ ] Task shows Child 1 as owner
- [ ] No error messages
- [ ] Success message or toast notification

**Database Verification:**
```sql
SELECT * FROM task_assignments WHERE task_id = '<task_id>';
SELECT * FROM task_responses WHERE task_id = '<task_id>' AND child_id = '<child1_id>';
```
- [ ] Assignment created with `child_id = Child 1`
- [ ] Response recorded with `response = 'accepted'`

---

### TC-103: Verify Other Children Can't See Accepted Task

**Steps:**
1. Log out as Child 1
2. Log in as Child 2 (another candidate)
3. Check "Available Tasks" section

**Expected Result:**
- [ ] Task "Clean the garage" is NOT visible
- [ ] No error messages
- [ ] Other available tasks (if any) still visible

---

### TC-104: Decline Single Task

**Prerequisite:** Create new single task "Wash the car" assigned to all 3 children

**Steps:**
1. As Child 2, view "Wash the car" task
2. Click "Decline" button

**Expected Result:**
- [ ] Loading spinner appears briefly
- [ ] Task disappears from "Available Tasks" section
- [ ] Task moves to "Declined Tasks" section (if implemented)
- [ ] Success message displayed

**Database Verification:**
```sql
SELECT * FROM task_responses WHERE task_id = '<task_id>' AND child_id = '<child2_id>';
```
- [ ] Response recorded with `response = 'declined'`
- [ ] NO assignment created

---

### TC-105: Undo Decline (Change Mind)

**Steps:**
1. As Child 2, find declined task in "Declined Tasks" section
2. Click "Changed Mind?" or "Undo" button

**Expected Result:**
- [ ] Task reappears in "Available Tasks" section
- [ ] Can now accept or decline again
- [ ] No error messages

**Database Verification:**
```sql
SELECT * FROM task_responses WHERE task_id = '<task_id>' AND child_id = '<child2_id>';
```
- [ ] Response record deleted (0 rows)

---

### TC-106: Deadline Countdown Display

**Prerequisite:** Create single task with deadline in 1 day

**Steps:**
1. As child, view available task with deadline

**Expected Result:**
- [ ] Deadline badge shows "1 day left" or similar
- [ ] Badge color indicates urgency (red if < 2 days)
- [ ] Countdown is accurate

---

### TC-107: Urgent Deadline Indicator

**Prerequisite:** Create single task with deadline in 12 hours

**Steps:**
1. View task with imminent deadline

**Expected Result:**
- [ ] Deadline badge shows "Urgent" or red styling
- [ ] Hours displayed if < 1 day
- [ ] Visual indicator of urgency

---

## Test Suite 3: Race Condition Handling

### TC-201: Simultaneous Accept by Two Children

**Setup:**
1. Create single task assigned to Child 1 and Child 2
2. Open two browser windows side-by-side
3. Log in as Child 1 in first window
4. Log in as Child 2 in second window

**Steps:**
1. Click "Accept" button in BOTH windows at the same time (< 1 second apart)

**Expected Result:**
- [ ] First child's accept succeeds
- [ ] Second child sees error: "Task already accepted by another child"
- [ ] Task appears in first child's task list
- [ ] Task disappears from second child's available list
- [ ] Only ONE assignment created

**Database Verification:**
```sql
SELECT COUNT(*) FROM task_assignments WHERE task_id = '<task_id>';
```
- [ ] COUNT = 1 (not 2)

---

### TC-202: Accept After Someone Else Declined

**Steps:**
1. Child 1 declines task
2. Child 2 accepts task immediately after

**Expected Result:**
- [ ] Child 2's accept succeeds normally
- [ ] No conflicts or errors
- [ ] Task assigned to Child 2

---

## Test Suite 4: Failed Assignments (Parent)

### TC-301: All Children Decline

**Setup:**
1. Create single task "Difficult chore" assigned to all 3 children

**Steps:**
1. Log in as Child 1, decline task
2. Log in as Child 2, decline task
3. Log in as Child 3, decline task
4. Log out, log in as Parent
5. Navigate to parent dashboard

**Expected Result:**
- [ ] "Tasks Needing Attention" section visible
- [ ] Section shows "Failed to Assign" category
- [ ] Task "Difficult chore" is listed with:
  - [ ] All 3 children declined badge
  - [ ] Warning icon
  - [ ] "Assign Manually" button

**Database Verification:**
```sql
SELECT task_id, COUNT(*) as decline_count
FROM task_responses
WHERE task_id = '<task_id>' AND response = 'declined'
GROUP BY task_id;
```
- [ ] decline_count = 3 (matches candidate count)

---

### TC-302: Manual Assignment After All Declined

**Steps:**
1. As parent, click "Assign Manually" button on failed task
2. Select Child 1 from dropdown
3. Click "Assign"

**Expected Result:**
- [ ] Task assigned to Child 1
- [ ] Task disappears from "Failed to Assign" section
- [ ] Task appears in Child 1's task list
- [ ] Success message displayed

---

### TC-303: Partial Declines (Not All)

**Setup:**
1. Create task assigned to 3 children
2. Only Child 1 and Child 2 decline (Child 3 hasn't responded)

**Steps:**
1. As parent, check "Tasks Needing Attention"

**Expected Result:**
- [ ] Task does NOT appear in "Failed to Assign" section
- [ ] Task still available to Child 3

---

## Test Suite 5: Expired Tasks

### TC-401: Task Deadline Expires with No Acceptance

**Setup:**
1. Create single task with deadline 1 hour from now
2. Wait for deadline to pass (or manually set deadline to past in database)

**Steps:**
1. As parent, navigate to dashboard
2. Check "Tasks Needing Attention" section

**Expected Result:**
- [ ] Task appears in "Deadline Expired" category
- [ ] Shows "X days overdue" badge
- [ ] Warning icon or red styling
- [ ] "Assign Manually" button available

**Database Verification:**
```sql
SELECT * FROM tasks WHERE id = '<task_id>' AND deadline < NOW();
SELECT COUNT(*) FROM task_assignments WHERE task_id = '<task_id>';
```
- [ ] Deadline is in past
- [ ] No assignments exist

---

### TC-402: Accepted Task Before Deadline

**Steps:**
1. Create task with deadline in 1 day
2. Child accepts task before deadline
3. Check parent dashboard after deadline passes

**Expected Result:**
- [ ] Task does NOT appear in "Deadline Expired" section
- [ ] Task appears in regular assignments (not expired)

---

## Test Suite 6: Edge Cases

### TC-501: Delete Task with Candidates

**Steps:**
1. Create single task with candidates
2. As parent, delete the task

**Expected Result:**
- [ ] Task deleted successfully
- [ ] Candidates records also deleted (CASCADE)
- [ ] No orphaned records in database

**Database Verification:**
```sql
SELECT * FROM task_candidates WHERE task_id = '<deleted_task_id>';
SELECT * FROM task_responses WHERE task_id = '<deleted_task_id>';
```
- [ ] 0 rows returned (all cleaned up)

---

### TC-502: Child Without User Profile

**Setup:**
1. Create child in database without setting `user_id`

**Steps:**
1. Try to assign single task to this child
2. Child attempts to view available tasks

**Expected Result:**
- [ ] Graceful error handling
- [ ] Clear message: "Child profile not found" or similar
- [ ] No 500 errors or crashes

---

### TC-503: Single Child Assigned (No Competition)

**Steps:**
1. Create single task assigned to only 1 child

**Expected Result:**
- [ ] Task appears in child's available tasks
- [ ] Shows "1 candidate" (not plural)
- [ ] Accept works normally
- [ ] No race condition issues

---

### TC-504: Very Large Candidate List

**Steps:**
1. Create household with 10 children
2. Create single task assigned to all 10

**Expected Result:**
- [ ] Task creation succeeds
- [ ] All 10 candidates can see task
- [ ] Accept/decline works correctly
- [ ] Performance is acceptable (< 2 seconds)

---

## Test Suite 7: UI/UX Validation

### TC-601: Mobile Responsiveness

**Steps:**
1. Open app on mobile device (or Chrome DevTools mobile emulation)
2. Navigate through all single task workflows

**Expected Result:**
- [ ] Available tasks section displays correctly on mobile
- [ ] Accept/Decline buttons are large enough (48px touch targets)
- [ ] Deadline badges don't overflow
- [ ] Failed tasks section readable on small screens
- [ ] Task creation form usable on mobile

---

### TC-602: Loading States

**Steps:**
1. Click "Accept" button
2. Observe UI during API call

**Expected Result:**
- [ ] Loading spinner appears immediately
- [ ] Button disabled during loading
- [ ] Cannot click multiple times (double-submit prevention)
- [ ] Spinner disappears when complete

---

### TC-603: Error Handling

**Steps:**
1. Disconnect from internet
2. Try to accept a task

**Expected Result:**
- [ ] Error message displayed: "Network error" or similar
- [ ] Task remains in available list
- [ ] Can retry after reconnecting
- [ ] No data corruption

---

### TC-604: Accessibility

**Steps:**
1. Use keyboard navigation only (Tab, Enter, Escape)
2. Navigate through single task workflows

**Expected Result:**
- [ ] Can tab to all interactive elements
- [ ] Can accept/decline with Enter key
- [ ] Focus indicators visible
- [ ] Screen reader compatible (test with NVDA/JAWS)

---

## Test Suite 8: Performance Testing

### TC-701: Available Tasks Load Time

**Setup:**
1. Create 20 single tasks for one child

**Steps:**
1. Log in as child
2. Measure time to load dashboard

**Expected Result:**
- [ ] Page loads in < 2 seconds
- [ ] All 20 tasks visible
- [ ] No lag when scrolling

---

### TC-702: Accept Task Response Time

**Steps:**
1. Click "Accept" button
2. Measure time until task appears in task list

**Expected Result:**
- [ ] Response time < 500ms
- [ ] Optimistic UI update feels instant
- [ ] No noticeable delay

---

### TC-703: Failed Tasks Query Performance

**Setup:**
1. Create 50 single tasks, all with all children declined

**Steps:**
1. As parent, navigate to dashboard
2. Measure time to load "Tasks Needing Attention"

**Expected Result:**
- [ ] Section loads in < 1 second
- [ ] All 50 tasks listed
- [ ] No timeout errors

---

## Test Suite 9: Security Testing

### TC-801: Cross-Household Access Prevention

**Setup:**
1. Create single task in Household A
2. Get child user ID from Household B

**Steps:**
1. Try to accept task from Household A using Household B child credentials
2. Use direct API call: `POST /api/households/A/tasks/X/accept`

**Expected Result:**
- [ ] 403 Forbidden error
- [ ] Task not assigned
- [ ] Error logged

---

### TC-802: Authorization - Child Endpoints

**Steps:**
1. Log out completely
2. Try to access: `GET /api/children/available-tasks`

**Expected Result:**
- [ ] 401 Unauthorized
- [ ] No task data returned

---

### TC-803: Authorization - Parent-Only Endpoints

**Steps:**
1. Log in as child user
2. Try to access: `GET /api/households/:id/single-tasks/failed`

**Expected Result:**
- [ ] 403 Forbidden (not authorized as parent)
- [ ] No task data returned

---

### TC-804: SQL Injection Prevention

**Steps:**
1. Try to create task with malicious name: `'; DROP TABLE tasks; --`

**Expected Result:**
- [ ] Task created with literal string as name
- [ ] No SQL injection occurs
- [ ] Database remains intact

---

## Test Suite 10: Integration Testing

### TC-901: Complete Accept Flow (End-to-End)

**Steps:**
1. Parent creates single task
2. Child 1 accepts task
3. Child 1 completes task
4. Parent approves completion
5. Child 1 receives points

**Expected Result:**
- [ ] All steps succeed
- [ ] Points awarded correctly
- [ ] Task marked complete
- [ ] No errors throughout flow

---

### TC-902: Complete Decline Flow

**Steps:**
1. Parent creates single task with 3 candidates
2. Child 1 declines
3. Child 2 declines
4. Child 3 declines
5. Parent sees failed task
6. Parent manually assigns to Child 1
7. Child 1 completes task

**Expected Result:**
- [ ] All steps succeed
- [ ] Failed task notification works
- [ ] Manual assignment works
- [ ] Task completion works normally

---

### TC-903: Deadline Expiration Flow

**Steps:**
1. Parent creates task with deadline in 1 hour
2. No child accepts
3. Wait for deadline to pass
4. Parent checks dashboard
5. Parent manually assigns
6. Task completed

**Expected Result:**
- [ ] Expired task appears in parent dashboard
- [ ] Manual assignment works
- [ ] Full flow completes successfully

---

## Browser Compatibility

Test all critical flows in:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Regression Testing

After completing all tests above, verify existing functionality still works:

- [ ] Daily tasks still generate correctly
- [ ] Repeating tasks work
- [ ] Weekly rotation unchanged
- [ ] Regular task completion flow
- [ ] Points system accurate
- [ ] User authentication
- [ ] Household management

---

## Sign-Off

**Test Summary:**

- Total test cases: _____ / _____
- Passed: _____
- Failed: _____
- Blocked: _____

**Critical Bugs Found:**
1. _______________
2. _______________
3. _______________

**Blocker Issues (must fix before deployment):**
- [ ] None found
- [ ] List blockers: _______________

**Tester Signature:** _______________
**Date:** _______________

**Approval for Deployment:**
- [ ] All tests passed
- [ ] No blocker issues
- [ ] Performance acceptable
- [ ] Security verified

**Approved by:** _______________
**Date:** _______________

---

**Testing Version:** 1.0.0
**Last Updated:** 2025-12-31
