# Epic: Parent Dashboard

## Metadata
- **ID**: epic-005
- **Status**: pending
- **Priority**: medium
- **Created**: 2025-12-13
- **Estimated Duration**: 1.5 weeks
- **Business Value**: Parent visibility and control

## Description
Provide parents with a comprehensive dashboard to monitor household task completion, see per-child performance, identify issues, and manage tasks efficiently. This gives parents the oversight they need while reducing their active management burden.

## Business Context

### Why This Epic?
- **Parent Value**: Visibility into what's happening without constant checking
- **Data-Driven**: Enables parents to adjust tasks based on actual data
- **Control**: Quick access to common management tasks
- **Trust**: Transparency builds confidence in the system

### Strategic Value
- **Parent Retention**: Good tools keep parents engaged
- **Word of Mouth**: Impressive dashboard drives recommendations
- **Future Features**: Foundation for advanced analytics
- **Upsell Opportunity**: Enhanced analytics for premium tier

## Goals
1. Provide weekly household overview at a glance
2. Show per-child completion rates and trends
3. Highlight overdue and frequently missed tasks
4. Enable quick task creation and editing
5. Support multi-household management

## Features
To be broken down by Planner Agent:
- Weekly household summary dashboard
- Per-child completion rates
- Task status overview (pending, completed, overdue)
- Quick task creation from dashboard
- Recent activity feed
- Household switcher
- Task effectiveness metrics
- Overdue task alerts
- Mobile-optimized layout

## Success Criteria
- [ ] Dashboard loads in < 2 seconds
- [ ] Shows data for current week by default
- [ ] Can switch to previous weeks
- [ ] Per-child completion percentage visible
- [ ] Overdue tasks highlighted prominently
- [ ] Can create task without leaving dashboard
- [ ] Can quickly edit/delete tasks
- [ ] Responsive design works on mobile
- [ ] Real-time or near-real-time data
- [ ] Export data capability (future)

## Risks
- **Medium**: Dashboard becomes too complex/overwhelming
- **Medium**: Performance with large amounts of data
- **Low**: Mobile layout compromises usability
- **Low**: Data latency makes dashboard feel stale

## Mitigation Strategies
- Progressive disclosure (show summary, drill down for details)
- Pagination and lazy loading for history
- Optimize database queries with proper indexes
- Cache dashboard data for performance
- Test with realistic data volumes
- Regular user testing for UX validation

## Dependencies
- Epic-002 (Task Management Core) must be complete
- Historical task completion data needed

## Timeline
- Days 1-3: Dashboard layout and weekly summary
- Days 4-6: Per-child metrics and task management
- Days 7-8: Mobile optimization and polish

## Estimated Effort
1.5 weeks with 1 frontend developer

## Acceptance Criteria
- [ ] Dashboard shows household name and current week
- [ ] Total tasks, completed, and pending counts
- [ ] Overall completion percentage for the week
- [ ] List of each child with their completion rate
- [ ] Visual indicator (color) for performance level
- [ ] List of overdue tasks with child name
- [ ] Quick access to create new task
- [ ] Can tap task to see details or edit
- [ ] Can switch between households easily
- [ ] Recent activity shows last 10 completions
- [ ] Can navigate to previous weeks
- [ ] Charts/graphs for completion trends (optional for MVP)
- [ ] Mobile-optimized for phone screens
- [ ] Loading states while fetching data
- [ ] Empty states with helpful guidance

## Dashboard Layout (Mobile-First)

### Top Section - Weekly Summary
```
Home (Household Name)              [⚙️]
Week of Dec 9-15, 2025

📊 This Week
15 Tasks Total
10 Completed (67%)
3 Pending
2 Overdue
```

### Children Performance
```
👧 Julie
▓▓▓▓▓▓▓░░░ 80% (8/10 tasks)

👦 Leon
▓▓▓░░░░░░░ 40% (2/5 tasks)
```

### Overdue Tasks
```
⚠️ 2 Tasks Overdue

Leon: Take out trash (Wed 7:00 PM)
Leon: Clean bathroom (Sun 6:00 PM)
```

### Quick Actions
```
[+ Create Task]  [View All Tasks]
```

### Recent Activity
```
🎉 Julie completed "Feed cat" - 2h ago
🎉 Julie completed "Tidy room" - 4h ago
✓ Leon completed "Dishes" - Yesterday
```

## Data Queries Needed

### Weekly Summary
```sql
SELECT 
  COUNT(*) as total_tasks,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue
FROM task_assignments
WHERE household_id = ? 
  AND week_number = ?
```

### Per-Child Completion
```sql
SELECT 
  c.id, c.name,
  COUNT(*) as assigned,
  SUM(CASE WHEN ta.status = 'completed' THEN 1 ELSE 0 END) as completed
FROM child_profiles c
LEFT JOIN task_assignments ta ON ta.child_id = c.id
WHERE c.household_id = ?
  AND ta.week_number = ?
GROUP BY c.id, c.name
```

## Future Enhancements (Post-MVP)
- Historical trends (multiple weeks)
- Export to CSV
- Task effectiveness recommendations
- Comparison with other households (anonymized)
- Custom date range selection
- Desktop-optimized layout
- Print-friendly view

## Related Work
- Depends on: Epic-002 (Task Management Core)
- Enhanced by: Epic-004 (Push Notifications) - shows notification stats
- Foundation for: Future analytics features

## Progress Log
- [2025-12-13] Epic created based on implementation plan
