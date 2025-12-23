# Continue Work - Autonomous Development Loop

Execute the autonomous development workflow. Pick up the next priority from the roadmap and work through tasks continuously.

## Current Status

Branch: main
Recent commits: 6bf9569 chore: add Claude config and types integration test (#144)
f621b13 fix: return camelCase household members (#143)
b651da5 fix: return camelCase timestamps for households (#142)

## Workflow

1. Read `tasks/ROADMAP.md` for current priorities
2. Pick the top item from "Now" section
3. If feature without tasks → break it down first
4. Delegate to specialized subagents (frontend, backend, database)
5. Run tests locally, create PR, wait for CI, merge
6. Pull main, then **automatically continue to next task**

## Subagent Delegation Pattern

**CRITICAL**: Always follow this handover pattern when delegating to subagents.

### Handover Template

When spawning a subagent, structure your prompt like this:

```
**Context Files** (read these first):
1. .github/agents/[AGENT-TYPE]-agent.md - Agent-specific patterns and conventions
2. CLAUDE.md - Project-wide conventions (especially "Key Conventions" section)
3. tasks/[items|features]/[TASK-FILE].md - Task specification and acceptance criteria

**Implementation Files** (your targets):
- [Exact file path to create/modify - be specific]
- [Another file path]

**Reference Files** (for examples/patterns):
- [Existing file that shows patterns to follow]

**Task**:
[Clear, focused description of what needs to be done]

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] All tests pass

**Priority**: [High/Medium/Low] - [Why this matters]

**Testing**: [Which tests to run and how]
```

### Agent Type Selection

Use specialized agent types (NOT "general-purpose") when applicable:

- **Backend work**: Use backend-focused subagent
  - Read: `.github/agents/backend-agent.md`
  - Use for: Fastify APIs, routes, middleware, business logic

- **Frontend work**: Use frontend-focused subagent
  - Read: `.github/agents/frontend-agent.md`
  - Use for: Angular components, services, UI/UX

- **Database work**: Use database-focused subagent
  - Read: `.github/agents/database-agent.md`
  - Use for: Migrations, schema changes, queries

- **General-purpose**: Only for cross-cutting concerns
  - Use when work spans multiple domains without clear boundaries
  - Use for documentation-only tasks
  - Use for complex analysis requiring multiple perspectives

### Example Handover (Backend)

```
**Context Files** (read these first):
1. .github/agents/backend-agent.md - Backend patterns and conventions
2. CLAUDE.md - Project conventions (camelCase, async/await, parameterized queries)
3. tasks/items/task-102-evaluate-shared-test-utilities.md - Task specification

**Implementation Files** (your targets):
- apps/backend/src/test-helpers/http.ts (create new)
- apps/backend/src/test-helpers/generators.ts (create new)
- apps/backend/src/test-helpers/fixtures.ts (enhance existing)
- apps/backend/src/test-helpers/index.ts (update exports)

**Reference Files** (for examples/patterns):
- apps/backend/src/test-helpers/README.md - Current test patterns
- apps/backend/src/routes/tasks.test.ts - Example integration test

**Task**:
Create comprehensive shared test utilities for backend tests. Audit existing test files for duplication, design shared utility modules (HTTP client, data generators, enhanced fixtures), and implement them in test-helpers/. Goal is 60%+ reduction in test setup code.

**Acceptance Criteria**:
- [ ] HTTP test client created with expectSuccess/expectError helpers
- [ ] Data generators created (25+ functions for realistic test data)
- [ ] Enhanced fixtures (createCompleteTestScenario, createHouseholdWithMembers)
- [ ] All 272 backend tests still pass
- [ ] Documentation updated with usage examples

**Priority**: Medium - Improves developer experience and test maintainability

**Testing**: Run `npm run test:backend` to verify all tests pass
```

### Example Handover (Frontend)

```
**Context Files** (read these first):
1. .github/agents/frontend-agent.md - Angular patterns (signals, standalone, inject)
2. CLAUDE.md - Project conventions (camelCase, OnPush, control flow syntax)
3. tasks/items/task-110-integration-testing-docs.md - Task specification

**Implementation Files** (your targets):
- packages/types/README.md (create comprehensive guide)
- apps/backend/AGENTS.md (add "Shared Types Usage" section)
- apps/frontend/AGENTS.md (add "Shared Types Usage" section)

**Reference Files** (for examples/patterns):
- apps/backend/src/test-helpers/README.md - Example of good documentation
- packages/types/src/schemas/task.schema.ts - Schema patterns to document

**Task**:
Create comprehensive developer documentation for the shared types system. Write packages/types/README.md with usage examples, conventions, troubleshooting. Update AGENTS.md files with shared types patterns for backend and frontend developers.

**Acceptance Criteria**:
- [ ] README.md covers: overview, usage, adding schemas, conventions, troubleshooting
- [ ] Backend AGENTS.md updated with Zod validation patterns
- [ ] Frontend AGENTS.md updated with type import patterns
- [ ] Before/after examples showing improvements
- [ ] All tests still pass (no code changes, just docs)

**Priority**: High - Ensures developers can use the new type system effectively

**Testing**: No code changes, verify documentation completeness
```

## Critical Rules

1. **Never push to main** - Always use feature branches
2. **Test before PR** - Run `npm test` and `npm run type-check` locally
3. **Update ROADMAP.md** - After completing work, update status
4. **Move to done/** - Completed tasks go to `tasks/items/done/`
5. **Pull after merge** - Always `git checkout main && git pull` after merge

## Quality Checklist

Before marking ANY task complete:
- [ ] All relevant tests run locally and pass
- [ ] Followed the handover pattern for subagent delegation
- [ ] Referenced agent spec files in prompts
- [ ] Specified exact file paths for implementation
- [ ] Provided clear acceptance criteria
- [ ] All acceptance criteria verified
- [ ] Code follows project standards (camelCase, type safety)
- [ ] Documentation updated if needed

## Start

Read `tasks/ROADMAP.md` now and begin executing the top priority. Do not ask for confirmation - work autonomously until the roadmap is complete or you hit a blocker.
