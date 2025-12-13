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
**Purpose**: Review completed work and create pull request

**When to use:**
- Work is complete and ready for review
- All tests pass
- Ready to create PR

**What it does:**
1. Validates all acceptance criteria met
2. Runs all checks (tests, formatting, build)
3. Updates documentation
4. Updates work items and roadmap
5. Creates comprehensive PR description
6. Creates PR (after user approval)

---

## How to Use Prompt Files

### Basic Usage
Simply reference the prompt file in your message:

```
@workspace Use continue-work.prompt.md
```

or

```
Follow the workflow in .github/prompts/continue-work.prompt.md
```

### With Context
Provide additional context when needed:

```
Use breakdown-feature.prompt.md for feature-003
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
---

# Prompt Title

[Critical warnings]

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

2. **Reprioritization → Work → Review**
   - reprioritize.prompt.md
   - continue-work.prompt.md
   - review-and-merge.prompt.md

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
- [Task Management](../../tasks/AGENT.md) - Work item hierarchy
- [Project Overview](../../AGENT.md) - Architecture and conventions

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

- See [AGENT.md](../../AGENT.md) for project overview
- See [.github/agents/README.md](../agents/README.md) for agent system details
- See [tasks/AGENT.md](../../tasks/AGENT.md) for work item management
