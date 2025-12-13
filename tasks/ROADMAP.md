# Product Roadmap

## Overview
This roadmap outlines planned features and epics for the project. It's maintained by the Planner Agent and provides visibility into short-term and long-term development priorities.

## Current Status (December 2025)

### Active Development
- **Product**: Diddit - Multi-Tenant Household Chores App
- **Phase**: MVP Planning (Phase 1)
- **Goal**: Launch core functionality in 8 weeks

---

## Now (Current Sprint - Phase 1 MVP)

### 🎯 MVP Epics (8-week timeline)

**Epic-001: Multi-Tenant Foundation** ⭐ Critical
- **Priority**: Critical (Foundational)
- **Status**: in-progress (features defined, awaiting task breakdown)
- **Duration**: 2 weeks (12-14 days)
- **File**: [epic-001-multi-tenant-foundation.md](epics/epic-001-multi-tenant-foundation.md)
- **Description**: Multi-tenant database, authentication, household management, user invitations
- **Why Now**: Foundation for entire application - must come first
- **Dependencies**: None (foundational)
- **Features**: 4 features (41 tasks estimated)
  - [feature-001](features/feature-001-user-authentication.md): User Authentication (9 tasks, 3-4 days)
  - [feature-002](features/feature-002-multi-tenant-schema.md): Multi-Tenant Schema (10 tasks, 2-3 days)
  - [feature-003](features/feature-003-household-management.md): Household Management (11 tasks, 3-4 days)
  - [feature-004](features/feature-004-user-invitation-system.md): User Invitations (11 tasks, 2-3 days)

**Epic-002: Task Management Core** ⭐ Critical
- **Priority**: Critical (Core Product)
- **Status**: pending
- **Duration**: 2 weeks
- **File**: [epic-002-task-management-core.md](epics/epic-002-task-management-core.md)
- **Description**: Rule-based task creation, automatic assignment, completion tracking
- **Why Now**: Core value proposition of the product
- **Dependencies**: Epic-001 must be complete

**Epic-003: User Onboarding & Experience** ⭐ High
- **Priority**: High (User Activation)
- **Status**: pending
- **Duration**: 1 week
- **File**: [epic-003-user-onboarding.md](epics/epic-003-user-onboarding.md)
- **Description**: Smooth onboarding flow, guided task creation, household setup
- **Why Now**: Critical for user activation and retention
- **Dependencies**: Epic-001, Epic-002

**Epic-004: Push Notifications** ⭐ High
- **Priority**: High (Key Differentiator)
- **Status**: pending
- **Duration**: 1.5 weeks
- **File**: [epic-004-push-notifications.md](epics/epic-004-push-notifications.md)
- **Description**: Automated task reminders, notification preferences, quiet hours
- **Why Now**: Core value prop - reduces parent reminders
- **Dependencies**: Epic-002

**Epic-005: Parent Dashboard** 📊 Medium
- **Priority**: Medium (Parent Value)
- **Status**: pending
- **Duration**: 1.5 weeks
- **File**: [epic-005-parent-dashboard.md](epics/epic-005-parent-dashboard.md)
- **Description**: Weekly overview, completion rates, task management interface
- **Why Now**: Parent visibility and control
- **Dependencies**: Epic-002

### Timeline Overview
```
Week 1-2:   Epic-001 (Foundation)
Week 3-4:   Epic-002 (Task Core)
Week 5:     Epic-003 (Onboarding)
Week 6-7:   Epic-004 (Notifications)
Week 7-8:   Epic-005 (Dashboard)
```

**MVP Launch Target**: End of Week 8

---

## Next (Phase 2 - Post-MVP)

### Gamification & Engagement (Weeks 9-12)
- Points and rewards system
- Completion streaks and bonuses
- Enhanced parent analytics
- Historical trends and reporting

**Goals**: Increase motivation and long-term engagement

---

## Later (Phase 3-4)

### Phase 3: Advanced Features (Weeks 13-16)
- Task templates and sharing
- Parent approval workflow
- Advanced assignment rules (3+ children)
- Smart notification timing

### Phase 4: Growth & Monetization (Weeks 17-20)
- Premium tier features
- Social features (leaderboards, achievements)
- Platform expansion (web dashboard)
- Smart home integrations

**Strategic Focus**: Scale and sustainable business model

---

## Backlog

### Ideas & Concepts
_Features under consideration but not yet prioritized_

- To be populated as product requirements emerge
- User feedback and requests
- Technical debt items
- Nice-to-have enhancements

---

## Completed

### December 2025
- ✅ **Task-006: Registration Form Component** (2025-12-13)
  - Angular standalone component with reactive forms
  - AuthService with register/login/logout methods
  - Password strength validator and indicator
  - Client-side validation matching backend rules
  - Show/hide password toggle
  - WCAG AA compliant (ARIA, keyboard nav, focus management)
  - App root simplified (removed demo content)
  - Frontend agent documentation enhanced with best practices
  - [PR #26](https://github.com/tidemann/st44-home/pull/26)
- ✅ **Task-005: Authentication Middleware** (2025-12-13)
  - FastifyRequest type extension with user property
  - authenticateUser preHandler hook for route protection
  - JWT token extraction from Authorization Bearer header
  - Token signature and expiration verification
  - Token type validation (access vs refresh)
  - User context attachment to requests
  - Protected endpoints (logout, test endpoint)
  - [PR #25](https://github.com/tidemann/st44-home/pull/25)
- ✅ **Task-004: Token Refresh Endpoint** (2025-12-13)
  - POST /api/auth/refresh endpoint
  - JWT token verification and validation
  - Token type checking (refresh vs access)
  - User existence validation
  - Security-focused error handling
  - [PR #24](https://github.com/tidemann/st44-home/pull/24)
- ✅ **Task-003: Login API Endpoint with JWT Authentication** (2025-12-13)
  - POST /api/auth/login endpoint
  - JWT access tokens (1h) and refresh tokens (7d)
  - Timing-safe password comparison
  - Security-focused error handling
  - [PR #23](https://github.com/tidemann/st44-home/pull/23)
- ✅ **Task-002: Registration API Endpoint** (2025-12-13)
  - POST /api/auth/register endpoint
  - Password hashing with bcrypt
  - Email validation
  - [PR #22](https://github.com/tidemann/st44-home/pull/22)
- ✅ **Task-001: Create Users Table Schema** (2025-12-13)
  - Users table with OAuth support
  - Migration system infrastructure
  - Database schema tracking
  - [PR #21](https://github.com/tidemann/st44-home/pull/21)
- ✅ Project infrastructure setup
  - Monorepo structure (frontend + backend)
  - Docker Compose setup
  - PostgreSQL database
  - CI/CD pipeline
  - Dynamic API URL configuration
- ✅ Agent system implementation
  - 7 agent specifications
  - 6 workflow prompt files (including merge-pr)
  - Living documentation (7 AGENTS.md files)
  - Work hierarchy and templates
  - Database migration guide
- 📋 Product planning
  - Diddit product defined
  - Implementation plan created
  - 5 MVP epics planned
  - Feature-001 broken down into 10 tasks

---

## Prioritization Framework

Features are prioritized based on:
1. **User Impact**: How many users benefit and how much
2. **Business Value**: Revenue, retention, efficiency
3. **Strategic Alignment**: Fits vision and goals
4. **Technical Feasibility**: Complexity, risk, dependencies
5. **Effort**: Development time and resources

**Formula**: `Priority = (User Impact × Business Value × Strategic Alignment) / (Effort × Risk)`

---

## Dependencies

### Technical Prerequisites
- ✅ Backend API framework (Fastify)
- ✅ Frontend framework (Angular 21+)
- ✅ Database (PostgreSQL 17)
- ✅ Containerization (Docker)
- ✅ Proxy configuration (dev + production)

### Organizational Prerequisites
- Product vision and strategy (to be defined)
- User research and personas (to be conducted)
- Business metrics and KPIs (to be established)

---

## How to Use This Roadmap

### For Planner Agent
1. Review this roadmap regularly
2. Add new features/epics as they're identified
3. Move items between sections as priorities change
4. Update status and progress
5. Document completed work

### For Orchestrator Agent
1. Pick features from "Now" section
2. Break them down into tasks
3. Coordinate implementation
4. Update status as work progresses
5. Move completed items to "Completed" section

### For Stakeholders
1. Understand current priorities
2. See what's coming next
3. Provide feedback on direction
4. Suggest new features for consideration

--✅ task-005: Authentication middleware (PR #25) - **COMPLETED**
- -

## Changelog

### 2025-12-13
- ✅ task-001: Users table schema with OAuth support (PR #21) - **COMPLETED**
- ✅ task-002: Registration API endpoint with bcrypt (PR #22) - **COMPLETED**
- ✅ task-003: Login API endpoint with JWT authentication (PR #23) - **COMPLETED**
- ✅ task-004: Token refresh endpoint (PR #24) - **COMPLETED**
- Created initial roadmap structure
- Documented completed infrastructure work
- Established prioritization framework

---

## Notes

This is a living document that will evolve as:
- Business requirements become clearer
- User needs are identified
- Technical capabilities expand
- Market conditions change
- Feedback is received

The roadmap balances:
- Quick wins vs. long-term strategic initiatives
- User value vs. technical foundation
- Innovation vs. stability
- Scope vs. resources
