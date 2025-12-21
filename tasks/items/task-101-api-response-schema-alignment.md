# Task: API Response Schema Alignment

## Metadata
- **ID**: task-101
- **Feature**: Technical Infrastructure
- **Epic**: epic-006 - Testing & Quality Assurance
- **Status**: pending
- **Priority**: medium (technical debt from task-100)
- **Created**: 2025-12-21
- **Assigned Agent**: backend-agent, orchestrator-agent
- **Estimated Duration**: 3-5 days (24-40 hours)

## Description
Fix 68 backend test failures caused by OpenAPI response schema mismatches identified in Task-100. Backend API responses don't match OpenAPI schema expectations due to inconsistent response structures (mixed field names, nested vs flat objects, extra fields like `message`). This task aligns actual responses with documented schemas OR updates schemas to match responses, ensuring consistency.

**Context from Task-100:**
- Phase 1 implemented OpenAPI 3.1 schemas for all 24 endpoints
- Response validation disabled in test environment using stripResponseValidation()
- 204/273 tests passing (74.7%) - 68 failures (25%) due to response mismatches
- Examples of mismatches:
  - Login returns `{message, user: {id, email}}` but schema expects `{userId, email}`
  - Task endpoints return `task_id` (snake_case) but schema expects `taskId` (camelCase)
  - Extra fields in responses not documented in schemas
  - Nested object structures don't match flat schema definitions

**Goal:** Achieve 270+/273 tests passing (99%+) by eliminating response schema mismatches.

## Requirements

### 1. Analyze Test Failures (2-4 hours)
- Run backend tests and categorize 68 failures
- Document each response mismatch (field names, structures, types)
- Identify patterns: snake_case vs camelCase, nested vs flat, extra fields
- Prioritize by impact: Critical endpoints (auth, assignments) vs nice-to-have

### 2. Decision: Update Schemas OR Responses (1-2 hours)
**Option A: Update Schemas to Match Responses**
- Pros: No breaking changes, preserves existing API
- Cons: May document inconsistent API design
- Use case: External consumers, stable API

**Option B: Update Responses to Match Schemas**
- Pros: Enforces consistency, cleaner API
- Cons: Breaking changes for frontend, requires coordination
- Use case: Internal API, pre-production, controllable impact

**Option C: Hybrid Approach**
- Auth/critical endpoints: Match schemas to responses (stable)
- New/flexible endpoints: Match responses to schemas (consistent)
- Use case: Gradual migration to consistency

### 3. Implement Fixes (16-30 hours)
- Update either OpenAPI schemas OR backend route handlers
- Ensure multi-tenant data isolation maintained
- Follow existing patterns (camelCase transformations, response structure)
- Test each fix individually to prevent regressions

### 4. Re-Enable Response Validation (2-4 hours)
- Remove stripResponseValidation() from schemas
- Update common.ts to enforce response validation in tests
- Verify tests pass with validation active
- Test in both development and CI environments

## Acceptance Criteria
- [ ] All 68 test failures analyzed and categorized
- [ ] Decision documented: Update schemas OR responses (with rationale)
- [ ] Response/schema mismatches fixed for all failing endpoints
- [ ] Backend tests: 270+/273 passing (99%+)
- [ ] Response validation re-enabled in test environment
- [ ] No breaking changes to frontend (if updating responses, coordinate with frontend-agent)
- [ ] OpenAPI documentation accurate and complete
- [ ] Swagger UI shows correct request/response examples
- [ ] Code follows project standards (linting, formatting)
- [ ] PR created, CI passes, merged to main

## Dependencies
- Task-100 Phase 1 (OpenAPI Implementation) ✅ COMPLETE
- feature-015 (Task Viewing & Completion) ✅ COMPLETE
- All backend integration tests exist (feature-011)

## Technical Notes

### Response Mismatch Categories (from Task-100 analysis)

**1. Field Naming Inconsistencies**
- Mixed camelCase/snake_case: `task_id` vs `taskId`
- Nested vs flat: `user.id` vs `userId`
- Solution: Choose convention (prefer camelCase for JSON, snake_case for DB)

**2. Extra Response Fields**
- Login returns `message` field not in schema
- Some endpoints return metadata not documented
- Solution: Either remove from response OR add to schema

**3. Nested Object Structures**
- Login returns `{user: {id, email}}` vs schema expects flat `{userId, email}`
- Some endpoints nest related data differently
- Solution: Align structure consistency across similar endpoints

**4. Missing Required Properties**
- Schema requires fields not in response
- Optional fields marked as required
- Solution: Review schema definitions, mark optional where appropriate

### Existing Patterns to Follow

**Backend Response Transformation (from households.ts)**:
```typescript
export function toHouseholdResponse(row: any) {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at?.toISOString(),
    updatedAt: row.updated_at?.toISOString(),
  };
}
```

**OpenAPI Schema Pattern (from common.ts)**:
```typescript
export const responseSchema = {
  type: 'object' as const,
  properties: {
    id: uuidSchema,
    name: { type: 'string' as const },
    createdAt: timestampSchema,
  },
  required: ['id', 'name', 'createdAt'],
  additionalProperties: false,
};
```

### CI Configuration
After fixes, update `.github/workflows/ci.yml` to remove stripResponseValidation workaround:
- Verify `npm test` works without NODE_ENV=test trick
- Ensure response validation active in all environments

## Affected Areas
- [x] Frontend (Angular) - Potentially if responses change
- [x] Backend (Fastify/Node.js) - Route handlers or schemas
- [ ] Database (PostgreSQL) - No schema changes needed
- [ ] Infrastructure (Docker/Nginx) - No changes
- [x] CI/CD - Remove stripResponseValidation workaround
- [x] Documentation - Update OpenAPI docs

## Implementation Plan
[To be filled by Orchestrator Agent after analysis]

### Phase 1: Analysis (2-4 hours)
1. Run `npm test` in apps/backend, capture 68 failures
2. Categorize failures by endpoint and mismatch type
3. Create spreadsheet: Endpoint | Expected | Actual | Fix Strategy
4. Identify common patterns (field naming, structure)

### Phase 2: Decision (1-2 hours)
1. Review spreadsheet with patterns identified
2. Decide update strategy: schemas vs responses vs hybrid
3. Document decision rationale in this task file
4. Get approval if breaking changes involved

### Phase 3: Implementation (16-30 hours)
1. Prioritize fixes: auth endpoints → assignments → tasks → households → children
2. For each endpoint:
   a. Read test failure output
   b. Implement fix (schema OR route handler)
   c. Run tests for that endpoint
   d. Verify fix doesn't break other tests
   e. Commit with clear message
3. Create PR per logical group (5-10 endpoints)

### Phase 4: Validation (2-4 hours)
1. Remove stripResponseValidation() from common.ts
2. Update all schemas to remove conditional wrapping
3. Run full test suite (target: 270+/273)
4. Fix any remaining issues
5. Test in CI environment

### Phase 5: Documentation (2 hours)
1. Update OpenAPI schemas with final structures
2. Verify Swagger UI examples match actual responses
3. Document any breaking changes
4. Update ROADMAP.md with task completion

## Agent Assignments
[To be filled by Orchestrator Agent]

### Subtask 1: Analyze Test Failures
- **Agent**: orchestrator-agent
- **Status**: pending
- **Deliverable**: Categorized list of 68 failures with fix strategies

### Subtask 2: Implement Schema/Response Fixes
- **Agent**: backend-agent
- **Status**: pending
- **Deliverable**: Updated schemas OR route handlers, tests passing

### Subtask 3: Re-Enable Response Validation
- **Agent**: backend-agent
- **Status**: pending
- **Deliverable**: stripResponseValidation() removed, tests passing

### Subtask 4: Update CI Configuration
- **Agent**: orchestrator-agent
- **Status**: pending
- **Deliverable**: CI workflow updated, tests passing in CI

## Progress Log
- [2025-12-21 04:35] Task created as follow-up to Task-100 Phase 1
- [2025-12-21 04:35] Status: pending (awaiting orchestrator assignment)
- [2025-12-21 04:35] Priority: Medium (technical debt, not blocking new features)

## Testing Results
[To be filled during testing phase - target 270+/273 passing]

## Review Notes
[To be filled during review phase]

## Related PRs
- Task-100: #126 (implemented OpenAPI, identified response mismatches)
- [Future PRs to be added during implementation]

## Lessons Learned
[To be filled after completion]

### Expected Learnings
- Best practices for aligning OpenAPI schemas with implementations
- Strategies for maintaining response consistency across endpoints
- How to handle breaking changes in API responses
- Patterns for response transformation (DB → API)

