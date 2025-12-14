# Task: Build Household Settings Page (Frontend)

## Metadata
- **ID**: task-025
- **Feature**: feature-003 - Household Management
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: medium
- **Created**: 2025-12-14
- **Assigned Agent**: frontend
- **Estimated Duration**: 3-4 hours

## Description
Build a household settings page where household admins can view and edit household details, see member list, and manage children. This is the central management interface for household configuration.

## Requirements
- Display household name (editable by admin)
- List all household members with roles
- Children management section (add/edit/remove)
- Admin-only edit capabilities
- Responsive design
- WCAG AA compliant

## Acceptance Criteria
- [ ] HouseholdSettingsComponent created
- [ ] Display current household name
- [ ] Edit household name (admin only)
- [ ] Display list of members with roles
- [ ] Integrate ChildrenManagementComponent
- [ ] Save button disabled for non-admins
- [ ] Success/error feedback
- [ ] WCAG AA compliant

## Dependencies
- task-021: GET /api/households/:id, PUT /api/households/:id
- task-023: Children CRUD endpoints
- task-027: ChildrenManagementComponent
- task-028: HouseholdService

## Progress Log
- [2025-12-14 16:45] Task created from feature-003 breakdown
