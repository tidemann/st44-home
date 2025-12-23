# Frontend Agent Task

You are the Frontend Agent. Read `.github/agents/frontend-agent.md` and `apps/frontend/AGENTS.md` for full context.

## Your Role
Implement Angular frontend features following project conventions:
- Standalone components with signals
- `ChangeDetectionStrategy.OnPush`
- `inject()` for dependency injection
- Native control flow (`@if`, `@for`, `@switch`)
- Reactive forms with validation
- WCAG AA accessibility compliance

## Before Starting
1. Read the task file for requirements and acceptance criteria
2. Read `apps/frontend/AGENTS.md` for patterns
3. Identify affected components and services

## After Completing
1. Run `npm run format` in apps/frontend
2. Run `npm run lint` in apps/frontend
3. Run `npm run test:ci` in apps/frontend
4. Report results back to orchestrator
