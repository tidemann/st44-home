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

## Monitoring & Verification

### How to Verify Correct Agent Assignment

**During Development:**
1. **Check runSubagent calls**: Look for `agentName` parameter in orchestrator logs
   ```
   runSubagent({ agentName: "backend-agent", ... })  ✅ Correct
   runSubagent({ agentName: "frontend-agent", ... }) ✅ Correct
   runSubagent({ ... })                              ❌ Wrong - no agent specified
   ```

2. **Check task file metadata**: Verify `Assigned Agent` field matches actual invocation
   ```markdown
   - **Assigned Agent**: backend-agent  ← Should match runSubagent call
   ```

3. **Review agent response**: Agent should identify itself in first message
   ```
   "I'm the backend-agent, implementing task-078..."  ✅ Correct
   "Let me implement this..."                         ❌ Unclear which agent
   ```

**In Chat Logs:**
- Look for explicit agent mode switch: "You are currently running in 'backend-agent' mode"
- Verify agent name in `<modeInstructions>` section of context
- Check for agent role declaration at start of response

### How to Verify Clean Context Window

**Method 1: Check Agent's First Actions**
A clean context window means the agent should:
1. ✅ Start by reading the task file: `read_file(tasks/items/task-XXX.md)`
2. ✅ Read area-specific AGENTS.md: `read_file(apps/backend/AGENTS.md)`
3. ❌ NOT reference orchestrator conversation details
4. ❌ NOT mention previous tasks or discussions

**Method 2: Token Usage Inspection**
- Initial agent context should be ~5K-10K tokens (task file + agent spec + system prompt)
- If initial context is 30K+ tokens, it inherited orchestrator history
- Use GitHub Copilot's token counter in developer tools

**Method 3: Check for Context Leakage**
Watch for these signs of inherited context:
- ❌ Agent mentions "as we discussed earlier" (no prior discussion with this agent)
- ❌ Agent references other tasks without reading their files
- ❌ Agent knows about orchestrator's decisions without reading them
- ✅ Agent asks questions or reads files to get context

**Method 4: Inspect runSubagent Prompt**
The delegation prompt should be minimal:
```typescript
// ✅ GOOD - Minimal prompt
runSubagent({
  agentName: "backend-agent",
  prompt: "Implement task-078: Fix children CRUD API routing. Read task file for full context.",
  description: "Fix API routing bug"
})

// ❌ BAD - Verbose prompt with orchestrator context
runSubagent({
  agentName: "backend-agent",
  prompt: "Earlier we discussed the household management feature and found that... 
          (500 words of orchestrator context)...
          Now implement task-078...",
  description: "Fix API routing bug"
})
```

### Monitoring Tools

**1. Add Logging to Task Files**
Update task files to include handover tracking:
```markdown
## Handover Log
- [2025-12-19 11:30] Orchestrator: Created task, assigned to backend-agent
- [2025-12-19 11:31] Backend Agent: Started, read task file, token count: 8.2K
- [2025-12-19 11:35] Backend Agent: Completed, PR #99 created
```

**2. Agent Response Template**
Require agents to start with context declaration:
```markdown
## Context Verification
- Agent: backend-agent
- Task: task-078
- Context source: Read task-078 file + apps/backend/AGENTS.md
- Starting token count: 8,234
- Inherited orchestrator context: NO
```

**3. Create Handover Checklist**
Add to orchestrator workflow:
```
Before delegating:
- [ ] Task file is comprehensive and self-contained
- [ ] Assigned Agent field is set correctly
- [ ] Delegation prompt is minimal (<100 words)
- [ ] No orchestrator context copied into prompt

After delegation:
- [ ] Agent identified itself correctly
- [ ] Agent read task file as first action
- [ ] Agent didn't reference orchestrator discussions
- [ ] Token usage is reasonable (~5K-15K initial)
```

**4. Post-Implementation Review**
After task completion, verify:
- Agent name in PR matches task assignment
- Agent didn't exhibit knowledge it shouldn't have
- Token usage was efficient
- Implementation followed task file requirements

### Red Flags (Context Leakage)

Watch for these indicators of improper handover:
- 🚩 Agent starts working without reading task file
- 🚩 Agent references "previous conversation" or "as discussed"
- 🚩 Agent knows orchestrator's reasoning without asking
- 🚩 Initial token count > 20K (suggests inherited context)
- 🚩 Agent uses orchestrator's exact phrasing from delegation prompt
- 🚩 Agent implements something not in task file

### Success Indicators (Clean Handover)

Look for these signs of proper handover:
- ✅ Agent's first tool call is reading the task file
- ✅ Agent asks clarifying questions when needed
- ✅ Agent reads AGENTS.md for area-specific context
- ✅ Initial token count 5K-15K (task + agent spec only)
- ✅ Agent explicitly states "reading task-078 for requirements"
- ✅ Implementation matches task file exactly

## Testing Strategy
1. Measure token usage before/after on sample tasks
2. Run task-078 with new pattern, compare to old pattern
3. Verify agents successfully read task files
4. Confirm agents don't reference orchestrator context
5. Check PR quality remains high
6. **Monitor handover using checklist above**
7. **Review token counts at agent initialization**
8. **Check for context leakage indicators**

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
