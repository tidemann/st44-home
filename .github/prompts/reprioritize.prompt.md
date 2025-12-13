---
description: Reprioritize the roadmap based on current state and goals
agent: planner-agent
---

# Reprioritize Roadmap

Use this prompt when the roadmap needs to be reorganized based on changing priorities, completed work, or new insights.

## Your Task

1. **Review current state**:
   - Read [ROADMAP.md](../../tasks/ROADMAP.md)
   - Check what's in Now, Next, Later, Backlog
   - Identify completed items that should be archived
2. **Scan work items**:
   - Review `tasks/epics/` for active epics
   - Review `tasks/features/` for pending/in-progress features
   - Review `tasks/tasks/` for pending/in-progress tasks
3. **Assess progress**:
   - What's completed but not moved to done/?
   - What's blocked and why?
   - What's taking longer than expected?
4. **Gather context**:
   - Ask user about current priorities
   - Understand any changed business goals
   - Identify new urgent needs
5. **Analyze dependencies**:
   - What must be done before other work can start?
   - What's blocking high-priority items?
   - What can be done in parallel?
6. **Reorganize roadmap**:
   - **Now** (3-5 items): Immediate priorities, actively being worked on
   - **Next** (5-8 items): Queue for upcoming work, well-defined
   - **Later** (5-10 items): Future considerations, less defined
   - **Backlog**: Ideas and possibilities, minimal detail
7. **Update ROADMAP.md**:
   - Move completed items to done/ folders
   - Promote Next → Now as capacity opens
   - Promote Later → Next as items become clearer
   - Add new items to appropriate section
   - Document rationale for major changes
8. **Get confirmation**: Present reorganized roadmap to user for approval

## Prioritization Factors

### High Priority
- Blocking other work
- Critical user needs
- Security or data integrity issues
- Quick wins with high value
- Dependencies for upcoming features

### Medium Priority
- User-facing improvements
- Technical debt that affects velocity
- Performance optimizations
- Features with clear user demand

### Low Priority
- Nice-to-have enhancements
- Speculative features
- Minor optimizations
- Experimental work

## Roadmap Section Guidelines

### Now (3-5 items)
- Currently in progress or starting immediately
- Well-defined with clear acceptance criteria
- Have capacity/resources to complete
- Expected to finish in current sprint/iteration
- No blockers

### Next (5-8 items)
- Starting soon (next sprint/iteration)
- Mostly defined, may need some refinement
- Dependencies are clear
- Will move to Now as current work completes
- Minimal blockers

### Later (5-10 items)
- Future work (2+ sprints away)
- May need more definition
- Good to have but not urgent
- Can be reprioritized as needed
- May have dependencies

### Backlog (unlimited)
- Ideas and possibilities
- Needs more investigation
- Low priority or unclear value
- Can be refined later
- May never be implemented

## Example Reorganization

**Before:**
- Now: 8 items (too many, unfocused)
- Next: 2 items (underpopulated)
- Task-015: In-progress but blocked by Task-010

**After:**
- Now: 4 items (focused, achievable)
- Next: 6 items (good queue)
- Task-010: Moved to top of Now (unblocking Task-015)
- Task-015: Moved to Next (until blocker resolved)

**Rationale:**
- Reduced Now to achievable set
- Prioritized blocker resolution
- Moved blocked work to Next temporarily

## Success Criteria

- [ ] All sections reviewed (epics/features/tasks)
- [ ] Completed items moved to done/ folders
- [ ] ROADMAP.md Now section has 3-5 focused items
- [ ] ROADMAP.md Next section has 5-8 queued items
- [ ] Dependencies and blockers identified
- [ ] High-priority blockers moved to Now
- [ ] User confirms new prioritization
- [ ] Rationale documented for major changes

## Reference Documentation

- [tasks/ROADMAP.md](../../tasks/ROADMAP.md) - Product roadmap
- [Planner Agent](../../.github/agents/planner-agent.md) - Strategic planning
- [tasks/AGENT.md](../../tasks/AGENT.md) - Work item management
