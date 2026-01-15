# Ralph Loop - Continuous Autonomous Development

Launch the Continue Work command in Ralph Loop mode for fully autonomous, self-correcting development.

## ⚠️ Windows Compatibility Warning

**IMPORTANT**: The Ralph Loop plugin uses shell script (`.sh`) hooks that may not work properly on Windows. If you're on Windows and encounter errors about "stop-hook.sh" or similar, consider:

1. **Use Standard Mode instead**: `/continue-work` (without `--ralph`)
2. **Use WSL**: Run Claude Code in Windows Subsystem for Linux
3. **Use Git Bash**: Run in Git Bash environment (may have limitations)
4. **Manual iteration**: Run `/continue-work` repeatedly yourself

**Recommended for**: Linux and macOS environments

---

## What is Ralph Loop?

Ralph Loop implements the Ralph Wiggum technique - continuous AI loops with self-reference through git history. The same prompt is fed repeatedly, and Claude sees its previous work (commits, PRs, test results) on each iteration, enabling iterative improvement.

**Perfect for:**

- Overnight/weekend autonomous development
- Working through large backlogs
- Self-correcting failed builds/tests
- Minimal supervision workflows

## Quick Start

**Recommended** (built-in to continue-work):

```bash
/continue-work --ralph
/continue-work --ralph --max-iterations 50
```

**Alternative** (direct ralph-loop invocation):

```bash
/ralph-loop "Execute continue-work workflow" --completion-promise "ALL PRIORITY WORK COMPLETE" --max-iterations 100
```

Both methods achieve the same result. The first is simpler and recommended.

## How It Works

1. **Iteration 1**: Query issues, pick top priority, implement, test, PR, merge
2. **Pull main**: Claude sees new commit in git history
3. **Iteration 2**: Same prompt → Query issues again, sees previous work done
4. **Continue**: Picks next issue, implements, tests, PR, merge
5. **Repeat**: Until all priority issues done or max iterations reached
6. **Stop**: When `<promise>ALL PRIORITY WORK COMPLETE</promise>` detected

## Self-Correction Example

**Scenario**: Test fails during implementation

1. **Iteration N**: Implement feature, tests fail, create PR
2. **CI fails**: PR checks fail
3. **Iteration N+1**: Same prompt, Claude sees failed PR in git history
4. **Fix**: Analyzes failure, fixes issue, pushes to same PR
5. **CI passes**: PR merges automatically
6. **Continue**: Moves to next issue

This self-correction happens automatically without manual intervention.

## Configuration

### Max Iterations

Recommended: `100` for large backlogs, `20` for focused work

```bash
--max-iterations 100  # Runs until 100 iterations or completion
--max-iterations 20   # Stops after 20 iterations max
```

### Completion Promise

The continue-work command outputs `<promise>ALL PRIORITY WORK COMPLETE</promise>` when:

- No mvp-blocker issues remain
- No critical issues remain
- No high-priority issues remain

Ralph Loop detects this and stops automatically.

### Priority Levels

Work is pulled in this order:

1. `mvp-blocker` - Must fix before launch
2. `critical` - Blocks core functionality
3. `high-priority` - Important for current milestone

## Monitoring

### Check Progress

```bash
# View git log to see completed work
git log --oneline -20

# Check remaining issues
gh issue list --label "mvp-blocker" --state open
gh issue list --label "critical" --state open

# View recent PRs
gh pr list --state merged --limit 10
```

### Cancel Loop

```bash
/cancel-ralph
```

Removes `.claude/.ralph-loop.local.md` and stops the loop.

## Safety Features

1. **Feature branches only**: Never pushes directly to main
2. **Local testing required**: Tests must pass before PR
3. **CI validation**: PRs wait for CI before merge
4. **Issue tracking**: All work tracked in GitHub Issues
5. **Max iterations**: Prevents infinite loops

## Best Practices

### Before Starting

1. ✅ Ensure database is running (`docker compose up -d db`)
2. ✅ Pull latest main (`git checkout main && git pull`)
3. ✅ Check issue labels are correct (`gh issue list`)
4. ✅ Set realistic max-iterations

### During Execution

- Monitor git log for progress
- Check CI status: `gh run list --limit 5`
- Review PRs: `gh pr list`
- Cancel if needed: `/cancel-ralph`

### After Completion

- Review merged PRs
- Verify all acceptance criteria met
- Check production deployment status
- Close any stale branches

## Troubleshooting

### Loop Runs Forever

**Cause**: No completion promise detected
**Fix**: Check if issues are properly labeled and closed

```bash
# Verify issue states
gh issue list --state all --limit 20

# Cancel and restart
/cancel-ralph
```

### Failed Builds Block Progress

**Cause**: CI failures not self-correcting
**Solution**: Ralph Loop will retry on next iteration with full context

### Wrong Issues Being Picked

**Cause**: Label priority mismatch
**Fix**: Update issue labels

```bash
gh issue edit <NUMBER> --add-label "mvp-blocker"
gh issue edit <NUMBER> --remove-label "low-priority"
```

## Example Session

```bash
# Start Ralph Loop (recommended method)
/continue-work --ralph --max-iterations 50

# Claude begins autonomous work...
# Iteration 1: Implements issue #123, creates PR, merges
# Iteration 2: Implements issue #124, tests fail
# Iteration 3: Fixes tests, PR merges
# Iteration 4: Implements issue #125, merges
# Iteration 5: No priority issues found
# Output: <promise>ALL PRIORITY WORK COMPLETE</promise>
# Loop stops

# Review work
git log --oneline -10
gh pr list --state merged --limit 10
```

## Advanced Usage

### Focus on Specific Milestone

Before running Ralph Loop, manually query specific milestone to understand scope:

```bash
gh issue list --milestone "Sprint 3" --state open --json number,title,labels
```

Then edit `.claude/commands/continue-work.md` to prioritize that milestone's issues.

### Custom Completion Criteria

To customize when Ralph Loop stops, modify `.claude/commands/continue-work.md`:

1. Change the completion detection logic to check your custom criteria
2. Output custom promise when criteria met

**Example**: Stop after Sprint 3 issues complete

```markdown
**If all Sprint 3 issues complete**, output:
<promise>SPRINT 3 COMPLETE</promise>
```

Then invoke:

```bash
/continue-work --ralph --max-iterations 30
```

The ralph-loop plugin will detect your custom promise and stop.

## Learn More

- Ralph Wiggum Technique: https://ghuntley.com/ralph/
- Ralph Orchestrator: https://github.com/mikeyobrien/ralph-orchestrator
- Continue Work Documentation: `.claude/commands/continue-work.md`

---

**Ready to start fully autonomous development? Run the command above and let Claude work through your backlog!**
