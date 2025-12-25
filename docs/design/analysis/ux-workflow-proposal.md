# UX Workflow Proposal - Household Task Management

**Issue:** #184
**Selected Aesthetic:** Proposal 5 (Playful & Modern)
**Date:** December 24, 2025

---

## The Core Problem You Identified

**You're absolutely right.** The design proposals show what things look like, but they don't solve the fundamental question:

> **How should users actually manage tasks in their household?**

The current app just throws features onto pages with no clear workflow or thought process. We need to define:

- How tasks are created, assigned, and completed
- How users navigate between different areas
- What the primary user journeys are
- How information is organized and prioritized

Let's solve this properly.

---

## Core User Goals (What People Actually Want to Do)

### Primary Goals

1. **See what needs to be done today** (at a glance)
2. **Add a new task quickly** (minimal friction)
3. **Complete a task and feel rewarded** (motivation)
4. **Know who's doing what** (family coordination)
5. **Track progress and points** (gamification/fairness)

### Secondary Goals

6. **Manage repeating tasks** (chores that recur)
7. **Invite family members** (onboarding)
8. **Adjust household settings** (occasional)
9. **View history and achievements** (reflection)

### Current Problem

The app treats all these goals equally, putting everything on the same level. **We need hierarchy and prioritization.**

---

## Proposed Information Architecture

### Level 1: Primary Navigation (Always Accessible)

```
┌─────────────────────────────────────────────────────────┐
│  🏠 Home  |  ✓ Tasks  |  👥 Family  |  🏆 Progress     │
└─────────────────────────────────────────────────────────┘
```

**4 Main Sections** (bottom navigation on mobile, sidebar on desktop):

1. **🏠 Home (Dashboard)** - Default view, at-a-glance overview
2. **✓ Tasks** - Full task management (create, view all, filter, history)
3. **👥 Family** - Household members and settings
4. **🏆 Progress** - Points, achievements, leaderboards

### Level 2: Section Structure

#### 🏠 HOME (Dashboard)

- **Quick Stats** (today's tasks, weekly progress, total points)
- **Today's Focus** (tasks due today, prioritized)
- **Quick Add Button** (always visible, floating)
- **Recent Activity** (last completed tasks, new assignments)

#### ✓ TASKS

- **All Tasks View** (filterable list)
- **Filters:** All / My Tasks / By Person / By Date / Completed
- **Create Task** (detailed form)
- **Task Templates** (common household tasks)
- **Recurring Tasks Setup**

#### 👥 FAMILY

- **Members List** (who's in the household)
- **Invite Member** (add new people)
- **Household Settings** (name, preferences)
- **Member Profiles** (individual stats, task history)

#### 🏆 PROGRESS

- **Points Leaderboard** (friendly competition)
- **Achievements/Badges** (milestones reached)
- **Statistics** (completion rates, trends)
- **History** (past week/month activity)

---

## Primary User Workflows

### Workflow 1: Daily Task Check (Most Common)

**User Goal:** "What do I need to do today?"

```
1. Open app → Lands on HOME dashboard
2. See "Today's Focus" section with tasks
3. Tap task to see details
4. Complete task with one tap
5. See celebration animation + points awarded
6. Return to dashboard (automatically)
```

**Key Decisions:**

- ✅ Dashboard is default view (not task list)
- ✅ Focus on TODAY's tasks first
- ✅ One-tap completion for simple tasks
- ✅ Immediate positive feedback (animation + points)
- ✅ No navigation required for most common flow

**Current Problem:** App shows all tasks equally, no focus on "today"

---

### Workflow 2: Quick Task Creation (High Frequency)

**User Goal:** "I need to add a chore right now"

**Quick Path (Simple Tasks):**

```
1. Tap floating "+" button (visible on all screens)
2. Quick-add modal appears
   ├── Task name (required)
   ├── Who does it (dropdown)
   ├── Points (suggested: 5)
   └── [Create] button
3. Task created → Returns to previous screen
4. Success toast: "Task added! ⭐"
```

**Detailed Path (Complex Tasks):**

```
1. Navigate to Tasks section
2. Tap "New Quest" button
3. Full form opens:
   ├── Name (required)
   ├── Description (optional)
   ├── Assign to (required)
   ├── Points (required)
   ├── Type: Daily / Weekly / Repeating / One-time
   ├── Due date (if one-time)
   └── Recurrence settings (if repeating)
4. [Create Task] button
5. Navigate to task detail view
```

**Key Decisions:**

- ✅ Two creation paths: Quick (floating button) vs. Detailed (Tasks section)
- ✅ Quick path optimized for 80% of tasks
- ✅ Floating "+" button always accessible
- ✅ Smart defaults to reduce decisions
- ✅ Clear required vs. optional fields

**Current Problem:** Only one creation path (modal), doesn't distinguish simple vs. complex

---

### Workflow 3: Task Assignment & Management

**User Goal:** "Set up chores for the week"

```
1. Navigate to Tasks → All Tasks
2. Filter view:
   ├── All Tasks (default)
   ├── My Tasks
   ├── By Person (dropdown: Alex, Jordan, Sarah, Marcus)
   ├── By Date (Today, Tomorrow, This Week, Custom)
   └── Status (Active, Completed, Overdue)
3. View filtered task list
4. Tap task → Task Detail View opens:
   ├── Task name & description
   ├── Assigned to (with avatar)
   ├── Points value
   ├── Type & recurrence
   ├── History (completions if recurring)
   ├── [Edit] [Delete] [Reassign] buttons
5. Make changes → Save
6. Return to filtered list
```

**Key Decisions:**

- ✅ Persistent filters (remember last selection)
- ✅ Visual filtering, not buried in menus
- ✅ Task detail is separate view (not modal)
- ✅ Clear actions: Edit, Delete, Reassign
- ✅ Show history for context

**Current Problem:** No filtering, can't see tasks by person or date

---

### Workflow 4: Task Completion & Rewards

**User Goal:** "Mark this chore as done and get credit"

**Simple Completion:**

```
1. From Dashboard or Tasks list
2. Tap checkmark button on task card
3. Celebration animation plays:
   ├── Confetti burst
   ├── "+10 points" flies to points counter
   └── Task card fades out with success color
4. Points added to user's total
5. If achievement unlocked → Badge popup
6. Task removed from active list
```

**With Verification (Optional Setting):**

```
1. Tap checkmark button
2. "Complete task?" confirmation appears
   ├── Optional: Upload photo proof
   └── Optional: Add completion note
3. [Confirm Completion] button
4. Same celebration sequence
```

**Key Decisions:**

- ✅ One-tap completion by default (trust-based)
- ✅ Optional verification for specific tasks
- ✅ Immediate, satisfying feedback
- ✅ Visual reward (animation + points counter update)
- ✅ Achievement system for milestones

**Current Problem:** No completion workflow shown, no rewards/feedback

---

### Workflow 5: Family Member Management

**User Goal:** "Add my partner and kids to the household"

**Inviting Adults:**

```
1. Navigate to Family section
2. Tap "Invite Member" button
3. Invitation form:
   ├── Email address
   ├── Role: Parent / Adult
   └── Optional: Personal message
4. [Send Invitation] button
5. Email sent → Invitation appears in "Pending" list
6. When accepted → Member appears in household
```

**Adding Children:**

```
1. Navigate to Family → Members
2. Tap "+ Add Child" button
3. Child form:
   ├── Name
   ├── Age (or birthdate)
   └── Avatar/emoji selector
4. [Add Child] button
5. Child appears in household immediately (no email)
6. Child gets login credentials generated
```

**Viewing Members:**

```
Family Screen Layout:
├── Your Household: "The Smith Family"
├── Members (4)
│   ├── Sarah (You) - Parent - 125 pts this week
│   ├── Marcus - Parent - 98 pts this week
│   ├── Alex - Child (15) - 87 pts this week
│   └── Jordan - Child (12) - 56 pts this week
├── [Invite Member] button
├── [Add Child] button
└── Pending Invitations (if any)
```

**Tap Member → Member Profile:**

```
├── Avatar & Name
├── Role & Stats
├── Recent Tasks (last 10)
├── Total Points (all time)
├── This Week's Progress (bar chart)
├── [View All Tasks] button
└── [Edit Member] button (admin only)
```

**Key Decisions:**

- ✅ Different flows for adults (invite) vs. children (direct add)
- ✅ Clear role distinction (Parent = admin, Child = limited)
- ✅ Member profiles show individual stats
- ✅ Household-level view shows everyone's contribution
- ✅ Simple, visual member cards

**Current Problem:** Current settings page is overwhelming, mixes everything together

---

## Navigation Structure & Screen Hierarchy

### Mobile Navigation (Primary)

**Bottom Navigation Bar** (Always Visible):

```
┌─────────┬─────────┬─────────┬─────────┐
│    🏠   │    ✓    │    👥   │    🏆   │
│   Home  │  Tasks  │  Family │ Progress│
└─────────┴─────────┴─────────┴─────────┘
```

**Floating Action Button** (Context-Aware):

- On Home → Quick add task
- On Tasks → Quick add task
- On Family → Invite member
- On Progress → (hidden)

### Desktop Navigation (Secondary)

**Left Sidebar:**

```
┌─────────────────────┐
│  🏠 Household Hero  │
│                     │
│  🏠  Home           │
│  ✓   Tasks          │
│  👥  Family         │
│  🏆  Progress       │
│                     │
│  ─────────────────  │
│                     │
│  ⚙️   Settings      │
│  👤  Profile        │
│  🚪  Logout         │
└─────────────────────┘
```

---

## Screen-by-Screen Breakdown

### Screen 1: HOME (Dashboard) - Default View

**Purpose:** Quick overview, today's focus, motivation

**Layout:**

```
┌──────────────────────────────────────────┐
│  Good morning, Sarah! 👋                 │
│  Let's crush those tasks today! 💪       │
│                                          │
│  ┌──────┐  ┌──────┐  ┌──────┐         │
│  │ 🎯 4 │  │ 🔥12 │  │ ⭐340│         │
│  │Active│  │Week  │  │Total │         │
│  └──────┘  └──────┘  └──────┘         │
│                                          │
│  🚀 TODAY'S QUESTS                      │
│  ┌────────────────────────────────────┐ │
│  │ ✓ Clean bathroom        Alex  10pt│ │
│  │ ✓ Take out recycling  Jordan  5pt │ │
│  │ ✓ Water plants         Sarah  3pt │ │
│  └────────────────────────────────────┘ │
│                                          │
│  📅 COMING UP THIS WEEK                 │
│  - Tomorrow: Vacuum living room         │
│  - Thursday: Grocery shopping           │
│                                          │
│  [+ New Quest]                          │
└──────────────────────────────────────────┘
```

**Key Elements:**

- Greeting (personalized, time-aware)
- Quick stats (visual, scannable)
- Today's tasks (prioritized, actionable)
- Coming up (preview, planning)
- Quick add button

**Interactions:**

- Tap stat → Navigate to Progress screen
- Tap task → Expand detail OR quick complete
- Swipe task → Complete / Edit / Delete
- Tap "+ New Quest" → Quick add modal

---

### Screen 2: TASKS (Full Management)

**Purpose:** View all tasks, filter, manage, create detailed tasks

**Layout:**

```
┌──────────────────────────────────────────┐
│  ✓ Tasks                        [Filter]│
│                                          │
│  Filters: ⦿All  ○My Tasks  ○By Person  │
│                                          │
│  Active (4)                              │
│  ┌────────────────────────────────────┐ │
│  │ ✓  Clean bathroom                  │ │
│  │    Alex · Repeating          10pts │ │
│  │────────────────────────────────────│ │
│  │ ✓  Take out recycling              │ │
│  │    Jordan · Weekly            5pts │ │
│  │────────────────────────────────────│ │
│  │ ✓  Water plants                    │ │
│  │    Sarah · Daily              3pts │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Completed Today (2)                    │
│  ┌────────────────────────────────────┐ │
│  │ ✅ Dishes - Marcus (5pts)          │ │
│  │ ✅ Make beds - Alex (3pts)         │ │
│  └────────────────────────────────────┘ │
│                                          │
│  [+ New Quest]                          │
└──────────────────────────────────────────┘
```

**Filter Options:**

- All Tasks
- My Tasks (current user only)
- By Person (dropdown: All, Sarah, Alex, Jordan, Marcus)
- By Date (Today, Tomorrow, This Week, Custom)
- Status (Active, Completed, Overdue)

**Interactions:**

- Tap filter → Change view
- Tap task → Task detail screen
- Swipe task → Quick actions (Complete, Edit, Delete)
- Tap "+ New Quest" → Full creation form

---

### Screen 3: Task Detail

**Purpose:** View/edit single task, see history, manage recurrence

**Layout:**

```
┌──────────────────────────────────────────┐
│  ← Back                          [Edit]  │
│                                          │
│  Clean bathroom                          │
│  Use a mop. Clean toilet and shower.    │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ 👤 Assigned to: Alex             │   │
│  │ ⭐ Points: 10                     │   │
│  │ 🔄 Type: Repeating (Weekly)      │   │
│  │ 📅 Next due: Today               │   │
│  └──────────────────────────────────┘   │
│                                          │
│  📊 Completion History (Last 4 weeks)   │
│  ✅ Dec 17 · ✅ Dec 10 · ✅ Dec 3 ·     │
│  ❌ Nov 26 (Missed)                     │
│                                          │
│  ┌─────────────────────────────────────┐│
│  │  [Complete Task]                    ││
│  └─────────────────────────────────────┘│
│                                          │
│  [Reassign] [Delete Task]               │
└──────────────────────────────────────────┘
```

**Key Elements:**

- Full task details
- Assignment info
- Recurrence pattern
- Completion history (for recurring tasks)
- Primary action (Complete)
- Secondary actions (Reassign, Delete, Edit)

---

### Screen 4: FAMILY (Members & Household)

**Purpose:** Manage household members, view contributions

**Layout:**

```
┌──────────────────────────────────────────┐
│  👥 Family                               │
│                                          │
│  🏠 The Smith Family                    │
│                                          │
│  Members (4)                             │
│  ┌────────────────────────────────────┐ │
│  │  SM  Sarah (You)         125 pts/wk│ │
│  │      Parent · 4 tasks this week    │ │
│  │────────────────────────────────────│ │
│  │  M   Marcus              98 pts/wk │ │
│  │      Parent · 3 tasks this week    │ │
│  │────────────────────────────────────│ │
│  │  A   Alex (15)           87 pts/wk │ │
│  │      Child · 5 tasks this week     │ │
│  │────────────────────────────────────│ │
│  │  J   Jordan (12)         56 pts/wk │ │
│  │      Child · 3 tasks this week     │ │
│  └────────────────────────────────────┘ │
│                                          │
│  [+ Invite Member] [+ Add Child]        │
│                                          │
│  Household Settings                      │
│  Household name, preferences            │
└──────────────────────────────────────────┘
```

**Interactions:**

- Tap member card → Member profile (stats, tasks, history)
- Tap "Invite Member" → Invitation flow
- Tap "Add Child" → Child creation form
- Tap "Household Settings" → Settings screen

---

### Screen 5: PROGRESS (Gamification & Stats)

**Purpose:** Motivation, achievement tracking, friendly competition

**Layout:**

```
┌──────────────────────────────────────────┐
│  🏆 Progress                             │
│                                          │
│  This Week's Leaderboard                 │
│  ┌────────────────────────────────────┐ │
│  │ 🥇 Sarah      125 pts   12 tasks   │ │
│  │ 🥈 Marcus      98 pts    9 tasks   │ │
│  │ 🥉 Alex        87 pts   11 tasks   │ │
│  │ 4️⃣ Jordan      56 pts    7 tasks   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  🎖️ Achievements                         │
│  ┌────────────────────────────────────┐ │
│  │ ⭐ Early Bird (5 days in a row)    │ │
│  │ 🔥 Streak Master (30 day streak)   │ │
│  │ 🌟 Century Club (100 tasks)        │ │
│  │ 🏆 Team Player (helped 10 times)   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  📊 Household Stats                     │
│  - 67% completion rate this week        │
│  - 340 total points earned              │
│  - 156 tasks completed this month       │
└──────────────────────────────────────────┘
```

**Key Elements:**

- Friendly competition (leaderboard)
- Individual achievements
- Household-level statistics
- Visual progress indicators

---

## Key UX Principles

### 1. **Progressive Disclosure**

- Show most important info first (today's tasks)
- Hide complexity until needed (detailed forms)
- Quick path for common actions (quick-add)
- Detailed path for power users (full task management)

### 2. **Immediate Feedback**

- Task completion → Celebration animation
- Points added → Visual counter update
- Task created → Success confirmation
- Error → Clear, helpful message

### 3. **Context-Aware Actions**

- Floating button changes based on screen
- Filters persist between sessions
- Smart defaults based on history
- Suggested task assignments

### 4. **Mobile-First, Desktop-Enhanced**

- Bottom navigation on mobile (thumb-friendly)
- Sidebar navigation on desktop (more space)
- Swipe gestures on mobile (quick actions)
- Keyboard shortcuts on desktop

### 5. **Trust-Based with Optional Verification**

- Default: One-tap completion (trust family)
- Optional: Photo proof for specific tasks
- Optional: Parental approval for kids' tasks
- Balance between simplicity and accountability

---

## Questions for You to Decide

Before I create the final detailed wireframes, I need your input on:

### 1. Task Completion Verification

**Question:** Should task completion be:

- **A) Trust-based** (tap checkmark, task done, no questions)
- **B) Optional verification** (some tasks require photo/proof)
- **C) Approval-based** (parent must approve kids' completions)
- **D) Combination** (configurable per task)

**My Recommendation:** D - Combination (most flexible)

### 2. Points & Rewards Philosophy

**Question:** What happens with points?

- **A) Just tracking** (points are symbolic, no redemption)
- **B) Reward system** (points redeem for privileges/treats)
- **C) Pure gamification** (badges and achievements only)
- **D) Both** (points + badges)

**My Recommendation:** D - Both (maximum motivation)

### 3. Task Assignment

**Question:** Who can assign tasks to whom?

- **A) Anyone to anyone** (fully democratic)
- **B) Parents assign, kids self-assign** (hybrid)
- **C) Parents only assign** (full control)
- **D) Configurable roles** (define permissions)

**My Recommendation:** B - Hybrid (empowers kids, parents have control)

### 4. Recurring Tasks

**Question:** How should recurring tasks work?

- **A) Auto-create** (new instance appears when due)
- **B) Checklist model** (same task, check it weekly)
- **C) Flexible** (user chooses per task)

**My Recommendation:** A - Auto-create (cleaner, tracks history)

### 5. Navigation Priority

**Question:** What should be most accessible?

- **A) Dashboard first** (home = overview)
- **B) Tasks first** (home = task list)
- **C) Configurable** (user sets default)

**My Recommendation:** A - Dashboard first (better for daily use)

---

## Next Steps

Once you answer the questions above, I will:

1. **Create detailed wireframes** showing the complete user journey
2. **Apply Proposal 5 aesthetic** to the finalized workflows
3. **Create interactive prototype** (HTML) with the full navigation and workflows
4. **Document component specifications** for Angular implementation
5. **Define API requirements** for backend
6. **Create implementation roadmap** broken into GitHub issues

**Please let me know:**

1. Your answers to the 5 questions above
2. Any other workflow concerns or requirements
3. Any specific household needs I haven't addressed

Then I'll create the complete, detailed UX system with Proposal 5's playful aesthetic! 🚀
