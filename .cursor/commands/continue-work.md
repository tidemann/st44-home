Follow the workflow defined in `.github/prompts/continue-work.prompt.md`.

**AUTONOMY**: Do NOT ask for permission to proceed. Work autonomously through the entire workflow:
1. Check ROADMAP.md for priorities
2. Select next work item (epic/feature/task)
3. Break down features into tasks if needed
4. Create implementation plan
5. Implement and validate solution
6. Push and create PR
7. **CRITICAL - VERIFY CI PASSES**: 
   - Run: `gh pr checks <PR_NUMBER> --watch`
   - ONLY proceed if ALL checks pass
   - If checks fail: FIX THE ISSUE, push again, wait for CI to pass
8. Merge using `gh pr merge --squash --delete-branch`
9. Update roadmap and move completed items to done/
10. **Auto-resume**: After merge, immediately continue with next priority

**STOP AND FIX if**:
- CI fails (do NOT merge failing PRs!)
- Merge conflict occurs
- No more work items exist

**NEVER merge a PR without verifying CI status first!**

**See**: `.github/prompts/continue-work.prompt.md` for complete workflow details.
