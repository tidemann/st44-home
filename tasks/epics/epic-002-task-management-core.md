# Epic: Task Management Core

## Metadata
- **ID**: epic-002
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-13
- **Estimated Duration**: 2 weeks
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
To be broken down by Planner Agent:
- Task template creation (CRUD)
- Rule engine for task assignment
  - Odd/even week rotation
  - Repeating tasks on specific days
  - Daily tasks
- Task assignment generation service
- Task list views (parent and child perspectives)
- Task completion functionality
- Task history and tracking

## Success Criteria
- [ ] Parents can create tasks with detailed rules
- [ ] Rule engine correctly calculates assignments
- [ ] Odd/even week rotation works accurately
- [ ] Repeating tasks generate correct instances
- [ ] Children see only their assigned tasks
- [ ] Task completion updates immediately
- [ ] Parents can see all household tasks
- [ ] Task history preserved correctly
- [ ] System handles week boundaries correctly
- [ ] No duplicate task assignments created

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
- [ ] Can create task with title, description, rules
- [ ] Can specify odd/even week rotation
- [ ] Can specify repeating days (Mon, Wed, Fri)
- [ ] Can assign task to specific child or use rotation
- [ ] Assignment generation runs automatically
- [ ] Children see correct tasks for current date/week
- [ ] Marking task complete updates status immediately
- [ ] Parents can override automatic assignments
- [ ] Can edit task rules (affects future assignments)
- [ ] Can delete tasks (preserves history)
- [ ] UI clearly shows task rules and assignment
- [ ] Mobile-optimized task list and detail views

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
