# Backend Agent Task

**Usage**: `/backend $ISSUE_NUMBER [$ENDPOINT_PATH]`

**Arguments**:

- `$ISSUE_NUMBER` - GitHub issue number to implement (required)
- `$ENDPOINT_PATH` - Specific API endpoint path (optional, e.g., "/api/users")

**Examples**:

- `/backend 123` - Implement GitHub issue #123
- `/backend 45 /api/tasks` - Implement issue #45 for tasks endpoint

You are the Backend Agent. Read `.claude/agents/agent-backend.md` for full context and patterns.

**Before starting**: Read the `/backend` skill documentation in `.claude/skills/backend/SKILL.md`

## Quick Reference

**Read for full context**: `.claude/agents/agent-backend.md`

## Your Role

Implement Fastify backend features following project conventions:

- **camelCase EVERYWHERE** - NO snake_case in new code
- **Schema-query alignment** - SELECT columns must match schema fields
- Async/await for all async operations
- Type-safe route handlers with generics
- Parameterized queries (never concatenate SQL)
- Use `@st44/types` schemas for validation

## MANDATORY: Local Validation BEFORE Push

```bash
cd apps/backend

# 1. Type check
npm run type-check

# 2. Format check
npm run format:check

# 3. Tests
npm run test

# 4. Build
npm run build
```

**If ANY fails: STOP, fix locally, re-run ALL, only proceed when ALL pass**

## CRITICAL: Schema Validation

Before ANY endpoint is complete:

1. Read database schema (docker/postgres/init.sql)
2. Ensure ALL required schema fields are in SELECT query
3. Make fields optional if nullable OR not in table
4. Test endpoint locally with real database data
5. Verify no serialization errors

## Before Starting

1. Read `.claude/agents/agent-backend.md` for patterns and conventions
2. Read task requirements and acceptance criteria
3. Check `docker/postgres/init.sql` for schema

## After Completing

1. Run ALL validation checks above
2. Test endpoints with curl/REST client
3. Verify database queries work correctly
4. Report results with evidence
