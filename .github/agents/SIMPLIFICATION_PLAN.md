# Agent System Simplification Plan

**Status**: Future Consideration  
**Created**: December 13, 2025  
**Context**: After dry run evaluation, identified potential over-engineering

## Overview

The current agent system is comprehensive and functional, but may be over-engineered for a project of this size. This document captures potential simplifications to consider as the system matures.

## Current State Analysis

### What Works Well (Keep)

1. **Orchestrator Agent** - Core coordinator, essential
2. **Expert Agents** (Frontend, Backend, Database) - Domain expertise valuable
3. **Feature → Task workflow** - Basic work breakdown needed
4. **Task templates** - Provides structure and consistency
5. **Key AGENT.md files** - Living documentation at strategic locations

### Potential Over-Engineering

#### 1. Subtasks Directory
- **Issue**: Created but never used during dry run
- **Current State**: `tasks/subtasks/` with README but no actual subtask files
- **Simplification**: Delete entirely - task files are detailed enough
- **Impact**: Minimal - tasks are self-contained

#### 2. System Agent
- **Issue**: Meta-agent for maintaining agents
- **Current State**: `system-agent.md` (1,200+ lines)
- **Simplification**: Remove - user + Copilot can maintain system directly
- **Impact**: One less agent to maintain, simpler mental model

#### 3. Planner Agent
- **Issue**: Planning overlaps heavily with orchestration
- **Current State**: Separate `planner-agent.md` (600+ lines)
- **Simplification**: Merge planning responsibilities into Orchestrator Agent
- **Rationale**: ROADMAP.md + enhanced Orchestrator = sufficient
- **Impact**: One less agent, clearer responsibility boundaries

#### 4. Epic Level in Hierarchy
- **Issue**: Epic → Feature → Task may be overkill for small projects
- **Current State**: Epic templates and folders exist but unused
- **Simplification**: Make epics optional, use only for large initiatives
- **Impact**: Simpler workflow for most work

#### 5. Five Separate Prompt Files
- **Issue**: 5 prompt files with overlapping concerns
- **Current State**: 
  - `continue-work.prompt.md`
  - `breakdown-feature.prompt.md`
  - `plan-feature.prompt.md`
  - `reprioritize.prompt.md`
  - `review-and-merge.prompt.md`
- **Simplification**: Consolidate into 2 files:
  - `orchestrator-cycle.prompt.md` (roadmap → breakdown → implement)
  - `pr-workflow.prompt.md` (review → create PR)
- **Impact**: Fewer files, easier maintenance

#### 6. Seven AGENT.md Files
- **Issue**: Documentation at many levels, some with minimal content
- **Current State**: Root, .github, apps/backend, apps/frontend, infra, docker, tasks
- **Simplification**: Keep only 3-4 essential ones:
  - Root (project overview)
  - apps/backend (Fastify + PostgreSQL patterns)
  - apps/frontend (Angular + signals patterns)
  - Optional: tasks (work management patterns)
- **Remove**: .github, infra, docker (merge into root or app-specific)
- **Impact**: Less documentation to maintain, still covers all patterns

#### 7. Done/ Folders Throughout
- **Issue**: Status field makes done/ folders somewhat redundant
- **Current State**: done/ subfolders in epics/, features/, tasks/
- **Consideration**: Status field alone might be sufficient
- **Keep for now**: Good for examples and historical reference
- **Future**: Consider alternative archival strategy

## Simplification Options

### Option 1: Aggressive Simplification (Recommended for Current Project Size)

**Agents** (3 total):
- `orchestrator-agent.md` - Includes planning, coordination, breakdown
- `frontend-agent.md` - Angular, UI, components
- `backend-agent.md` - Fastify API + PostgreSQL (merged)

**Workflows** (2 prompt files):
- `orchestrator-cycle.prompt.md` - Full work cycle from roadmap to tasks
- `pr-workflow.prompt.md` - Review and merge workflow

**Work Hierarchy**:
- `tasks/ROADMAP.md` - Strategic planning
- `tasks/features/*.md` - Primary work level
- `tasks/tasks/*.md` - Implementation level
- `tasks/templates/` - 2 templates (feature, task only)
- No epics until actually needed
- No subtasks directory

**Documentation** (3 AGENT.md files):
- Root - Project overview, architecture, standards
- apps/backend - Backend-specific patterns
- apps/frontend - Frontend-specific patterns

**Result**: ~60% reduction in files/complexity, same core functionality

### Option 2: Moderate Simplification (Middle Ground)

**Agents** (5 total):
- Keep Orchestrator, Frontend, Backend, Database separate
- Remove System Agent only

**Workflows** (3 prompt files):
- Consolidate related workflows but keep some separation
- `work-cycle.prompt.md` - Continue work + breakdown
- `planning.prompt.md` - Plan feature + reprioritize
- `pr-workflow.prompt.md` - Review and merge

**Work Hierarchy**:
- Keep epic templates but empty directory
- Feature → Task as primary workflow
- Remove subtasks directory

**Documentation** (4 AGENT.md files):
- Remove: docker, infra, tasks
- Keep: root, .github, apps/backend, apps/frontend

**Result**: ~40% reduction, maintains more separation

### Option 3: Keep Current System (Status Quo)

**Rationale**:
- System is comprehensive and works
- May grow into it as project scales
- Documentation is thorough
- Premature optimization concern

**Considerations**:
- More files to maintain
- Higher cognitive load for new contributors
- Some files may remain underutilized

## Decision Criteria

Consider simplification when:
- ✅ Agents rarely used in practice
- ✅ Documentation not being updated
- ✅ Workflows too complex for team size
- ✅ Maintenance burden outweighs value

Keep current system if:
- ❌ Team is growing rapidly
- ❌ Project complexity increasing significantly
- ❌ Multiple people working simultaneously
- ❌ System working smoothly without confusion

## Migration Path (If Simplifying)

### Phase 1: Merge Agents
1. Merge Planner responsibilities into Orchestrator
2. Merge Database into Backend Agent
3. Archive System Agent (delete or move to archive/)
4. Update agent README.md

### Phase 2: Consolidate Prompts
1. Combine related prompt files
2. Update references in agent specs
3. Test consolidated workflows
4. Archive old prompt files

### Phase 3: Reduce Documentation
1. Identify AGENT.md files with minimal unique content
2. Merge content into parent or sibling files
3. Update cross-references
4. Delete redundant files

### Phase 4: Simplify Hierarchy
1. Remove subtasks directory
2. Make epic directory optional (rename to epics-archive or similar)
3. Update templates
4. Update Orchestrator workflow

### Phase 5: Validation
1. Test simplified system with real feature
2. Gather feedback on usability
3. Iterate based on learnings
4. Document new simplified workflow

## Timeline

- **Not urgent** - Current system works
- **Revisit after**: 5-10 features implemented
- **Trigger**: If maintenance becomes burdensome
- **Estimated effort**: 2-4 hours for full simplification

## Metrics to Track

To decide if/when to simplify:

**Usage Metrics**:
- How often is Planner Agent invoked separately from Orchestrator?
- Are subtask instructions ever created?
- Are epics being used?
- Which AGENT.md files are actually referenced?

**Maintenance Metrics**:
- Time spent keeping documentation current
- Confusion when onboarding new contributors
- Agents getting out of sync with codebase

**Value Metrics**:
- Does system enable autonomous development?
- Are features being broken down effectively?
- Is coordination between agents smooth?

## References

- Dry run evaluation: December 13, 2025
- System achieved 85% readiness with current design
- Core workflows validated successfully
- Over-engineering identified as potential future concern

## Last Updated

December 13, 2025 - Initial plan created based on dry run findings
