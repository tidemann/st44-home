# Agent Prompt Files

This directory contains prompt files that trigger specific work operations in the AI agent system.

## What are Prompt Files?

Prompt files are `.prompt.md` files that serve as pre-configured instructions for the AI agent. When you reference one of these files in your conversation, it activates a specific workflow with predefined steps, constraints, and success criteria.

## Available Prompts

### [continue-work.prompt.md](continue-work.prompt.md)
**Agent**: Orchestrator  
**Purpose**: Continue work on the next priority from the roadmap

**When to use:**
- Starting a new work session
- Ready to pick up the next item
- Want agent to autonomously continue progress

**What it does:**
1. Checks ROADMAP.md for priorities
2. Selects next work item (epic/feature/task)
3. Breaks down features into tasks if needed
4. Creates implementation plan
5. Coordinates with expert agents
6. Implements and validates solution
7. Updates roadmap and moves to done/

---

### [breakdown-feature.prompt.md](breakdown-feature.prompt.md)
**Agent**: Orchestrator  
**Purpose**: Break down a feature into implementation tasks

**When to use:**
- Feature created but no tasks yet
- Feature is too complex to implement directly
- Need to plan implementation sequence

**What it does:**
1. Analyzes feature requirements
2. Identifies affected layers (DB/backend/frontend)
3. Creates task files for each component
4. Sequences tasks with dependencies
5. Updates feature file with task list
6. Updates ROADMAP.md with priorities

---

### [plan-feature.prompt.md](plan-feature.prompt.md)
**Agent**: Planner  
**Purpose**: Plan a new feature with strategic analysis

**When to use:**
- Have an idea for a new feature
- Need to define scope and requirements
- Want strategic analysis before implementation

**What it does:**
1. Analyzes problem and user needs
2. Defines user stories and value
3. Creates acceptance criteria
4. Assesses technical scope
5. Identifies dependencies
6. Creates feature file
7. Adds to ROADMAP.md

---

### [reprioritize.prompt.md](reprioritize.prompt.md)
**Agent**: Planner  
**Purpose**: Reorganize roadmap based on current state

**When to use:**
- Priorities have changed
- Roadmap is out of date
- Need to reorganize Now/Next/Later
- Completed work needs archiving

**What it does:**
1. Reviews current roadmap state
2. Identifies completed/blocked items
3. Assesses new priorities
4. Reorganizes Now/Next/Later/Backlog
5. Updates ROADMAP.md
6. Archives completed work

---

### [review-and-merge.prompt.md](review-and-merge.prompt.md)
**Agent**: Orchestrator  
**Purpose**: Unified review, PR creation, CI wait, and merge workflow (handoff-aware)

**When to use:**
- Orchestrator hands off after pushing a feature branch
- PR exists and needs CI wait + merge
- No PR yet; need to create and then merge when checks pass

**Handoff support:**
- Accepts `handoff` input: PR number or feature branch name
- If no handoff provided, auto-discovers open PRs (prefers current branch’s PR)

**What it does:**
1. Validates acceptance criteria and runs checks (format, test, build)
2. Updates docs and work items
3. Ensures a PR exists (creates if missing)
4. Waits for GitHub CI checks to complete
5. If checks fail, returns to Orchestrator to fix and re-push
6. If checks pass, merges via squash and deletes branch
7. Signals Orchestrator to resume `continue-work.prompt.md`

---

### [merge-pr.prompt.md](merge-pr.prompt.md)
**Agent**: Orchestrator  
**Purpose**: Alias to unified review-and-merge; handles CI wait and merging

**Usage:** Prefer using `review-and-merge.prompt.md`. This alias:
- Accepts handoff (PR number or branch)
- Creates PR if missing
- Waits for CI checks
- Merges with squash and deletes branch
- Signals Orchestrator to resume continue-work


### Basic Usage
```
@workspace Use continue-work.prompt.md
```

or

```
Follow the workflow in .github/prompts/continue-work.prompt.md
```

### With Context
### Invocation Patterns (Handoff)

You can pass a handoff argument (PR number or branch name) to the unified review/merge flow:

```
# Operate on a specific PR
review-and-merge.prompt.md --handoff 41

# Operate on a specific feature branch
review-and-merge.prompt.md --handoff feature/task-027-playwright-setup

# No handoff provided → auto-discover open PRs
review-and-merge.prompt.md
```

After merge, the Orchestrator auto-resumes `continue-work.prompt.md`.
Provide additional context when needed:

```
### Sequential Prompts
Chain prompts for complete workflows:

```
1. Use plan-feature.prompt.md to plan user authentication
2. Then use breakdown-feature.prompt.md to create tasks
3. Finally use continue-work.prompt.md to start implementation
```

## Prompt File Format

Each prompt file follows this structure:

```markdown
---
description: Brief description of what this prompt does
agent: primary-agent-name

## Your Task
[Step-by-step instructions]

## Constraints
[Rules and limitations]

## Success Criteria
[Checklist of what must be accomplished]

## Reference Documentation
[Links to related files]
```

## Best Practices

### When to Use Prompts
- ✅ Starting structured workflows
- ✅ Need consistent process execution
- ✅ Want autonomous task completion
- ✅ Complex multi-step operations

### When Not to Use Prompts
- ❌ Simple one-off questions
- ❌ Quick fixes or edits
- ❌ Exploratory analysis
- ❌ When you need custom workflow

### Combining Prompts
Prompts can be combined for larger workflows:

1. **Planning → Breakdown → Implementation**
   - plan-feature.prompt.md
   - breakdown-feature.prompt.md
   - continue-work.prompt.md

2. **Implementation → Review/Merge (Unified) → Auto-Resume**
   - continue-work.prompt.md (implements and pushes feature branch)
   - review-and-merge.prompt.md (handoff-aware: create or use PR, wait for CI, squash-merge, delete branch)
   - Orchestrator auto-resumes continue-work after merge

3. **Complete Feature Workflow (Unified)**
   - plan-feature.prompt.md (define feature)
   - breakdown-feature.prompt.md (create tasks)
   - continue-work.prompt.md (implement tasks and push branch)
   - review-and-merge.prompt.md (create PR if missing, wait for CI, merge)
   - Auto-resume continue-work to pick next priority

## Creating New Prompts

To create a new prompt file:

1. Copy an existing prompt as template
2. Update frontmatter (description, agent)
3. Define clear step-by-step tasks
4. Add constraints and success criteria
5. Link to reference documentation
6. Test the prompt thoroughly
7. Document it in this README

## Related Documentation

- [Agent System Overview](../agents/README.md) - Complete agent specifications
- [Orchestrator Agent](../agents/orchestrator-agent.md) - Main coordination workflow
- [Planner Agent](../agents/planner-agent.md) - Strategic planning
- [Task Management](../../tasks/AGENTS.md) - Work item hierarchy
- [Project Overview](../../AGENTS.md) - Architecture and conventions

## Maintenance

### Updating Prompts
When codebase or workflows change:
1. Review affected prompt files
2. Update instructions to match new patterns
3. Update reference documentation links
4. Test prompts with updated workflows
5. Document changes in commit message

### Adding New Prompts
When creating new workflows:
1. Identify need for standardized process
2. Create prompt file with clear structure
3. Test prompt with real scenarios
4. Document in this README
5. Reference from agent specifications if needed

## Questions?

- See [AGENTS.md](../../AGENTS.md) for project overview
- See [.github/agents/README.md](../agents/README.md) for agent system details
- See [tasks/AGENTS.md](../../tasks/AGENTS.md) for work item management
