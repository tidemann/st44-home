# Task: Build Children Management Component

## Metadata
- **ID**: task-027
- **Feature**: feature-003 - Household Management
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: in-progress
- **Priority**: high
- **Created**: 2025-12-14
- **Assigned Agent**: frontend
- **Estimated Duration**: 4-5 hours

## Description
Create an Angular component for managing children within a household. This component allows parents and admins to view, add, edit, and remove child profiles. It should be integrated into the household settings page and provide full CRUD operations for children. Each child has a name and birth year, and operations are scoped to the active household.

## Requirements

### Functional
- Display list of all children in the household
- Add new child form with validation
- Edit existing child inline or in modal
- Remove child with confirmation dialog
- Show empty state when no children
- Validate name (required, min 2 chars)
- Validate birth year (required, 4 digits, between 2000-current year)
- Real-time form validation feedback
- Success/error messages for operations

### Technical
- Angular standalone component with signals
- Use ChildrenService for API calls (to be created)
- Reactive forms with FormBuilder
- WCAG AA accessibility compliance
- Responsive design (mobile + desktop)
- Proper error handling and user feedback

### UI/UX
- Clean, simple list of children
- Inline add form or modal
- Edit/delete actions per child
- Confirmation before deletion
- Loading states during operations
- Success messages auto-clear after 3 seconds

## Acceptance Criteria
- [ ] Component displays list of children from active household
- [ ] Empty state shown when no children exist
- [ ] Add child form validates name and birth year
- [ ] Add child creates new child via API
- [ ] Edit child updates existing child via API
- [ ] Delete child removes child with confirmation
- [ ] All operations show loading states
- [ ] Success/error messages displayed appropriately
- [ ] Component is WCAG AA compliant
- [ ] Component is fully responsive
- [ ] Component integrates into household settings page
- [ ] All TypeScript types properly defined
- [ ] Code formatted with Prettier
- [ ] Tests pass (linting, build)

## Dependencies
- task-021, task-022, task-023, task-024

## Progress Log
- [2025-12-14 16:45] Task created from feature-003 breakdown
