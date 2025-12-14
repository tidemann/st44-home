# Task: Chore — Document and Align Orchestrator Autonomy + Test DB Setup (task-036)

## Status
in-progress

## Priority
medium

## Summary
Capture and align recent process and infrastructure changes:
- Orchestrator autonomy (no user confirmation gates)
- Unified review/merge handoff and auto-resume loop
- Test database setup (Docker Compose + npm scripts)
- Prompt wording and docs updates

## Changes To Reflect
- Updated `/.github/prompts/continue-work.prompt.md` to remove user confirmation requirement and enforce autonomous proceed rules
- Ensured `/.github/prompts/review-and-merge.prompt.md` governs CI wait + merge + signals
- Confirmed `/.github/prompts/merge-pr.prompt.md` acts as alias to unified flow
- Added test DB: `infra/docker-compose.test.yml`
- Added npm scripts in root `package.json`: `db:test:up`, `db:test:down`, `db:test:migrate`
- Added task file: `tasks/items/task-028-test-database-setup.md`

## Acceptance Criteria
- [ ] Create a concise changelog entry under tasks documenting these changes
- [ ] Verify prompts and orchestrator docs have consistent autonomy wording
- [ ] Add notes in `tasks/README.md` about the PR Handoff Loop and auto-resume behavior
- [ ] Ensure `ROADMAP.md` references Feature-006 critical path remains accurate post updates
- [ ] Link PR numbers where available (e.g., #42, #43)

## Implementation Notes
- Keep this chore task documentation-only; no functional changes beyond aligning wording and links
- If discrepancies found across docs, submit a single PR to reconcile phrasing and references

## Files Involved
- `/.github/agents/orchestrator-agent.md`
- `/.github/prompts/continue-work.prompt.md`
- `/.github/prompts/review-and-merge.prompt.md`
- `/.github/prompts/merge-pr.prompt.md`
- `/infra/docker-compose.test.yml`
- `/package.json`
- `/tasks/items/task-028-test-database-setup.md`

## Progress Log
- [2025-12-14 12:20] Task created (pending)
- [2025-12-14 12:25] Marked in-progress; branch chore/task-036-align-orchestrator-docs created
