# Diddit - Implementation Plan

**Created**: December 13, 2025  
**Status**: Planning Phase  
**Product**: Multi-Tenant Household Chores Management App

---

## Executive Summary

This document outlines the high-level implementation plan for Diddit, a mobile-first application for managing household chores with rule-based task assignment, push notifications, and gamification.

### Implementation Approach

- **Phased delivery**: MVP first, iterate based on feedback
- **Mobile-first**: Optimized for iOS/Android, web access optional
- **Multi-tenant from day one**: Proper data isolation from the start
- **Progressive enhancement**: Core features first, advanced capabilities later

---

## Phase 1: MVP (Weeks 1-8)

**Goal**: Launch with core functionality that demonstrates value and proves the multi-tenant architecture.

### Week 1-2: Foundation & Data Model

**Backend Infrastructure**
- Multi-tenant database schema design
- Tenant isolation middleware
- Authentication system (JWT-based)
- Basic REST API structure

**Database Schema**
- Households (tenants)
- Users & Household Memberships (with roles)
- Child Profiles
- Tasks (templates)
- Task Assignments (instances)
- Task Completions

**Deliverables**
- PostgreSQL schema with proper indexes and constraints
- Tenant-scoped API endpoints
- Authentication endpoints (register, login, token refresh)

### Week 3-4: Core Task Management

**Backend**
- Task CRUD operations (create, read, update, delete)
- Rule engine for task assignment
  - Odd/even week calculation
  - Repeating task scheduling
- Task assignment generation (weekly/daily)
- Task completion endpoints

**Frontend (Mobile)**
- Task list view (for children)
- Task detail view
- Mark task as complete
- Basic navigation structure

**Deliverables**
- Rule-based task assignment working
- Children can view and complete tasks
- Parents can create tasks with rules

### Week 5-6: User Management & Households

**Backend**
- Household creation and management
- User invitation system (invite codes/links)
- Child profile management
- Role-based access control

**Frontend**
- Onboarding flow
  - Create account
  - Create/join household
  - Add children
  - Create first task (guided)
- Household switcher (for multi-household users)
- Parent dashboard (basic)
- Child profile management

**Deliverables**
- Complete onboarding experience
- Multi-household support working
- Role-based UI rendering

### Week 7-8: Notifications & Polish

**Backend**
- Push notification infrastructure (FCM/APNS)
- Notification scheduling service
- Task reminder logic (approaching deadline, overdue)
- Notification preferences per household

**Frontend**
- Push notification registration
- Notification settings UI
- Parent overview dashboard
  - Weekly household summary
  - Completion rates
  - Overdue tasks
- UI polish and responsive design
- Offline support (view tasks when offline)

**Deliverables**
- Push notifications working reliably
- Parent can see household overview
- App works offline for basic viewing

**MVP Success Criteria**
- ✅ Parents can create rule-based tasks
- ✅ Tasks automatically assigned to correct children
- ✅ Children receive push notifications
- ✅ Children can complete tasks
- ✅ Parents can see completion status
- ✅ Multi-household support works
- ✅ App is mobile-friendly and responsive

---

## Phase 2: Gamification & Engagement (Weeks 9-12)

**Goal**: Increase child motivation and engagement through gamification.

### Points & Rewards System

**Backend**
- Points calculation engine
- Bonus point rules
- Reward definitions
- Historical points tracking

**Frontend**
- Points display for children
- Progress toward rewards
- Completion streaks
- Weekly achievement summary
- Reward redemption flow (informational)

**Deliverables**
- Children earn points for completing tasks
- Bonus points for streaks and timely completion
- Parents define rewards and track progress

### Enhanced Parent Dashboard

**Backend**
- Historical data queries
- Completion rate analytics
- Task effectiveness metrics

**Frontend**
- Historical view (past weeks/months)
- Per-child completion trends
- Most/least completed tasks
- Task adjustment recommendations

**Deliverables**
- Parents have detailed insights
- Data-driven task adjustments possible

---

## Phase 3: Advanced Features (Weeks 13-16)

**Goal**: Add features that improve usability and retention.

### Task Templates & Sharing

- Pre-built task templates by age group
- Community-shared task ideas
- One-click import of task templates

### Advanced Assignment Rules

- Rotating schedule with 3+ children
- Conditional assignments (e.g., based on previous completion)
- Task dependencies (must complete A before B)
- Seasonal/school-break variations

### Parent Approval Workflow

- Tasks requiring parent approval
- Photo evidence of completion (optional)
- Reject with feedback
- Quality ratings

### Enhanced Notifications

- Smart reminder timing (ML-based)
- Quiet hours per child
- Escalation for repeated overdue tasks
- Weekly summary notifications

---

## Phase 4: Growth & Monetization (Weeks 17-20)

**Goal**: Prepare for scale and sustainable business model.

### Premium Features

- Unlimited households (free tier: 1 household)
- Advanced analytics and reporting
- Custom point multipliers
- Task templates library
- Priority support

### Social Features

- Family leaderboards (opt-in)
- Share achievements
- Connect with other families (privacy-first)

### Platform Expansion

- Web dashboard for parents
- Tablet-optimized layouts
- Smart home integrations (Alexa, Google Home)

---

## Technical Architecture

### Backend Stack

**API Server**
- Fastify (Node.js) - REST API
- PostgreSQL 17 - Primary database
- JWT - Authentication
- pg.Pool - Database connection pooling

**Background Services**
- Task assignment generator (runs daily/weekly)
- Notification scheduler (cron-based)
- Points calculation service

**Infrastructure**
- Docker Compose (development)
- Nginx reverse proxy
- Firebase Cloud Messaging (push notifications)
- CI/CD via GitHub Actions

### Frontend Stack

**Mobile App**
- Angular 21+ with standalone components
- Signals for state management
- Capacitor for native mobile deployment (iOS/Android)
- Service Workers for offline support
- Push notification plugin

**Design System**
- Mobile-first responsive design
- WCAG AA accessibility compliance
- Child-friendly UI (larger buttons, clear feedback)
- Parent interface (data-dense, efficient)

### Database Design Principles

**Multi-Tenancy**
- All tables include `household_id` foreign key
- Queries ALWAYS filter by tenant
- Row-level security policies
- Separate indexes per tenant for performance

**Data Isolation**
- Application-level: Middleware enforces tenant context
- Database-level: Policies prevent cross-tenant queries
- Testing: Automated tests verify isolation

**Schema Organization**
```
Core Tables:
- households
- users
- household_memberships (user-household-role junction)
- child_profiles
- tasks (task templates)
- task_assignments (specific instances)
- task_completions
- points_history
- rewards
- notifications
```

---

## MVP Feature Breakdown (Phase 1)

### Epic 1: Multi-Tenant Foundation
**Priority**: Critical  
**Estimated Effort**: 2 weeks

Features:
1. Database schema with proper multi-tenant design
2. Authentication system (register, login, JWT)
3. Tenant isolation middleware
4. Household CRUD operations
5. User invitation system

**Acceptance Criteria**:
- Users can create and manage households
- All data properly scoped to households
- Users cannot access other households' data
- Invite codes/links work correctly

---

### Epic 2: Task Management Core
**Priority**: Critical  
**Estimated Effort**: 2 weeks

Features:
1. Task template creation (with rules)
2. Rule engine for assignment
   - Odd/even week rotation
   - Repeating tasks (specific days)
3. Task assignment generation
4. Task completion by children
5. Task list views (parent & child)

**Acceptance Criteria**:
- Parents can create tasks with assignment rules
- System automatically generates correct assignments
- Children see only their assigned tasks
- Task completion updates in real-time
- Odd/even week rotation works correctly

---

### Epic 3: User Onboarding
**Priority**: High  
**Estimated Effort**: 1 week

Features:
1. Account registration
2. Household creation wizard
3. Add children flow
4. Create first task (guided)
5. Invite additional parents

**Acceptance Criteria**:
- New user can complete onboarding in < 3 minutes
- Guided task creation suggests common tasks
- Onboarding is mobile-optimized
- Clear help text at each step

---

### Epic 4: Push Notifications
**Priority**: High  
**Estimated Effort**: 1.5 weeks

Features:
1. Push notification infrastructure
2. Task reminder notifications
   - Task becomes active
   - Approaching deadline
   - Overdue
3. Notification preferences
4. Device registration

**Acceptance Criteria**:
- Notifications reliably delivered
- Users can configure reminder frequency
- Quiet hours respected
- Notifications open relevant task

---

### Epic 5: Parent Dashboard
**Priority**: Medium  
**Estimated Effort**: 1.5 weeks

Features:
1. Weekly household overview
2. Per-child completion rates
3. Overdue tasks list
4. Quick task creation
5. Household switcher

**Acceptance Criteria**:
- Dashboard loads quickly
- Data is real-time or near-real-time
- Clear visual indicators for issues
- Mobile-optimized layout

---

## Non-Functional Requirements

### Performance
- API response time < 200ms (p95)
- Page load time < 2s on 3G
- Push notifications delivered within 60s
- Offline mode for task viewing

### Security
- All API endpoints require authentication
- Tenant isolation enforced at every layer
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- XSS prevention (output escaping)
- Rate limiting on authentication endpoints

### Scalability
- Support 10,000+ households in Phase 1
- Database queries optimized with indexes
- Notification queue can handle bursts
- Horizontal scaling possible for API servers

### Reliability
- 99.5% uptime target
- Automated backups (daily)
- Database replication (future)
- Error tracking and monitoring
- Graceful degradation when offline

### Compliance
- GDPR-compliant data handling
- Child data protection (COPPA awareness)
- User data export/deletion capabilities
- Privacy policy and terms of service

---

## Risk Assessment

### Technical Risks

**Risk**: Task assignment rule engine complexity  
**Mitigation**: Start with simple odd/even, iterate based on user needs  
**Priority**: Medium

**Risk**: Push notification reliability across platforms  
**Mitigation**: Use battle-tested service (FCM), extensive testing  
**Priority**: High

**Risk**: Multi-tenant data leaks  
**Mitigation**: Automated tests, code review, security audit  
**Priority**: Critical

**Risk**: Mobile app performance on older devices  
**Mitigation**: Performance budgets, optimization, progressive enhancement  
**Priority**: Medium

### Product Risks

**Risk**: Users don't understand rule-based assignment  
**Mitigation**: Clear onboarding, examples, templates  
**Priority**: Medium

**Risk**: Children ignore notifications  
**Mitigation**: Gamification, parent oversight, adjustable frequency  
**Priority**: High

**Risk**: Too many features overwhelm users  
**Mitigation**: Progressive disclosure, simple MVP, user testing  
**Priority**: Medium

---

## Success Metrics

### Phase 1 (MVP) Success Metrics

**Adoption**
- 50+ households created in first month
- 70%+ complete onboarding flow
- 2.5+ children per household average

**Engagement**
- 60%+ of children check app daily
- 70%+ task completion rate
- 40%+ parents access dashboard weekly

**Technical**
- 99%+ uptime
- < 1% error rate on API calls
- < 5% notification delivery failures

**Satisfaction**
- 4+ star app store rating
- 80%+ would recommend to friends
- < 20% churn in first month

---

## Timeline Summary

| Phase | Duration | Key Deliverables | Status |
|-------|----------|------------------|--------|
| Phase 1: MVP | 8 weeks | Core functionality, multi-tenant, notifications | Planning |
| Phase 2: Gamification | 4 weeks | Points, rewards, analytics | Future |
| Phase 3: Advanced Features | 4 weeks | Templates, approval workflow, smart notifications | Future |
| Phase 4: Growth | 4 weeks | Premium tier, monetization, platform expansion | Future |

**Total MVP Delivery**: 8 weeks from start  
**Full Feature Set**: 20 weeks (5 months)

---

## Next Steps

1. **Immediate** (This Week):
   - Review and approve implementation plan
   - Create Phase 1 epics and features in roadmap
   - Set up development environment
   - Design detailed database schema

2. **Week 1**:
   - Begin Epic 1: Multi-Tenant Foundation
   - Create wireframes for key user flows
   - Set up CI/CD pipelines for mobile app

3. **Ongoing**:
   - Weekly progress reviews
   - User testing sessions (starting Week 4)
   - Continuous feedback integration
   - Risk monitoring and mitigation

---

## Appendices

### A. Database Schema (High-Level)

See separate schema design document for detailed ERD and table definitions.

### B. API Endpoints (MVP)

See separate API specification document for complete endpoint list.

### C. User Stories

See features/ directory for detailed user stories with acceptance criteria.

### D. Design Mockups

See design/ directory for wireframes and high-fidelity mockups (to be created).

---

## Document History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-13 | 1.0 | Initial implementation plan created | AI Agent |

---

## References

- Product requirements document (inline above)
- Technical architecture: AGENTS.md files throughout codebase
- Agent system documentation: .github/agents/
