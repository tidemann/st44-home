# Task: Create Dashboard Summary API Endpoint

## Metadata
- **ID**: task-059
- **Feature**: feature-012 - Landing Pages After Login
- **Epic**: epic-003 - User Onboarding & Experience
- **Status**: complete
- **Priority**: high
- **Created**: 2025-12-16
- **Assigned Agent**: backend
- **Estimated Duration**: 3-4 hours

## Description
Create a backend API endpoint that returns dashboard summary data for parents. The endpoint provides week summary stats (total/completed/pending/overdue tasks), per-child completion rates, and household information needed for the parent dashboard.

## Requirements
- GET /api/households/:householdId/dashboard endpoint
- Requires authentication and household membership
- Returns week summary (total, completed, pending, overdue, completion rate)
- Returns per-child task statistics with completion percentages
- Handles households with no tasks (empty state)
- Handles households with no children (empty state)

## API Specification

**Endpoint**: `GET /api/households/:householdId/dashboard`

**Headers**:
- Authorization: Bearer <token> (required)

**Response** (200):
```json
{
  "household": { 
    "id": "uuid", 
    "name": "The Smith Family" 
  },
  "weekSummary": {
    "total": 15,
    "completed": 10,
    "pending": 3,
    "overdue": 2,
    "completionRate": 67
  },
  "children": [
    { 
      "id": "uuid", 
      "name": "Julie", 
      "tasksCompleted": 8, 
      "tasksTotal": 10, 
      "completionRate": 80 
    }
  ]
}
```

**Response** (401): Unauthorized
**Response** (403): Not a household member

## Acceptance Criteria
- [x] GET /api/households/:id/dashboard endpoint created
- [x] Returns household name and ID
- [x] Returns week summary with correct counts
- [x] Returns per-child statistics
- [x] Handles empty states (0 tasks, 0 children)
- [x] Requires authentication
- [x] Requires household membership
- [x] Returns 403 for non-members
- [x] Tests written (4 tests added)

## Dependencies
- feature-001 (Authentication) ✅
- feature-002 (Multi-tenant schema) ✅
- feature-003 (Household management) ✅

## Progress Log
- [2025-12-16] Task created from feature-012 breakdown
