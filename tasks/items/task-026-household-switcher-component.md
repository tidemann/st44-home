# Task: Build Household Switcher Component

## Metadata
- **ID**: task-026
- **Feature**: feature-003 - Household Management
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: in-progress
- **Priority**: high
- **Created**: 2025-12-14
- **Assigned Agent**: frontend
- **Estimated Duration**: 3-4 hours

## Description
Build a household switcher component that allows users to view and switch between multiple households they belong to. This component should appear in the app header/navigation and show the currently active household with an option to switch.

## Requirements
- Dropdown/menu component showing all user's households
- Display active household prominently
- Click to switch to different household
- Update active household in localStorage and state
- Refresh UI to reflect new active household
- Show user's role in each household (admin/parent)
- Responsive design for mobile and desktop
- WCAG AA compliant

## Acceptance Criteria
- [ ] HouseholdSwitcherComponent created
- [ ] Lists all households user belongs to
- [ ] Shows currently active household
- [ ] Click household to switch active
- [ ] Updates localStorage on switch
- [ ] Triggers UI update across app
- [ ] Shows role badge for each household
- [ ] Keyboard accessible (arrow keys, enter, esc)
- [ ] WCAG AA compliant
- [ ] Works on mobile and desktop

## Dependencies
- task-021, task-022, task-023, task-024

## Progress Log
- [2025-12-14 16:45] Task created from feature-003 breakdown
