---
description: Plan a new feature with strategic analysis and definition
agent: planner-agent
---

# Plan New Feature

Use this prompt to invoke the Planner Agent for strategic feature planning and definition.

## Your Task

1. **Understand user need**: Clarify what the user wants to build and why
2. **Invoke Planner Agent**: Switch to planner-agent mode or read [planner-agent.md](../../.github/agents/planner-agent.md)
3. **Strategic analysis**:
   - What problem does this solve?
   - Who are the users?
   - What's the business value?
   - How does it fit into the product vision?
4. **Technical assessment**:
   - What components are affected? (frontend/backend/database)
   - What are the technical constraints?
   - What existing patterns can be leveraged?
   - What new patterns need to be established?
5. **Define scope**:
   - What's in scope for this feature?
   - What's explicitly out of scope?
   - What are the must-haves vs nice-to-haves?
6. **Create user stories**:
   - Write clear user stories: "As a [user], I want [functionality] so that [benefit]"
   - Ensure stories are testable and valuable
7. **Define acceptance criteria**:
   - What does "done" look like?
   - How will we validate success?
   - What edge cases must be handled?
8. **Assess dependencies**:
   - What other features does this depend on?
   - What features might depend on this?
   - Are there blocking issues?
9. **Create feature file**: Use template from `tasks/templates/feature.md`
   - Fill in all sections thoroughly
   - Link to parent epic if applicable
   - Add to ROADMAP.md in appropriate section (Now/Next/Later)
10. **Get user approval**: Present the plan and confirm before moving forward

## Planning Checklist

### Problem Definition
- [ ] Clear problem statement
- [ ] User pain points identified
- [ ] Business value articulated
- [ ] Success metrics defined

### Technical Scope
- [ ] Affected components identified (DB/backend/frontend)
- [ ] Architecture approach defined
- [ ] Integration points mapped
- [ ] Technical risks assessed

### User Stories
- [ ] At least 2-3 user stories written
- [ ] Stories follow "As a... I want... so that..." format
- [ ] Stories are testable
- [ ] Stories deliver clear value

### Acceptance Criteria
- [ ] Criteria are specific and measurable
- [ ] Happy path defined
- [ ] Edge cases considered
- [ ] Error handling specified
- [ ] Accessibility requirements included
- [ ] Performance requirements noted

### Prioritization
- [ ] Priority level set (high/medium/low)
- [ ] Dependencies documented
- [ ] Estimated timeline provided
- [ ] Added to ROADMAP.md in correct section

## Example Feature Plan

**Feature**: User Profile Management

**Problem**: Users cannot edit their profile information after registration, leading to outdated data and support requests.

**User Stories**:
- As a registered user, I want to view my profile so that I can see my current information
- As a registered user, I want to edit my profile so that I can keep my information current
- As a registered user, I want to see validation errors so that I can fix incorrect inputs

**Acceptance Criteria**:
- [ ] Profile page displays: username, email, name, bio
- [ ] Edit button enables form fields
- [ ] Changes are validated before submission
- [ ] Success message shown after save
- [ ] Changes persist after page refresh
- [ ] Form is keyboard accessible (WCAG AA)

**Technical Scope**:
- Database: Extend users table with name, bio fields
- Backend: GET/PUT /api/users/:id/profile endpoints
- Frontend: Profile view component, profile edit form
- Testing: Unit tests, integration tests for API

**Priority**: High (affects user retention)
**Dependencies**: None
**Estimate**: 3-5 days

## Success Criteria

- [ ] Feature file created in `tasks/features/`
- [ ] All sections of feature template filled out
- [ ] Added to ROADMAP.md
- [ ] User stories are clear and testable
- [ ] Acceptance criteria are specific and measurable
- [ ] Technical scope is well-defined
- [ ] User approves the plan

## Reference Documentation

- [Planner Agent](../../.github/agents/planner-agent.md) - Strategic planning expert
- [tasks/templates/feature.md](../../tasks/templates/feature.md) - Feature template
- [tasks/ROADMAP.md](../../tasks/ROADMAP.md) - Product roadmap
- [AGENT.md](../../AGENT.md) - Project architecture
