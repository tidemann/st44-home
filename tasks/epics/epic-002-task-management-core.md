# Epic: Task Management Core

## Metadata
- **ID**: epic-002
- **Status**: completed
- **Priority**: critical
- **Created**: 2025-12-13
- **Completed**: 2025-12-20
- **Estimated Duration**: 2 weeks
- **Actual Duration**: 7 days
- **Business Value**: Core product functionality

## Description
Implement the heart of the application: rule-based task creation, automatic assignment generation, and task completion tracking. This epic delivers the primary value proposition of automated household chore management.

## Business Context

### Why This Epic?
This is the core product feature that:
- Automates task assignment (key differentiator)
- Reduces parent workload (primary benefit)
- Enables children to see their responsibilities
- Tracks completion for accountability

### Strategic Value
- **Product Viability**: Without this, there's no product
- **User Retention**: Core value delivery ensures continued use
- **Competitive Advantage**: Rule-based automation vs. manual assignment
- **Scalability**: Once built, handles unlimited tasks per household

## Goals
1. Enable parents to create tasks with assignment rules
2. Automatically generate task assignments based on rules
3. Allow children to view and complete their assigned tasks
4. Track task completion and history
5. Support multiple task types (weekly rotation, repeating)

## Features
- [x] [feature-013](../features/done/feature-013-task-template-management.md): Task Template Management (completed) - 4-5 days ✅
  - CRUD operations for task templates with assignment rules
  - Rule configuration UI (weekly rotation, repeating, daily)
  - Task activation/deactivation
- [x] [feature-014](../features/done/feature-014-task-assignment-rule-engine.md): Task Assignment Rule Engine (completed) - 5-6 days ✅
  - Automated assignment generation service
  - ISO week-based rotation logic
  - Repeating task scheduling
  - Idempotent execution
- [x] [feature-015](../features/done/feature-015-task-viewing-completion.md): Task Viewing & Completion (completed) - 4-5 days ✅
  - 6/6 tasks complete (100%) 🎉
  - Task-094 (Assignment Query API) completed ✅
  - Task-095 (Completion & Reassignment API) completed ✅
  - Task-096 (Frontend TaskService) completed ✅
  - Task-097 (Child Task List Component) completed ✅
  - Task-098 (Parent Task Dashboard) completed ✅
  - Task-099 (Integration Tests) completed ✅
  - Child task list view (today, week)
  - Parent task dashboard (all children)
  - Task completion functionality
  - Assignment reassignment

## Success Criteria
- [x] Parents can create tasks with detailed rules
- [x] Rule engine correctly calculates assignments
- [x] Odd/even week rotation works accurately
- [x] Repeating tasks generate correct instances
- [x] Children see only their assigned tasks
- [x] Task completion updates immediately
- [x] Parents can see all household tasks
- [x] Task history preserved correctly
- [x] System handles week boundaries correctly
- [x] No duplicate task assignments created

## Risks
- **High**: Rule engine complexity and edge cases
- **Medium**: Performance with many tasks per household
- **Medium**: Week number calculation inconsistencies
- **Low**: UI confusion about assignment rules

## Mitigation Strategies
- Extensive unit tests for rule engine
- Clear documentation of rule behavior
- UI shows preview of assignments
- Performance testing with realistic data volumes
- Use ISO 8601 week numbering standard

## Dependencies
- Epic-001 (Multi-Tenant Foundation) must be complete
- Household and child profile data must exist

## Timeline
- Week 3: Task templates, basic assignment
- Week 4: Rule engine, completion tracking, testing

## Estimated Effort
2 weeks with 1 backend developer + 1 frontend developer

## Acceptance Criteria
- [x] Can create task with title, description, rules
- [x] Can specify odd/even week rotation
- [x] Can specify repeating days (Mon, Wed, Fri)
- [x] Can assign task to specific child or use rotation
- [x] Assignment generation runs automatically
- [x] Children see correct tasks for current date/week
- [x] Marking task complete updates status immediately
- [x] Parents can override automatic assignments
- [x] Can edit task rules (affects future assignments)
- [x] Can delete tasks (preserves history)
- [x] UI clearly shows task rules and assignment
- [x] Mobile-optimized task list and detail views

## Technical Considerations

### Rule Engine Design
```typescript
interface TaskRule {
  type: 'weekly_rotation' | 'repeating' | 'daily';
  rotationType?: 'odd_even_week' | 'alternating';
  repeatDays?: number[]; // 0=Sunday, 1=Monday, etc.
  assignedChildren?: number[]; // Child IDs
}
```

### Assignment Generation
- Runs daily via cron job
- Generates assignments for next 7 days
- Idempotent (safe to re-run)
- Logs generation for debugging

### Database Schema
- `tasks` table: Template/rule definition
- `task_assignments` table: Specific instances
- Indexed by date and child_id for fast queries

## Related Work
- Depends on: Epic-001 (Multi-Tenant Foundation)
- Leads to: Epic-004 (Push Notifications)
- Enhances: Epic-005 (Parent Dashboard)

## Progress Log
- [2025-12-13] Epic created based on implementation plan
- [2025-12-19 10:45] Features defined by Planner Agent:
  - feature-013: Task Template Management
  - feature-014: Task Assignment Rule Engine
  - feature-015: Task Viewing & Completion
  - Total estimated: 13-16 days
- [2025-12-19 23:40] Feature-013 completed (100%) - Task Template Management ✅
- [2025-12-19 23:40] Feature-014 completed (100%) - Task Assignment Rule Engine ✅
- [2025-12-19 23:40] Epic progress: 2/3 features complete (67%)
- [2025-12-20 01:35] Feature-015 in progress (17%) - Task-094 (Assignment Query API) completed and merged (PR #118)
- [2025-12-20 02:00] Feature-015 in progress (33%) - Task-095 (Completion & Reassignment API) completed and merged (PR #119)
- [2025-12-20 10:45] Feature-015 in progress (50%) - Task-096 (Frontend TaskService) completed and merged (PR #122)
- [2025-12-20 11:30] Feature-015 in progress (67%) - Task-097 (Child Task List Component) completed and merged (PR #123)
- [2025-12-20 11:45] Feature-015 in progress (83%) - Task-098 (Parent Task Dashboard) completed and merged (PR #124)
- [2025-12-20 13:23] Feature-015 completed (100%) - Task-099 (Integration Tests) completed and merged (PR #125) ✅
- [2025-12-20 13:25] **EPIC-002 COMPLETE** 🎉 All 3 features done (100%)
- [2025-12-20 13:25] Epic status changed to completed
- [2025-12-20 13:25] **Achievement**: Complete end-to-end task management system operational in 7 days (vs 14 days estimated)!
