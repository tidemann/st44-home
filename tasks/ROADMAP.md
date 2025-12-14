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

### ️ CRITICAL - Quality Infrastructure

**Epic-006: Testing & Quality Assurance Infrastructure** 🛡️ PREVENT PRODUCTION BUGS
- **Priority**: Critical (Deployment Safety)
- **Status**: pending
- **Duration**: 1.5 weeks (9-11 days)
- **File**: [epic-006-testing-quality-assurance.md](epics/epic-006-testing-quality-assurance.md)
- **Description**: E2E testing, database validation, CI/CD quality gates to prevent production failures
- **Why Now**: Production incident (feature-005) showed need for comprehensive testing before deployment
- **Goal**: ZERO critical bugs reach production - 100% of critical flows tested
- **Features**: 4 features (E2E tests, DB validation, CI gates, performance tests)
  - [feature-006](features/feature-006-e2e-testing-infrastructure.md): E2E Testing Infrastructure (5-6 days) **HIGH PRIORITY**
  - feature-007: Database Testing & Schema Validation (2-3 days)
  - feature-008: CI/CD Quality Gates (2 days)
  - feature-009: Performance & Load Testing (2 days, optional for MVP)

**Feature-006: E2E Testing Infrastructure** ⚡ REGISTRATION MUST NEVER FAIL
- **Priority**: Critical (Prevents Production Bugs)
- **Status**: ready-for-implementation (tasks broken down)
- **Duration**: 5-6 days (35-46 hours)
- **File**: [feature-006-e2e-testing-infrastructure.md](features/feature-006-e2e-testing-infrastructure.md)
- **Description**: Playwright E2E tests for critical user flows, especially registration
- **Why Now**: Would have caught production bug in PR checks before deployment
- **Coverage**: Registration, login, database validation, OAuth (if implemented)
- **Impact**: No more production failures due to missing schema or broken auth flows
- **Tasks**: 9 tasks created (027-035) [PR #40 merged]
  - [ ] task-027: Install and configure Playwright (4-6h)
  - [ ] task-028: Set up test database (4-6h)
  - [ ] task-029: Create test fixtures and utilities (4-6h)
  - [ ] task-030: Registration flow E2E tests ⚠️ **CRITICAL** (6-8h)
  - [ ] task-031: Login flow E2E tests (4-6h)
  - [ ] task-032: Database validation tests (3-4h)
  - [ ] task-033: Google OAuth E2E tests (optional) (4-5h)
  - [ ] task-034: CI/CD integration ⚠️ **CRITICAL** (4-6h)
  - [ ] task-035: E2E testing documentation (2-3h)
- **Critical Path**: 027 → 028 → 029 → 030 → 034
- **Dependencies**: feature-005 complete ✅

### 🎯 MVP Epics (8-week timeline)

**Epic-001: Multi-Tenant Foundation** ⭐ Critical
- **Priority**: Critical (Foundational)
- **Status**: in-progress (1/4 features complete, 1/4 ready for implementation)
- **Duration**: 2 weeks (12-14 days)
- **File**: [epic-001-multi-tenant-foundation.md](epics/epic-001-multi-tenant-foundation.md)
- **Description**: Multi-tenant database, authentication, household management, user invitations
- **Why Now**: Foundation for entire application - must come first
- **Dependencies**: None (foundational)
- **Features**: 4 features (41 tasks estimated)
  - ✅ [feature-001](features/done/feature-001-user-authentication.md): User Authentication (10 tasks, 2 days) **COMPLETED**
  - [feature-002](features/feature-002-multi-tenant-schema.md): Multi-Tenant Schema (10 tasks, 2-3 days) **READY FOR IMPLEMENTATION**
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
Week 0:       Feature-005 (Production Fix - IMMEDIATE) + Feature-006 (E2E Tests)
Week 1-2:     Epic-001 (Foundation)
Week 3-4:     Epic-002 (Task Core)
Week 5:       Epic-003 (Onboarding)
Week 6-7:     Epic-004 (Notifications)
Week 7-8:     Epic-005 (Dashboard)
Week 1-8:     Epic-006 (Testing QA - runs in parallel)
```

**MVP Launch Target**: End of Week 8 (with comprehensive test coverage)

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

#### Features
- 🎉 **Feature-005: Production Database Deployment & Migration System** (2025-12-14) **COMPLETED**
  - Fixed production 500 errors - database schema now deployed correctly
  - Created automated migration system embedded in Docker image
  - Added migration runner script with idempotent execution
  - Integrated migrations into deployment workflow
  - Added comprehensive database health check endpoint
  - Documented deployment process and production architecture
  - Fixed deployment health checks to use correct port (3000)
  - Verified production operational: all migrations applied, registration working
  - All 6 tasks completed in 1 day (emergency fix + prevention)
  - [See all related PRs](#tasks) #38, #39 + deployment fixes
- 🎉 **Feature-001: User Authentication System** (2025-12-14) **COMPLETED**
  - Secure email/password authentication with JWT tokens
  - Google OAuth "Sign in with Google" integration
  - Registration and login forms with validation
  - AuthService with token management and state signals
  - Protected routes with authentication middleware
  - Comprehensive testing (105 tests, 100% passing)
  - All 10 tasks completed in 2 days (vs 4-5 days estimated)
  - [See all related PRs](#tasks) #21-#29

#### Tasks
- ✅ **Task-023: Apply Migrations to Production** (2025-12-14)
  - Verified all 8 migrations applied successfully
  - Database health check: HEALTHY
  - All critical tables exist and operational
  - User registration tested and working (201 response)
  - Production fully functional
  - [Automated via deployment workflow]
- ✅ **Task-010: Google OAuth Integration** (2025-12-14)
  - Backend: POST /api/auth/google endpoint with google-auth-library
  - Backend: ID token verification and user account creation
  - Backend: JWT token generation for OAuth users
  - Frontend: Google Identity Services integration
  - Frontend: Google Sign-In buttons on login and register pages
  - Frontend: loginWithGoogle() method in AuthService
  - Environment: GOOGLE_CLIENT_ID configuration
  - Automatic user account creation on first Google login
  - OAuth users linked by email if account exists
  - ESLint fixes for proper TypeScript typing
  - [PR #29](https://github.com/tidemann/st44-home/pull/29)
- ✅ **Task-009: Authentication Tests** (2025-12-13)
  - Backend: 30 integration tests (100% passing)
  - Frontend: 75 unit tests (100% passing)
  - Registration, login, token refresh, logout, middleware tests
  - Security tests: SQL injection, timing attacks, password hashing
  - AuthService, LoginComponent, RegisterComponent test coverage
  - Refactored server.ts for testability
  - Converted tests from Jasmine to Vitest (Angular 21+)
  - [PR #28](https://github.com/tidemann/st44-home/pull/28)
- ✅ **Task-007: Login Form Component** (2025-12-13)
  - Angular standalone component with separated HTML/CSS/TS files
  - Reactive form with email/password validation
  - Remember me checkbox (localStorage vs sessionStorage)
  - Show/hide password toggle
  - Success message after registration redirect
  - Return URL support for auth guards
  - WCAG AA compliant (ARIA, keyboard nav, focus management)
  - AuthService updated to support token persistence preferences
  - [PR #27](https://github.com/tidemann/st44-home/pull/27)
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

## Changelog

### 2025-12-14 (Feature-006 Ready! 📋)
- 📋 **PR #40 MERGED** - Feature-006 broken down into 9 implementation tasks
  - Created task-027: Install and configure Playwright (4-6h)
  - Created task-028: Set up test database and migration runner (4-6h)
  - Created task-029: Create test fixtures and utilities (4-6h)
  - Created task-030: Registration flow E2E tests (6-8h) ⚠️ **CRITICAL**
  - Created task-031: Login flow E2E tests (4-6h)
  - Created task-032: Database validation tests (3-4h)
  - Created task-033: Google OAuth E2E tests (4-5h, optional)
  - Created task-034: CI/CD integration (4-6h) ⚠️ **CRITICAL**
  - Created task-035: E2E testing documentation (2-3h)
  - **Total**: 35-46 hours (5-6 days)
  - **Critical Path**: 027 → 028 → 029 → 030 → 034
  - **Status**: ready-for-implementation
  - **Next**: Start with task-027 (Playwright setup)

### 2025-12-14 (Production Restored! 🎉)
- ✅ **PRODUCTION OPERATIONAL** - Feature-005 Complete!
  - Deployment succeeded with correct health checks (port 3000)
  - All 8 migrations applied successfully in production
  - Database health check: HEALTHY (response time 11ms)
  - User registration tested and working (created test user successfully)
  - All critical tables verified: users, households, household_members, children, tasks, task_assignments, task_completions
  - **IMPACT**: Users can now register accounts, production is fully functional
- ✅ **Task-023 Complete** - Production database operational
  - Verification: Database health endpoint returns healthy status
  - Verification: All 8 migrations applied (000, 001, 011-016)
  - Verification: Registration endpoint working (201 response)
  - Automated migration system working as designed
- 🔧 **Deployment Workflow Fixed** - Health checks corrected
  - Fixed health check to use correct port (localhost:3000 instead of localhost:80)
  - Documented production architecture (Frontend:3001, Backend:3000, DB:5432)
  - Simplified health check logic (removed unnecessary diagnostics)
  - Deployment CI passing reliably

### 2025-12-14 (Late - PR #39 Merged)
- 🎉 **PR #39 MERGED** - Root cause fixed: migrations now embedded in Docker image
  - Modified `docker/postgres/Dockerfile` to include migrations in image
  - Updated deployment workflow to run migrations via `docker exec`
  - Made migration script detect container vs host environment
  - **IMPACT**: Future deployments will auto-apply migrations correctly
  - **REMAINING**: task-023 still pending (manual fix to restore current production)
  - New database image building in CI with migrations embedded
  - After next deployment, migration system fully operational

### 2025-12-14 (Late - PR #38 Merged)
- 🎉 **PR #38 MERGED** - Database migration automation deployed
  - Migration runner script created (`docker/postgres/run-migrations.sh`)
  - Deploy workflow updated to run migrations automatically
  - Health check endpoint added (`GET /health/database`)
  - Comprehensive deployment documentation created (`docs/DEPLOYMENT.md`)
  - 5 of 6 tasks completed (tasks 021, 022, 024, 025, 026)
  - **PRODUCTION STILL BROKEN** - task-023 pending (manual migration application)
  - Future deployments will auto-migrate (prevention complete)
  - Current production needs manual intervention to restore service

### 2025-12-14 (Planning - E2E Testing)
- 🛡️ **Epic-006: Testing & Quality Assurance Infrastructure** - CREATED
  - Response to production incident (feature-005)
  - Goal: ZERO critical bugs reach production
  - 4 features: E2E tests, DB validation, CI gates, performance
  - Timeline: 1.5 weeks, runs in parallel with feature development
- ⚡ **Feature-006: E2E Testing Infrastructure** - CREATED
  - Playwright E2E testing for critical user flows
  - PRIMARY FOCUS: Registration flow must never fail in production
  - Coverage: Registration, login, database validation, OAuth
  - 9 tasks estimated (5-6 days)
  - Dependencies: Requires feature-005 merged first
  - Prevention: Would have caught production bug in PR checks
- 📋 **Roadmap Updated**
  - Added epic-006 to "Now" section (critical priority)
  - Added feature-006 to "Now" section (high priority)
  - Updated timeline to show Week 0 for urgent work
  - MVP timeline updated: Week 1-8 plus testing infrastructure

### 2025-12-14 (Late)
- 🚨 **PRODUCTION EMERGENCY** - Users cannot register, 500 errors
  - Error: `relation "users" does not exist`
  - Root cause: Migrations never applied to production database
  - Created **feature-005: Production Database Deployment System**
  - Created 6 tasks for immediate fix + automation (tasks 021-026)
  - Task-023 is IMMEDIATE FIX to restore service
  - Tasks 022, 024 automate migrations in deployment
  - Task-025 adds health checks to prevent recurrence
  - **BLOCKING ALL OTHER WORK** until production is restored
  - Feature-002 (Multi-Tenant Schema) paused until fix deployed

### 2025-12-14
- 📋 **feature-002: Multi-Tenant Schema** - Tasks broken down (10 tasks ready)
  - Households, household_members, children, tasks, task_assignments, task_completions tables
  - Performance indexes and row-level security
  - Schema documentation with ERD diagram
  - Migration rollback scripts
  - Status: ready-for-implementation
- 🎉 **feature-001: User Authentication System** - **FEATURE COMPLETED!**
  - All 10 tasks completed in 2 days (vs 4-5 days estimated)
  - Email/password authentication fully functional
  - Google OAuth integration live
  - 105 tests passing (100% success rate)
  - PRs #21-#29 merged to main
- ✅ task-010: Google OAuth integration (PR #29) - **COMPLETED**

### 2025-12-13
- ✅ task-009: Authentication tests (PR #28) - **COMPLETED**
- ✅ task-007: Login form component (PR #27) - **COMPLETED**
- ✅ task-006: Registration form component (PR #26) - **COMPLETED**
- ✅ task-005: Authentication middleware (PR #25) - **COMPLETED**
- ✅ task-004: Token refresh endpoint (PR #24) - **COMPLETED**
- ✅ task-003: Login API endpoint with JWT authentication (PR #23) - **COMPLETED**
- ✅ task-002: Registration API endpoint with bcrypt (PR #22) - **COMPLETED**
- ✅ task-001: Users table schema with OAuth support (PR #21) - **COMPLETED**
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
