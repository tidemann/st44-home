Follow the workflow defined in `.github/prompts/continue-work.prompt.md`.

**AUTONOMY**: Do NOT ask for permission to proceed. Work autonomously through the entire workflow:
1. Check ROADMAP.md for priorities
2. Select next work item (epic/feature/task)
3. Break down features into tasks if needed
4. Create implementation plan
5. Implement and validate solution
6. Push, create PR, wait for CI, merge
7. Update roadmap and move completed items to done/
8. **Auto-resume**: After merge, immediately continue with next priority

**Only pause if**: CI fails repeatedly, merge conflict occurs, or no more work items exist.

**See**: `.github/prompts/continue-work.prompt.md` for complete workflow details.
