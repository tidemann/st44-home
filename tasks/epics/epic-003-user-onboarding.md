# Epic: User Onboarding & Experience

## Metadata
- **ID**: epic-003
- **Status**: in-progress
- **Priority**: high
- **Created**: 2025-12-13
- **Estimated Duration**: 1 week
- **Business Value**: User activation and retention

## Description
Create a smooth, intuitive onboarding experience that gets new users from signup to their first completed task in under 3 minutes. Includes account creation, household setup, adding children, and guided task creation.

## Business Context

### Why This Epic?
First impressions matter:
- 40% of users abandon apps after poor onboarding
- Fast time-to-value increases retention
- Guided experience reduces support burden
- Sets expectation of ease-of-use

### Strategic Value
- **User Activation**: Get users to "aha moment" quickly
- **Retention**: Good onboarding improves 7-day retention 2-3x
- **Word of Mouth**: Happy users recommend to friends
- **Reduced Support**: Clear guidance prevents confusion

## Goals
1. Enable new users to set up household in < 3 minutes
2. Guide users through creating their first task
3. Make adding children simple and clear
4. Support inviting additional parents
5. Provide household switcher for multi-household users

## Features
- [feature-012](../features/feature-012-landing-pages-after-login.md): **Landing Pages After Login** (3-4 days) - NEW
  - Parent dashboard with household overview
  - Child dashboard with today's tasks
  - Auth guards and role-based routing

To be broken down by Planner Agent:
- Account registration flow (partially complete via feature-001)
- Household creation wizard (partially complete via feature-003)
- Add children interface (partially complete via feature-003)
- Guided first task creation
- Invitation system for additional parents (feature-004)
- Household switcher UI (partially complete via feature-003)
- Welcome/tutorial screens

## Success Criteria
- [ ] New user can complete onboarding in < 3 minutes
- [ ] 70%+ of users complete onboarding
- [ ] Clear progress indicators throughout flow
- [ ] Can add multiple children in one flow
- [ ] First task creation is guided with examples
- [ ] Invitation links work from email/SMS
- [ ] Can switch between households easily
- [ ] Mobile-optimized for all screens
- [ ] Accessible (WCAG AA)
- [ ] Works offline after initial setup

## Risks
- **Medium**: Too many steps cause abandonment
- **Medium**: Unclear what to do next after onboarding
- **Low**: Technical issues during signup

## Mitigation Strategies
- Keep steps minimal (5 or fewer)
- Show progress indicator
- Allow skipping optional steps
- Provide "back" navigation
- Save progress automatically
- Test with real users early

## Dependencies
- Epic-001 (Multi-Tenant Foundation) must be complete
- Basic task management from Epic-002 needed

## Timeline
- Days 1-2: Registration and household creation
- Days 3-4: Child profiles and guided task creation
- Day 5: Testing, polish, responsive design

## Estimated Effort
1 week with 1 frontend developer

## Acceptance Criteria
- [ ] Can register with email and password
- [ ] Email validation works correctly
- [ ] Password strength requirements clear
- [ ] Can create household with name
- [ ] Can add 1+ children with names and ages
- [ ] Guided task creation suggests common tasks
- [ ] Preview of task rule before creating
- [ ] Welcome message after completing onboarding
- [ ] Can generate invite link for spouse/partner
- [ ] Invite link pre-fills household info
- [ ] Household switcher shows all households
- [ ] Current household clearly indicated
- [ ] Can navigate back through onboarding steps
- [ ] Form validation provides clear feedback
- [ ] Works on mobile (iOS and Android)

## User Flow

### Happy Path
1. Open app → Splash screen
2. "Sign Up" → Email + Password
3. "Create Household" → Name + Settings
4. "Add Children" → Name + Age (repeat)
5. "Create First Task" → Guided flow with templates
6. "Done!" → View dashboard with first task

### Time Budget
- Sign up: 30 seconds
- Create household: 20 seconds
- Add children: 40 seconds (2 children)
- Create first task: 60 seconds
- **Total: 2:30 minutes**

## Design Principles
- **Progressive Disclosure**: Only show what's needed now
- **Clear Next Steps**: Always obvious what to do next
- **Error Prevention**: Validate before submit
- **Quick Wins**: Show value early and often
- **Forgiving**: Easy to correct mistakes

## Related Work
- Depends on: Epic-001 (Multi-Tenant Foundation)
- Uses: Epic-002 (Task Management Core)
- Enhances: User activation metrics

## Progress Log
- [2025-12-13] Epic created based on implementation plan
- [2025-12-16] Feature-012 (Landing Pages After Login) created and added
- [2025-12-16] Status changed to in-progress
