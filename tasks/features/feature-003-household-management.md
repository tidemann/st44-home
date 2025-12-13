# Feature: Household Management

## Metadata
- **ID**: feature-003
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
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
**⚠️ Feature must be broken down into tasks by Orchestrator Agent before implementation**

- [ ] **task-020**: Implement household CRUD API endpoints
- [ ] **task-021**: Implement household membership validation middleware
- [ ] **task-022**: Implement children CRUD API endpoints
- [ ] **task-023**: Create household service in backend
- [ ] **task-024**: Build household creation flow (frontend)
- [ ] **task-025**: Build household settings page (frontend)
- [ ] **task-026**: Build household switcher component
- [ ] **task-027**: Build children management component
- [ ] **task-028**: Create household service in frontend
- [ ] **task-029**: Implement household context/state management
- [ ] **task-030**: Write household management tests

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
