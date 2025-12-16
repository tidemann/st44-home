Follow the workflow defined in `.github/prompts/merge-pr.prompt.md`.

This is an alias to the unified review-and-merge workflow. It handles:
- CI wait and merging
- Accepts handoff (PR number or branch)
- Creates PR if missing
- Waits for CI checks
- Merges with squash and deletes branch
- Signals Orchestrator to resume continue-work

**Note**: Prefer using `/review-and-merge` for the unified workflow.

**See**: `.github/prompts/merge-pr.prompt.md` and `.github/prompts/review-and-merge.prompt.md` for complete workflow details.

