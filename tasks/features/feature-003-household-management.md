# Feature: Household Management

## Metadata
- **ID**: feature-003
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: ready-for-implementation
- **Priority**: critical
- **Created**: 2025-12-13
- **Estimated Duration**: 3-4 days

## Description
Enable users to create, view, switch between, and manage households. Users can create new households, manage household settings, add/remove children, and switch between multiple households if they belong to more than one. This is the core multi-tenant functionality that allows families to use the application.

## User Stories
- **As a** new user, **I want** to create my first household, **so that** I can start managing chores for my family
- **As a** household admin, **I want** to manage household settings (name, preferences), **so that** I can customize the experience
- **As a** parent, **I want** to add my children's profiles, **so that** I can assign them tasks
- **As a** parent, **I want** to switch between households, **so that** I can manage multiple families (e.g., separated parents)
- **As a** household admin, **I want** to view all members, **so that** I can see who has access
- **As a** parent, **I want** to add/edit/remove child profiles, **so that** I can keep the roster current

## Requirements

### Functional Requirements
- Create new household with name
- View household details and settings
- Update household name and settings
- List all households user belongs to
- Switch active household (context switching)
- Add child profile (name, birth year)
- Edit child profile
- Remove child profile (soft delete or archive)
- View all household members
- All operations properly scoped to household_id

### Non-Functional Requirements
- **Performance**: Household operations < 100ms
- **Security**: Only household members can view/edit household
- **Accessibility**: WCAG AA compliant household management UI
- **Browser Support**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **UX**: Smooth household switching without page reload

## Acceptance Criteria
- [ ] User can create a new household
- [ ] Household is automatically assigned to creating user as admin
- [ ] User can view household details
- [ ] User can update household name
- [ ] User can list all households they belong to
- [ ] User can switch active household
- [ ] Active household persists across sessions
- [ ] User can add child profile to household
- [ ] User can edit child information
- [ ] User can remove child (with confirmation)
- [ ] Only household members can access household data
- [ ] Household switcher shows all user's households
- [ ] All tests passing
- [ ] Documentation updated

## Tasks
- [x] [task-021](../items/done/task-021-household-crud-api-endpoints.md): Implement household CRUD API endpoints (4-6h) **COMPLETED** (PR #56, 0.5h actual)
- [x] [task-022](../items/done/task-022-household-membership-middleware.md): Implement household membership validation middleware (2-3h) **COMPLETED** (PR #57, 1h actual)
- [ ] [task-023](../items/task-023-children-crud-api-endpoints.md): Implement children CRUD API endpoints (4-5h)
- [ ] [task-024](../items/task-024-household-creation-flow-frontend.md): Build household creation flow (frontend) (4-5h)
- [ ] [task-025](../items/task-025-household-settings-page.md): Build household settings page (frontend) (3-4h)
- [ ] [task-026](../items/task-026-household-switcher-component.md): Build household switcher component (3-4h)
- [ ] [task-027](../items/task-027-children-management-component.md): Build children management component (4-5h)
- [ ] [task-028](../items/task-028-household-service-frontend.md): Create household service in frontend (3-4h)
- [ ] [task-029](../items/task-029-household-state-management.md): Implement household context/state management (2-3h)
- [ ] [task-030](../items/task-030-household-management-tests.md): Write household management tests (6-8h)

**Total Estimated Duration**: 35-46 hours (5-6 days)  
**Progress**: 2/11 tasks complete (18%)

**Critical Path**: task-021 → task-022 → task-023 → task-028 → task-024

**Backend** (tasks 021-023): 10-14 hours  
**Frontend** (tasks 024-029): 19-24 hours  
**Testing** (task 030): 6-8 hours

## Dependencies
- feature-001: User authentication must be complete
- feature-002: Database schema must be in place

## Technical Notes

### API Endpoints

**Household Endpoints**
- `POST /api/households` - Create new household
  - Body: `{ name }`
  - Response: `{ id, name, role: 'admin' }`
  
- `GET /api/households` - List user's households
  - Response: `{ households: [{ id, name, role }] }`
  
- `GET /api/households/:id` - Get household details
  - Response: `{ id, name, memberCount, childrenCount, createdAt }`
  
- `PUT /api/households/:id` - Update household
  - Body: `{ name }`
  - Response: `{ id, name, updatedAt }`
  
- `GET /api/households/:id/members` - List household members
  - Response: `{ members: [{ userId, email, role, joinedAt }] }`

**Children Endpoints**
- `GET /api/households/:householdId/children` - List children
  - Response: `{ children: [{ id, name, birthYear }] }`
  
- `POST /api/households/:householdId/children` - Add child
  - Body: `{ name, birthYear }`
  - Response: `{ id, name, birthYear }`
  
- `PUT /api/households/:householdId/children/:id` - Update child
  - Body: `{ name, birthYear }`
  - Response: `{ id, name, birthYear, updatedAt }`
  
- `DELETE /api/households/:householdId/children/:id` - Remove child
  - Response: `{ success: true }`

### Frontend Components
- `HouseholdCreateComponent` - Create household form (onboarding)
- `HouseholdSettingsComponent` - Edit household details
- `HouseholdSwitcherComponent` - Dropdown to switch households
- `ChildrenManagementComponent` - List and manage children
- `ChildFormComponent` - Add/edit child form
- `HouseholdService` - API calls and household state
- `HouseholdStore` - Active household context (signal)

### State Management
- Active household ID stored in localStorage
- Household context signal shared across app
- Household switcher updates context
- All API calls automatically include active household context

## UI/UX Considerations

**Household Creation (Onboarding)**
- Simple form: "What should we call your household?"
- Placeholder: "The Smith Family"
- Auto-create on user registration flow

**Household Switcher**
- Dropdown in header/navbar
- Show household name + icon
- Click to see list of all households
- "Create New Household" button at bottom

**Household Settings Page**
- Household name (editable)
- Member list (read-only for now, invite in feature-004)
- Children management section
- Delete household button (admin only, with confirmation)

**Children Management**
- Card/list view of all children
- "Add Child" button opens modal/form
- Each child card has edit/delete actions
- Confirmation modal before deleting child

## Implementation Plan
[To be filled by Orchestrator Agent after task breakdown]

## Progress Log
- [2025-12-13 21:25] Feature created for Epic-001
- [2025-12-14 16:45] Status changed to ready-for-implementation
- [2025-12-14 16:50] Tasks broken down: 10 tasks created (35-46 hours estimated)
- [2025-12-14 16:50] Critical path identified: Backend → Service → Frontend flow

## Testing Strategy
- [ ] Unit tests for household service
- [ ] Unit tests for children service
- [ ] Integration tests for household endpoints
- [ ] Integration tests for children endpoints
- [ ] E2E tests for household creation
- [ ] E2E tests for household switching
- [ ] E2E tests for children CRUD
- [ ] Security tests (cannot access other household's data)
- [ ] Household switcher state persistence

## Related PRs
[To be added when tasks are implemented]

## Demo/Screenshots
[To be added when feature is complete]

## Lessons Learned
[To be filled after completion]
