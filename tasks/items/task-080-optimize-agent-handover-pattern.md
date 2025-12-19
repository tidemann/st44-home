# Task: Optimize Agent Handover Pattern for Clean Context Windows

## Metadata
- **ID**: task-080
- **Feature**: Agent System Optimization
- **Epic**: N/A (Meta - Agent System)
- **Status**: pending
- **Priority**: medium
- **Created**: 2025-12-19
- **Assigned Agent**: system-agent
- **Estimated Duration**: 2-3 hours

## Description
Redesign the handover pattern from Orchestrator Agent to specialized agents (backend, frontend, database) to minimize token usage by providing clean, focused context windows. Currently agents may inherit unnecessary context from the orchestrator, leading to higher token costs and cluttered context.

## Problem
- Specialized agents receive full orchestrator context when delegated to
- Token usage accumulates across agent invocations
- Agents have access to irrelevant conversation history
- Context window pollution increases costs
- Harder for agents to focus on specific task

## Goal
Each specialized agent should start with:
1. **Minimal context**: Only what's needed for their specific task
2. **Clean slate**: No orchestrator conversation history
3. **Focused instructions**: Task file + relevant code context only
4. **Fresh token budget**: Not inheriting previous agent's usage

## Requirements

### Handover Pattern Options

**Option 1: File-Based Handover** (Recommended)
```
1. Orchestrator creates/updates task file with all context
2. Orchestrator invokes agent with: "Implement task-078-fix-children-api.md"
3. Agent reads task file as primary context
4. Agent reads only referenced files (backend routes, services)
5. Agent implements and creates PR
6. Agent writes result back to task file
```

**Option 2: Handover Document**
```
1. Orchestrator creates tasks/handover/task-078-brief.md
2. Brief contains: task goal, files to modify, acceptance criteria
3. Agent reads brief, implements, deletes brief when done
```

**Option 3: Minimal Delegation Prompt**
```typescript
runSubagent({
  agentName: "backend-agent",
  prompt: `Implement task-078: Fix children CRUD API routing.
  
  Task file: tasks/items/task-078-fix-children-crud-api-routing.md
  Read the task file for full context and requirements.
  Create feature branch, implement fix, run tests, create PR.`,
  description: "Fix children API routing"
})
```

### Agent Initialization Pattern
When specialized agent starts:
1. Read assigned task file
2. Read AGENTS.md for area-specific context
3. Search/read only files mentioned in task
4. Implement solution
5. No access to orchestrator's conversation history

### Task File as Contract
Task files should be comprehensive enough to serve as standalone context:
- Clear problem description
- Investigation steps
- Expected solution approach
- Files to check/modify
- Acceptance criteria
- Testing requirements

## Current State Analysis

### Current Handover (Likely Pattern)
```
Orchestrator → runSubagent(longPrompt + full context) → Backend Agent
```
- Backend agent receives orchestrator's full chat history
- Token usage includes all orchestrator context
- Expensive and cluttered

### Desired Handover
```
Orchestrator → Create/update task file → runSubagent(minimal prompt) → Backend Agent
Backend Agent → Read task file + AGENTS.md → Focused implementation
```
- Backend agent starts fresh
- Only reads task file + relevant code
- Lower token usage
- Clearer focus

## Implementation Steps

### 1. Update Orchestrator Agent Specification
- Document file-based handover pattern
- Provide template for delegation prompts
- Emphasize task file completeness
- Remove verbose delegation prompts

### 2. Update Specialized Agent Specifications
- Start by reading assigned task file
- Read area-specific AGENTS.md (apps/backend/AGENTS.md)
- Search for files mentioned in task
- No assumption of prior context

### 3. Create Handover Template
```markdown
# Task Handover: task-XXX

Agent: [backend-agent|frontend-agent|database-agent]
Priority: [high|medium|low]

## Your Assignment
Read and implement: tasks/items/task-XXX-description.md

## Quick Context
- Feature: [feature-XXX]
- Type: [bug-fix|feature|enhancement]
- Estimated: [X hours]

## Starting Points
- Task file has full requirements
- Check [specific AGENTS.md] for patterns
- Files likely involved: [list]

## Success
- All acceptance criteria met
- Tests pass
- PR created and merged
```

### 4. Update Prompts
Update `.github/prompts/` to use minimal delegation:
- Reference task file path
- Trust agent to read what they need
- Avoid copying full requirements into prompt

## Acceptance Criteria
- [ ] Orchestrator delegation prompts are minimal (<100 words)
- [ ] Specialized agents start by reading task file
- [ ] Task files are comprehensive enough to stand alone
- [ ] Agents don't inherit orchestrator conversation history
- [ ] Token usage per agent invocation reduced by 30-50%
- [ ] Agent focus improved (no irrelevant context)
- [ ] Handover pattern documented in agent specs
- [ ] All agent specs updated with new pattern

## Benefits
- **Lower costs**: Reduced token usage per task
- **Clearer focus**: Agents see only relevant context
- **Better scaling**: Can run more tasks in parallel
- **Simpler debugging**: Each agent's context is traceable
- **Faster execution**: Less context to process

## Testing Strategy
1. Measure token usage before/after on sample tasks
2. Run task-078 with new pattern, compare to old pattern
3. Verify agents successfully read task files
4. Confirm agents don't reference orchestrator context
5. Check PR quality remains high

## Files to Update
- `.github/agents/orchestrator-agent.md` - Handover pattern
- `.github/agents/backend-agent.md` - Initialization pattern
- `.github/agents/frontend-agent.md` - Initialization pattern
- `.github/agents/database-agent.md` - Initialization pattern
- `.github/agents/system-agent.md` - Document pattern
- `.github/prompts/continue-work.prompt.md` - Minimal delegation
- `.github/prompts/breakdown-feature.prompt.md` - Task file emphasis

## Related Work
- Complements task-079 (skip deployments for docs)
- Improves agent system efficiency
- Enables better parallel task execution
- Foundation for future agent improvements

## Progress Log
- [2025-12-19 11:30] Task created to optimize agent handover pattern
