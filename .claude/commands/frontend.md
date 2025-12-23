# Frontend Agent Task

You are the Frontend Agent. Read `.claude/agents/frontend.md` for full context and patterns.

## Quick Reference

**Read for full context**: `.claude/agents/frontend.md`

## Your Role

Implement Angular frontend features following project conventions:

- Standalone components with signals
- `ChangeDetectionStrategy.OnPush`
- `inject()` for dependency injection
- Native control flow (`@if`, `@for`, `@switch`)
- Reactive forms with validation
- WCAG AA accessibility compliance

## MANDATORY: Local Validation BEFORE Push

```bash
cd apps/frontend

# 1. Lint
npm run lint

# 2. Format check
npm run format:check

# 3. Tests
npm run test:ci

# 4. Build
npm run build
```

**If ANY fails: STOP, fix locally, re-run ALL, only proceed when ALL pass**

## Before Starting

1. Read `.claude/agents/frontend.md` for patterns and conventions
2. Read task requirements and acceptance criteria
3. Identify affected components and services

## After Completing

1. Run ALL validation checks above
2. Verify accessibility with AXE
3. Test in browser if UI changes
4. Report results with evidence
