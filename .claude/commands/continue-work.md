# Continue Work - Autonomous Development Loop

Execute the autonomous development workflow. Pick up the next priority from GitHub Issues and work through tasks continuously.

## Current Status

Branch: main
Recent commits: 6bf9569 chore: add Claude config and types integration test (#144)
f621b13 fix: return camelCase household members (#143)
b651da5 fix: return camelCase timestamps for households (#142)

**⚠️ IMPORTANT: All work is now tracked in GitHub Issues, not local markdown files.**

## Workflow

1. Query GitHub Issues for next priority (delegate to GitHub Issues Agent)
   ```bash
   gh issue list --label "mvp-blocker" --state open
   gh issue list --milestone "MVP Launch" --state open --json number,title,labels
   ```
2. Pick the top priority issue (mvp-blocker > critical > high-priority)
3. Read issue details: `gh issue view <NUMBER>`
4. If feature without tasks → break it down first (delegate to GitHub Issues Agent)
5. Mark issue as "in-progress": `gh issue edit <NUMBER> --add-label "in-progress"`
6. Delegate to specialized subagents (frontend, backend, database, github-issues)
7. Run tests locally, create PR with "Closes #<NUMBER>", wait for CI, merge
8. Issue auto-closes when PR merges
9. Pull main, then **automatically continue to next issue**

## Subagent Delegation Pattern

**CRITICAL**: Always follow this handover pattern when delegating to subagents.

### Handover Template

When spawning a subagent, structure your prompt like this:

```
**Context Files** (read these first):
1. .github/agents/[AGENT-TYPE]-agent.md - Agent-specific patterns and conventions
2. CLAUDE.md - Project-wide conventions (especially "Key Conventions" section)
3. GitHub Issue #XXX - Task specification and acceptance criteria

**GitHub Issue Tracking**:
- Issue: #XXX
- Labels: [labels from issue]
- Milestone: [milestone name]
- **Action**: Mark as "in-progress" when starting
- **Action**: Comment with progress updates
- **Action**: Close with "Closes #XXX" in PR description

**Implementation Files** (your targets):
- [Exact file path to create/modify - be specific]
- [Another file path]

**Reference Files** (for examples/patterns):
- [Existing file that shows patterns to follow]

**Task**:
[Clear, focused description of what needs to be done]

**Acceptance Criteria** (from GitHub issue):
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] All tests pass

**Priority**: [High/Medium/Low] - [Why this matters]

**Testing**: [Which tests to run and how]
```

### Agent Type Selection

Use specialized agent types (NOT "general-purpose") when applicable:

- **GitHub Issues work**: Use GitHub Issues Agent
  - Read: `.github/agents/github-issues-agent.md`
  - Use for: Creating issues, milestones, labels, querying, updating status

- **Backend work**: Use backend-focused subagent
  - Read: `.github/agents/backend-agent.md`
  - Use for: Fastify APIs, routes, middleware, business logic

- **Frontend work**: Use frontend-focused subagent
  - Read: `.github/agents/frontend-agent.md`
  - Use for: Angular components, services, UI/UX

- **Database work**: Use database-focused subagent
  - Read: `.github/agents/database-agent.md`
  - Use for: Migrations, schema changes, queries

- **CI/CD work**: Use CI/CD Agent
  - Read: `.github/agents/cicd-agent.md`
  - Use for: Monitoring workflows, fixing CI failures, quality gates

- **General-purpose**: Only for cross-cutting concerns
  - Use when work spans multiple domains without clear boundaries
  - Use for complex analysis requiring multiple perspectives

### Example Handover (Backend)

```
**Context Files** (read these first):
1. .github/agents/backend-agent.md - Backend patterns and conventions
2. CLAUDE.md - Project conventions (camelCase, async/await, parameterized queries)
3. GitHub Issue #150 - Task specification and acceptance criteria

**GitHub Issue Tracking**:
- Issue: #150
- Labels: feature, backend, high-priority
- Milestone: MVP Launch
- **Action**: Mark as "in-progress" when starting
- **Action**: Comment with progress updates
- **Action**: Close with "Closes #150" in PR description

**Implementation Files** (your targets):
- apps/backend/src/routes/invitations.ts (create email sending)
- apps/backend/src/services/email.service.ts (create new)
- apps/backend/.env.example (add email config)

**Reference Files** (for examples/patterns):
- apps/backend/src/routes/auth.ts - Service integration pattern
- apps/backend/src/middleware/auth.ts - Configuration pattern

**Task**:
Integrate email service to send notifications when invitations are created. Use SendGrid API.

**Acceptance Criteria** (from GitHub issue #150):
- [ ] SendGrid SDK integrated
- [ ] Email template for invitations created
- [ ] Email sent on invitation creation
- [ ] Failed emails logged and handled
- [ ] All backend tests pass

**Priority**: Critical - MVP blocker (users can't invite others)

**Testing**: Run `npm run test:backend` to verify all tests pass
```

### Example Handover (GitHub Issues)

```
**Context Files** (read these first):
1. .github/agents/github-issues-agent.md - Issue management workflows

**Task**:
Create GitHub issues for all MVP blocker bugs found in audit:
1. Bug: Task creation buttons disabled
2. Bug: Children cannot log in
3. Feature: Email notifications for invitations
4. Task: Fix empty state UI on dashboard

**Actions Required**:
- Create milestone "MVP Launch" if it doesn't exist
- Create 4 issues with proper labels (bug/feature/task, mvp-blocker, priority)
- Add detailed descriptions with acceptance criteria
- Link related issues via comments

**Testing**: Verify with `gh issue list --milestone "MVP Launch"`
```

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
3. **Track in GitHub** - ALL work must have a GitHub issue
4. **Update issue status** - Mark as "in-progress" when starting, comment with progress
5. **Close via PR** - Use "Closes #XXX" in PR description
6. **Pull after merge** - Always `git checkout main && git pull` after merge

## Quality Checklist

Before marking ANY issue complete:
- [ ] All relevant tests run locally and pass
- [ ] Followed the handover pattern for subagent delegation
- [ ] Referenced agent spec files in prompts
- [ ] Specified exact file paths for implementation
- [ ] Provided clear acceptance criteria
- [ ] All acceptance criteria verified
- [ ] Code follows project standards (camelCase, type safety)
- [ ] Documentation updated if needed
- [ ] GitHub issue marked "in-progress" and updated with comments
- [ ] PR references issue with "Closes #XXX"

## Start

Query GitHub Issues now and begin executing the top priority issue. Do not ask for confirmation - work autonomously until all MVP blockers are resolved or you hit a blocker.

**First command**: `gh issue list --label "mvp-blocker" --state open`
```
