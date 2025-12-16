# Task: Build Parent Dashboard Component

## Metadata
- **ID**: task-062
- **Feature**: feature-012 - Landing Pages After Login
- **Epic**: epic-003 - User Onboarding & Experience
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-16
- **Assigned Agent**: frontend
- **Estimated Duration**: 4-6 hours

## Description
Build the parent dashboard component that displays after login for admin/parent users. Shows household overview with week summary, children completion rates, and quick action buttons.

## Requirements
- Display household name in header
- Week summary card: total tasks, completed, pending, overdue, completion rate
- Children list with progress bars showing completion percentage
- Quick action buttons: Create Task (placeholder), View Settings
- Empty states for: no tasks, no children
- Loading state while fetching data
- Error state with retry option
- Mobile-first responsive design
- WCAG AA accessibility

## Acceptance Criteria
- [ ] ParentDashboardComponent created with standalone pattern
- [ ] Uses signals for state management
- [ ] Displays household name
- [ ] Shows week summary statistics
- [ ] Shows per-child completion rates with progress bars
- [ ] Quick action buttons present (Create Task, View Settings)
- [ ] Empty state: "No tasks this week"
- [ ] Empty state: "Add children to get started"
- [ ] Loading state shown while fetching
- [ ] Error state with retry button
- [ ] Responsive design (mobile-first)
- [ ] WCAG AA compliant
- [ ] ChangeDetectionStrategy.OnPush

## Dependencies
- task-059 (Dashboard API) ✅
- task-064 (Dashboard service)

## Progress Log
- [2025-12-16] Task created from feature-012 breakdown
