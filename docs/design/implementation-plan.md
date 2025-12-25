# Implementation Plan: Diddit! Design System

**GitHub Issue:** #184
**Design Direction:** Bold & Playful (complete-prototype-responsive.html)
**Status:** Ready for implementation
**Target:** Angular 21+ with Diddit! Design System

---

## Executive Summary

This plan outlines the implementation of the selected "Bold & Playful" design direction for the Diddit! household task management application. The design features:

- **Playful, family-friendly aesthetic** with rounded corners and vibrant gradients
- **Mobile-first responsive design** with desktop sidebar navigation
- **Strong gamification elements** (points, badges, leaderboards)
- **Accessibility compliance** (WCAG 2.1 AA)
- **Performance-optimized** Angular 21+ implementation

**Timeline Estimate:** 4-6 sprints (8-12 weeks)
**Priority:** High (MVP Launch milestone)

---

## Design System Foundation

### Design Tokens

The chosen design uses the following design tokens (already partially implemented in Storybook):

```typescript
// Design Tokens (apps/frontend/src/styles/tokens/)

// Colors
--color-primary: #6366F1 (Indigo)
--color-secondary: #EC4899 (Pink)
--color-accent: #FBBF24 (Yellow/Gold)
--color-success: #10B981 (Green)
--color-purple: #A855F7
--color-orange: #F97316
--color-background: #F8F9FF (Light purple-tinted)
--color-surface: #FFFFFF
--color-text-primary: #1E293B
--color-text-secondary: #64748B
--color-text-tertiary: #94A3B8

// Typography
--font-heading: 'Fredoka', sans-serif (playful, rounded)
--font-body: 'Outfit', sans-serif (clean, modern)

// Spacing
--space-xs: 0.5rem
--space-sm: 0.75rem
--space-md: 1rem
--space-lg: 1.5rem
--space-xl: 2rem
--space-xxl: 3rem

// Radius (strong characteristic of this design)
--radius-sm: 16px
--radius-md: 24px
--radius-lg: 32px
--radius-xl: 48px
```

### Typography System

**Fredoka (Headings):**

- Logo, page titles, card titles, stats
- Weights: 400, 500, 600, 700
- Playful, friendly, memorable

**Outfit (Body):**

- Body text, buttons, form inputs, metadata
- Weights: 400, 500, 600, 700
- Clean, readable, modern

### Color Strategy

**Primary Gradient:** Linear gradient from Indigo (#6366F1) to Pink (#EC4899)

- Used for: CTAs, active states, brand elements, avatars

**Accent Gradient:** Yellow (#FBBF24) to Orange (#F97316)

- Used for: Points badges, rewards, highlights

**Success:** Green (#10B981)

- Used for: Task completion, checkmarks, positive states

**Backgrounds:**

- Surface: Pure white (#FFFFFF) for cards
- Background: Light tinted (#F8F9FF) for page background

---

## Implementation Phases

### Phase 1: Foundation & Design System (Sprint 1-2)

**Goal:** Establish design tokens, base styles, and reusable component library

#### 1.1 Design Tokens Setup

**Files to Create/Modify:**

- `apps/frontend/src/styles/tokens/colors.css` - Extend with new color palette
- `apps/frontend/src/styles/tokens/typography.css` - Add Fredoka & Outfit fonts
- `apps/frontend/src/styles/tokens/spacing.css` - Update spacing scale
- `apps/frontend/src/styles/tokens/radius.css` - Add new radius tokens
- `apps/frontend/src/styles/tokens/shadows.css` - Define shadow system
- `apps/frontend/src/styles/global.css` - Import all tokens

**Tasks:**

- [ ] Add Google Fonts links for Fredoka and Outfit to `index.html`
- [ ] Create/update token CSS files with new values
- [ ] Update existing token references to match new system
- [ ] Add gradient utilities (primary-gradient, accent-gradient)
- [ ] Create shadow utilities (card-shadow, hover-shadow)
- [ ] Update `apps/frontend/src/styles.css` to import all tokens

**Acceptance Criteria:**

- All design tokens available as CSS custom properties
- Fonts load correctly and are applied via tokens
- No hard-coded colors/sizes in existing components
- Storybook stories show new token values

---

#### 1.2 Core Component Library

**Components to Create (Storybook-first approach):**

1. **Button Component** (`apps/frontend/src/app/components/button/`)
   - Variants: primary (gradient), secondary, tertiary, icon
   - Sizes: sm, md, lg
   - States: default, hover, active, disabled, loading
   - Angular 21+: standalone, signals, OnPush
   - Story: Show all variants and states

2. **Card Component** (`apps/frontend/src/app/components/card/`)
   - Base card with rounded corners
   - Hover effect (translateY, shadow)
   - Border-left accent color option
   - Story: Different content examples

3. **Avatar Component** (`apps/frontend/src/app/components/avatar/`)
   - Gradient background
   - Initials display
   - Sizes: sm (20px), md (48px), lg (64px)
   - Story: Different sizes and initials

4. **Badge Component** (`apps/frontend/src/app/components/badge/`)
   - Gradient variants (primary, accent, success)
   - Icon + text support
   - Story: All gradient types

5. **Input Component** (`apps/frontend/src/app/components/input/`)
   - Text inputs with focus states
   - Label, error, helper text
   - Rounded borders (radius-md)
   - Story: All states (default, focus, error, disabled)

**Acceptance Criteria:**

- Each component has `.component.ts`, `.component.html`, `.component.css`
- Each component has `.stories.ts` with all variants
- Components follow Angular 21+ patterns (standalone, signals, inject())
- Components use design tokens (no hard-coded values)
- All components accessible (WCAG AA)
- Storybook renders all components correctly

---

### Phase 2: Navigation & Layout (Sprint 3)

**Goal:** Implement responsive navigation and layout structure

#### 2.1 App Shell

**Files to Create/Modify:**

- `apps/frontend/src/app/app.component.ts` - Root app structure
- `apps/frontend/src/app/app.component.html` - Layout grid
- `apps/frontend/src/app/app.component.css` - Responsive grid

**Layout Structure:**

```html
<div class="app-container" [class.authenticated]="isAuthenticated()">
  <!-- Desktop Sidebar (hidden on mobile) -->
  <aside class="sidebar-nav" *ngIf="isAuthenticated()">
    <app-sidebar></app-sidebar>
  </aside>

  <!-- Main Content -->
  <main class="main-content">
    <router-outlet></router-outlet>
  </main>

  <!-- Mobile Bottom Nav (hidden on desktop) -->
  <nav class="bottom-nav" *ngIf="isAuthenticated()">
    <app-bottom-nav></app-bottom-nav>
  </nav>
</div>
```

**Responsive Breakpoints:**

- Mobile: < 768px (bottom nav)
- Tablet: 768px - 1023px (bottom nav)
- Desktop: >= 1024px (sidebar nav)

---

#### 2.2 Sidebar Navigation (Desktop)

**Component:** `apps/frontend/src/app/components/sidebar/sidebar.component.ts`

**Features:**

- Logo at top
- Navigation menu items (Tasks, Family, Stats, Settings)
- "Add Task" CTA button (gradient)
- User profile card at bottom
- Active state highlighting (gradient background)

**Implementation:**

```typescript
// sidebar.component.ts
import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@app/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  user = this.authService.currentUser;

  menuItems = [
    { icon: '✓', label: 'Tasks', route: '/tasks' },
    { icon: '👨‍👩‍👧‍👦', label: 'Family', route: '/family' },
    { icon: '📊', label: 'Stats', route: '/stats' },
    { icon: '⚙️', label: 'Settings', route: '/settings' },
  ];

  addTask() {
    this.router.navigate(['/tasks/new']);
  }
}
```

**Acceptance Criteria:**

- Sidebar shows on desktop (>= 1024px), hidden on mobile
- Active route highlighted with gradient background
- Add Task button navigates to task creation
- User profile shows name, avatar, household
- Smooth transitions between active states

---

#### 2.3 Bottom Navigation (Mobile)

**Component:** `apps/frontend/src/app/components/bottom-nav/bottom-nav.component.ts`

**Features:**

- Fixed position at bottom
- 4 nav items + floating FAB for "Add Task"
- Active state highlighting
- Touch-optimized (48px tap targets minimum)

**Implementation:**

```typescript
// bottom-nav.component.ts
@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  navItems = [
    { icon: '✓', label: 'Tasks', route: '/tasks' },
    { icon: '👨‍👩‍👧‍👦', label: 'Family', route: '/family' },
    { icon: '📊', label: 'Stats', route: '/stats' },
    { icon: '⚙️', label: 'Settings', route: '/settings' },
  ];
}
```

**CSS:**

- Fixed bottom positioning
- Gradient FAB (primary gradient)
- Safe area insets for iOS (padding-bottom: env(safe-area-inset-bottom))
- Z-index management

**Acceptance Criteria:**

- Bottom nav shows on mobile/tablet (< 1024px), hidden on desktop
- FAB floats above nav bar
- All tap targets >= 48x48px
- Active state visible
- Works with iOS safe areas

---

### Phase 3: Authentication Pages (Sprint 4)

**Goal:** Redesign login, register, forgot password, and onboarding flows

#### 3.1 Login Page

**File:** `apps/frontend/src/app/pages/login/login.component.ts`

**Features:**

- Centered card layout
- Gradient header with logo
- Email + password inputs
- "Remember me" checkbox
- Primary CTA button (gradient)
- Links to "Forgot password?" and "Create account"
- Responsive (mobile-friendly)

**Design:**

- Card: white background, rounded corners (radius-xl: 48px)
- Header: gradient background with "Welcome Back" greeting
- Form: vertical layout, generous spacing
- Button: full-width, gradient, shadow

**Acceptance Criteria:**

- Form validation with error messages
- Loading state on submit
- Accessible (labels, ARIA, keyboard nav)
- Responsive on all screen sizes
- Links to register and forgot password work
- "Remember me" persists session

---

#### 3.2 Register Page

**File:** `apps/frontend/src/app/pages/register/register.component.ts`

**Features:**

- Email, password, confirm password
- Password strength indicator
- Terms & conditions checkbox
- Social login options (Google, Apple) - future enhancement
- Link to login page

**Design:**

- Similar to login but with multi-step feel
- Password strength: gradient bar (red → yellow → green)
- Celebration on successful registration

**Acceptance Criteria:**

- Password validation (min length, special chars)
- Password match validation
- Email format validation
- Terms checkbox required
- Success animation (confetti or celebration)
- Auto-redirect to household setup

---

#### 3.3 Forgot Password Page

**File:** `apps/frontend/src/app/pages/forgot-password/forgot-password.component.ts`

**Features:**

- Email input
- Clear instructions
- Success state (email sent confirmation)
- Back to login link

**Design:**

- Minimal, focused layout
- Icon or illustration at top
- Clear messaging
- Reduced anxiety (friendly tone)

**Acceptance Criteria:**

- Email validation
- Loading state during API call
- Success message with next steps
- Error handling (email not found)

---

#### 3.4 Household Setup (Onboarding)

**File:** `apps/frontend/src/app/pages/onboarding/household-setup.component.ts`

**Features:**

- Welcome screen with value proposition
- Household name input
- Progress indicator (1 of 3 steps)
- Next/Skip buttons
- Celebration on completion

**Design:**

- Full-page gradient background
- Large, friendly heading
- Illustrated onboarding steps
- Step 1: Name your household
- Step 2: Invite family members (optional, can skip)
- Step 3: Create your first task (guided)
- Final: Success celebration with confetti

**Acceptance Criteria:**

- Multi-step flow (3 steps)
- Progress indicator visible
- Can skip optional steps
- Celebration animation on completion
- Auto-redirect to dashboard after completion

---

### Phase 4: Task Management (Sprint 5-6)

**Goal:** Implement core task functionality with new design

#### 4.1 Task Dashboard

**File:** `apps/frontend/src/app/pages/tasks/tasks.component.ts`

**Features:**

- Gradient header with greeting and stats
- Stats cards (Today, Week, Points) with emoji icons
- Filter tabs (All, Today, Week, Overdue)
- Task list (card-based)
- Quick add input
- Empty states

**Layout:**

```
┌────────────────────────────────────┐
│  Gradient Header                   │
│  "Good morning, Sarah!"            │
│  "The Smith Family"                │
└────────────────────────────────────┘
┌───────┬───────┬───────────────────┐
│ Today │ Week  │ Points            │
│  3/8  │ 18/32 │  450 pts          │
└───────┴───────┴───────────────────┘
┌────────────────────────────────────┐
│ + Add a task...                    │
└────────────────────────────────────┘
[All] [Today] [Week] [Overdue]
┌────────────────────────────────────┐
│ ✓  Clean bathroom                  │
│    Alex · Daily · 10 pts           │
└────────────────────────────────────┘
```

**Implementation:**

```typescript
// tasks.component.ts
@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [TaskCardComponent, QuickAddComponent, StatCardComponent],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksComponent {
  private tasksService = inject(TasksService);
  private authService = inject(AuthService);

  tasks = this.tasksService.tasks;
  currentUser = this.authService.currentUser;

  activeFilter = signal<'all' | 'today' | 'week' | 'overdue'>('all');

  filteredTasks = computed(() => {
    const filter = this.activeFilter();
    const allTasks = this.tasks();
    // Filter logic based on active filter
    return allTasks; // Implement filtering
  });

  stats = computed(() => ({
    todayCompleted: 3,
    todayTotal: 8,
    weekCompleted: 18,
    weekTotal: 32,
    points: 450,
  }));

  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  });
}
```

**Acceptance Criteria:**

- Stats update in real-time
- Filter tabs work correctly
- Quick add creates task instantly
- Task list responsive (grid on desktop, stack on mobile)
- Empty state shows when no tasks
- Skeleton loading state during fetch

---

#### 4.2 Task Card Component

**File:** `apps/frontend/src/app/components/task-card/task-card.component.ts`

**Features:**

- Checkbox/complete button (gradient circle)
- Task title and description
- Assignee avatar + name
- Task type badge (Daily, Weekly, One-time)
- Points badge (gradient)
- Hover effect (translateX, shadow)
- Swipe gesture on mobile (optional)

**Implementation:**

```typescript
@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [AvatarComponent, BadgeComponent],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardComponent {
  task = input.required<Task>();

  private tasksService = inject(TasksService);

  async toggleComplete() {
    const task = this.task();
    await this.tasksService.toggleTaskCompletion(task.id);
    // Show celebration animation if completed
    if (!task.completed) {
      this.showCelebration();
    }
  }

  private showCelebration() {
    // Trigger confetti or checkmark animation
  }
}
```

**Acceptance Criteria:**

- Complete button triggers celebration animation
- Card hover effect smooth
- All task metadata visible
- Responsive layout (stacks on mobile)
- Swipe to complete on mobile (optional)
- Click anywhere on card to view details

---

#### 4.3 Task Creation/Edit Modal

**File:** `apps/frontend/src/app/components/task-modal/task-modal.component.ts`

**Features:**

- Modal overlay (backdrop blur)
- Rounded modal card (radius-xl)
- Form fields: Name, Description, Assignee, Type, Points
- CTA buttons (Create/Cancel)
- Form validation
- Loading state

**Design:**

- Backdrop: rgba(0, 0, 0, 0.5) with blur
- Modal: white card, centered, rounded corners
- Header: gradient accent or simple title
- Form: vertical layout, generous spacing
- Buttons: gradient primary for Create, text for Cancel

**Acceptance Criteria:**

- Modal traps focus (accessibility)
- Escape key closes modal
- Click outside closes modal (with confirmation if dirty)
- Form validation works
- Loading spinner on submit
- Success animation on create
- Error handling

---

#### 4.4 Quick Add Input

**File:** `apps/frontend/src/app/components/quick-add/quick-add.component.ts`

**Features:**

- Inline input with "+ Add a task..." placeholder
- Press Enter to create task
- Auto-assigns to current user
- Default points and type
- Success feedback (task appears in list)

**Implementation:**

```typescript
@Component({
  selector: 'app-quick-add',
  standalone: true,
  imports: [],
  templateUrl: './quick-add.component.html',
  styleUrl: './quick-add.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickAddComponent {
  private tasksService = inject(TasksService);
  private authService = inject(AuthService);

  taskName = signal('');

  async createTask() {
    const name = this.taskName().trim();
    if (!name) return;

    await this.tasksService.createTask({
      name,
      assignedToId: this.authService.currentUser()?.id,
      type: 'daily',
      points: 10,
    });

    this.taskName.set('');
    // Show success feedback
  }
}
```

**Acceptance Criteria:**

- Enter key creates task
- Task appears in list immediately (optimistic update)
- Input clears after creation
- Works on mobile keyboards
- Focus returns to input after creation

---

### Phase 5: Family & Settings (Sprint 7)

**Goal:** Implement household management and settings pages

#### 5.1 Family/Members Page

**File:** `apps/frontend/src/app/pages/family/family.component.ts`

**Features:**

- Member cards (avatar, name, role, stats)
- Invite member section
- Pending invitations list
- Children management section
- Member task assignment view

**Design:**

- Grid of member cards
- Each card: gradient avatar, name, role badge, task stats
- Invite section: prominent CTA
- Pending invitations: table with status badges

**Acceptance Criteria:**

- Members display in grid (responsive)
- Invite form functional (email, role selection)
- Pending invitations show status (Pending, Accepted, Cancelled)
- Can resend or cancel invitations
- Children section separate with age display
- Add child form (name, birthdate)

---

#### 5.2 Household Settings Page

**File:** `apps/frontend/src/app/pages/settings/household-settings.component.ts`

**Features:**

- Household name edit
- Member list with roles
- Invitation management
- Delete household (danger zone)

**Design:**

- Section-based layout
- Each section: card with heading
- Danger zone: red accent, warning message

**Acceptance Criteria:**

- Household name editable
- Members can be removed (with confirmation)
- Roles can be changed (Parent/Child)
- Delete household requires confirmation + password
- Changes save successfully

---

#### 5.3 User Settings Page

**File:** `apps/frontend/src/app/pages/settings/user-settings.component.ts`

**Features:**

- Profile settings (name, email, avatar)
- Password change
- Notification preferences
- Theme preference (future: dark mode)
- Logout button

**Design:**

- Tabbed interface or sections
- Profile: avatar upload, name/email inputs
- Password: current + new + confirm
- Notifications: toggle switches
- Logout: text button at bottom

**Acceptance Criteria:**

- Profile updates save successfully
- Password change requires current password
- Notification toggles work
- Logout clears session and redirects to login

---

### Phase 6: Gamification & Engagement (Sprint 8)

**Goal:** Implement points, leaderboards, and achievements

#### 6.1 Stats/Leaderboard Page

**File:** `apps/frontend/src/app/pages/stats/stats.component.ts`

**Features:**

- Family leaderboard (points ranking)
- Individual stats (tasks completed, points earned, streak)
- Charts/graphs (completion trends)
- Achievements/badges section

**Design:**

- Top section: leaderboard with podium (1st, 2nd, 3rd)
- Leaderboard cards: gradient rank badge, avatar, name, points
- Charts: colorful, animated
- Achievements: grid of badge cards

**Implementation:**

```typescript
@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [LeaderboardCardComponent, AchievementBadgeComponent],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsComponent {
  private statsService = inject(StatsService);

  leaderboard = this.statsService.leaderboard;
  achievements = this.statsService.achievements;

  myStats = computed(() => ({
    tasksCompleted: 42,
    pointsEarned: 450,
    currentStreak: 7,
  }));
}
```

**Acceptance Criteria:**

- Leaderboard updates in real-time
- Podium highlights top 3
- Charts show completion trends (daily, weekly, monthly)
- Achievements display with locked/unlocked states
- Animations on achievement unlock

---

#### 6.2 Celebration Animations

**Files:**

- `apps/frontend/src/app/animations/confetti.ts`
- `apps/frontend/src/app/animations/checkmark.ts`

**Features:**

- Confetti explosion on task completion
- Checkmark animation
- Points earned animation (+10 pts float)
- Level up animation

**Implementation:**

- Use Angular animations or CSS keyframes
- Trigger on specific events (task complete, achievement unlock)
- Performance-optimized (requestAnimationFrame)
- Reduced motion support (prefers-reduced-motion)

**Acceptance Criteria:**

- Confetti plays on task completion
- Points float up on earn
- Animations smooth (60fps)
- Respects prefers-reduced-motion
- No performance impact on low-end devices

---

### Phase 7: Accessibility & Polish (Sprint 9)

**Goal:** Ensure WCAG 2.1 AA compliance and final polish

#### 7.1 Accessibility Audit

**Tasks:**

- [ ] Run AXE DevTools on all pages
- [ ] Test keyboard navigation (Tab, Enter, Escape, Arrow keys)
- [ ] Test screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify color contrast ratios (4.5:1 for text, 3:1 for UI)
- [ ] Ensure focus indicators visible
- [ ] Add ARIA labels where needed
- [ ] Test with 200% zoom
- [ ] Test touch targets (min 48x48px)

**Tools:**

- AXE DevTools (browser extension)
- Lighthouse (Chrome DevTools)
- WAVE (browser extension)
- Color Contrast Analyzer

**Acceptance Criteria:**

- Zero critical accessibility violations
- All functionality keyboard-accessible
- Screen reader announces all actions
- Focus order logical
- No keyboard traps
- All images have alt text
- Forms have labels and error messages

---

#### 7.2 Performance Optimization

**Tasks:**

- [ ] Lazy load routes
- [ ] Optimize images (WebP, responsive)
- [ ] Preload critical fonts
- [ ] Code splitting
- [ ] Service worker for offline support (PWA)
- [ ] Lighthouse performance score > 90

**Implementation:**

```typescript
// Lazy route loading (app.routes.ts)
export const routes: Routes = [
  {
    path: 'tasks',
    loadComponent: () => import('./pages/tasks/tasks.component').then((m) => m.TasksComponent),
  },
  {
    path: 'family',
    loadComponent: () => import('./pages/family/family.component').then((m) => m.FamilyComponent),
  },
  // ... other routes
];
```

**Acceptance Criteria:**

- Lighthouse performance score > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- No layout shift (CLS < 0.1)
- All routes lazy-loaded
- Fonts preloaded

---

#### 7.3 Responsive Testing

**Devices to Test:**

- iPhone SE (375px)
- iPhone 12/13/14 (390px)
- Android (various sizes)
- iPad (768px, 1024px)
- Desktop (1280px, 1440px, 1920px)

**Test Scenarios:**

- Portrait and landscape orientations
- Touch interactions (tap, swipe, long-press)
- Keyboard on mobile (form inputs)
- Safe area insets (iOS notch)
- Different font sizes

**Acceptance Criteria:**

- No horizontal scroll on any screen size
- All touch targets >= 48x48px
- Text readable on all sizes
- Images scale properly
- Navigation works on all devices
- Forms usable on mobile keyboards

---

#### 7.4 Browser Testing

**Browsers:**

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

**Features to Test:**

- CSS Grid support
- CSS custom properties
- CSS gradients
- CSS animations
- Flexbox
- Service workers

**Acceptance Criteria:**

- No critical bugs in any browser
- Graceful degradation for older browsers
- Feature detection for progressive enhancement

---

### Phase 8: Testing & QA (Sprint 10)

**Goal:** Comprehensive testing before production

#### 8.1 Unit Tests

**Target Coverage:** 80%+ for components and services

**Files:**

- All `.component.spec.ts` files
- All `.service.spec.ts` files

**Test Scenarios:**

- Component rendering
- User interactions (click, input, submit)
- Form validation
- Service API calls (mocked)
- Signal updates
- Computed values

**Example:**

```typescript
// task-card.component.spec.ts
describe('TaskCardComponent', () => {
  it('should toggle task completion on button click', async () => {
    const fixture = TestBed.createComponent(TaskCardComponent);
    const component = fixture.componentInstance;

    const mockTask = { id: 1, name: 'Test', completed: false };
    component.task = signal(mockTask);

    const button = fixture.nativeElement.querySelector('.task-complete-btn');
    button.click();

    // Assert task completion toggled
  });
});
```

**Acceptance Criteria:**

- All components have tests
- All services have tests
- Coverage > 80%
- All tests pass locally and in CI

---

#### 8.2 E2E Tests

**Tool:** Playwright (already configured)

**Test Scenarios:**

1. **Authentication Flow**
   - Register new user
   - Login existing user
   - Forgot password
   - Logout

2. **Onboarding Flow**
   - Setup household
   - Invite member
   - Create first task

3. **Task Management**
   - Create task
   - Edit task
   - Complete task
   - Delete task

4. **Family Management**
   - Invite member
   - Accept invitation
   - Remove member
   - Add child

5. **Gamification**
   - Earn points
   - View leaderboard
   - Unlock achievement

**Example:**

```typescript
// tasks.e2e.spec.ts
test('should create task using quick add', async ({ page }) => {
  await page.goto('/tasks');

  const quickAdd = page.locator('.quick-add input');
  await quickAdd.fill('Clean kitchen');
  await quickAdd.press('Enter');

  // Assert task appears in list
  await expect(page.locator('text=Clean kitchen')).toBeVisible();
});
```

**Acceptance Criteria:**

- All critical flows have E2E tests
- Tests run in CI on every PR
- Tests pass on all target browsers
- Tests include mobile viewport scenarios

---

#### 8.3 User Acceptance Testing (UAT)

**Participants:**

- 3-5 users per persona (Organizer, Teen, Partner)
- Mix of technical and non-technical users
- Different devices (mobile, tablet, desktop)

**Test Scenarios:**

- Complete onboarding
- Create 5 tasks
- Invite family member
- Complete tasks
- View leaderboard
- Change settings

**Metrics to Collect:**

- Task completion success rate
- Time to complete tasks
- User satisfaction score (1-10)
- Usability issues encountered
- Feature requests

**Acceptance Criteria:**

- Task completion success rate > 90%
- User satisfaction score > 8/10
- No critical usability issues
- All feedback documented

---

## Migration Strategy

### Incremental Rollout

**Option 1: Feature Flag (Recommended)**

- Add feature flag in backend: `useNewDesign: boolean`
- Render old or new components based on flag
- Gradually enable for test users
- Monitor metrics (engagement, errors)
- Roll out to 100% once stable

**Option 2: Big Bang**

- Deploy all changes at once
- Risky but faster
- Requires thorough testing
- Not recommended for production

**Recommended Approach:** Feature flag with phased rollout

1. Week 1: Internal testing (team only)
2. Week 2: Beta users (10%)
3. Week 3: Expand to 50%
4. Week 4: 100% rollout

---

## Technical Debt & Refactoring

### Code to Refactor

1. **Remove old components** after migration
   - Old button styles
   - Old card components
   - Old color variables

2. **Consolidate styles**
   - Remove duplicate CSS
   - Use tokens everywhere
   - Remove hard-coded values

3. **Update tests**
   - Update snapshots
   - Fix broken tests
   - Add missing coverage

---

## Documentation

### Developer Documentation

**Files to Create/Update:**

1. `apps/frontend/README.md` - Update with new design system
2. `DESIGN_SYSTEM.md` - Document all tokens, components, patterns
3. `ACCESSIBILITY.md` - Document accessibility features and testing
4. `CONTRIBUTING.md` - Update with new component creation guidelines

### User Documentation

**Files to Create:**

1. User guide (in-app help)
2. Video tutorials (optional)
3. FAQ page
4. Support articles

---

## Success Metrics

### Pre-Launch Goals

- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices)
- [ ] Test coverage > 80%
- [ ] Zero critical accessibility violations
- [ ] Zero critical bugs
- [ ] UAT satisfaction score > 8/10

### Post-Launch Metrics to Monitor

**Engagement:**

- Daily active users (DAU)
- Session duration
- Tasks created per user
- Task completion rate

**Performance:**

- Page load time
- Time to interactive
- Error rate
- API response time

**User Satisfaction:**

- NPS (Net Promoter Score)
- App store ratings
- Support ticket volume

---

## Risks & Mitigation

### Risk 1: Breaking Changes

**Impact:** High
**Likelihood:** Medium
**Mitigation:**

- Comprehensive testing
- Feature flag rollout
- Rollback plan ready

### Risk 2: Performance Degradation

**Impact:** Medium
**Likelihood:** Low
**Mitigation:**

- Performance testing before launch
- Lighthouse monitoring
- Optimize images and fonts

### Risk 3: Accessibility Regressions

**Impact:** High
**Likelihood:** Low
**Mitigation:**

- Automated accessibility testing in CI
- Manual testing with screen readers
- Regular audits

### Risk 4: User Resistance to Change

**Impact:** Medium
**Likelihood:** Medium
**Mitigation:**

- Clear communication about changes
- User education (tutorials, tooltips)
- Feedback channel for issues

---

## Timeline & Milestones

### Sprint Breakdown (2-week sprints)

**Sprint 1-2: Foundation** (Weeks 1-4)

- Design tokens setup
- Core component library
- Storybook stories

**Sprint 3: Navigation** (Weeks 5-6)

- App shell
- Sidebar navigation
- Bottom navigation

**Sprint 4: Authentication** (Weeks 7-8)

- Login page
- Register page
- Forgot password
- Onboarding

**Sprint 5-6: Tasks** (Weeks 9-12)

- Task dashboard
- Task card component
- Task modal
- Quick add

**Sprint 7: Family & Settings** (Weeks 13-14)

- Family page
- Settings pages
- Household management

**Sprint 8: Gamification** (Weeks 15-16)

- Leaderboard
- Stats page
- Achievements
- Animations

**Sprint 9: Accessibility** (Weeks 17-18)

- Accessibility audit
- Performance optimization
- Responsive testing
- Browser testing

**Sprint 10: Testing & QA** (Weeks 19-20)

- Unit tests
- E2E tests
- UAT
- Bug fixes

**Sprint 11: Launch Prep** (Weeks 21-22)

- Documentation
- Deployment
- Monitoring setup
- Launch!

**Total Timeline:** 22 weeks (~5.5 months)

---

## Post-Launch Roadmap

### Phase 9: Enhancements (Future)

1. **Dark Mode** (1 sprint)
   - Duplicate color tokens for dark theme
   - Toggle in settings
   - Respect system preference

2. **Advanced Gamification** (2 sprints)
   - Weekly challenges
   - Family goals
   - Custom rewards
   - Badges and trophies

3. **Notifications** (2 sprints)
   - Push notifications (PWA)
   - Email reminders
   - In-app notifications

4. **Calendar Integration** (1 sprint)
   - Calendar view for tasks
   - Due dates
   - Recurring patterns

5. **Mobile Apps** (4+ sprints)
   - iOS app (Swift/SwiftUI)
   - Android app (Kotlin)
   - Or: Ionic/Capacitor wrapper

6. **AI Features** (Exploratory)
   - Smart task suggestions
   - Natural language task creation
   - Insights and analytics

---

## Conclusion

This implementation plan provides a comprehensive roadmap for implementing the chosen "Bold & Playful" design direction for Diddit!. The plan prioritizes:

1. **User Experience** - Mobile-first, intuitive, joyful
2. **Accessibility** - WCAG 2.1 AA compliance throughout
3. **Performance** - Fast, responsive, optimized
4. **Maintainability** - Design tokens, component library, documentation

By following this phased approach with clear acceptance criteria and success metrics, we can deliver a production-ready, engaging household task management application that users will love.

**Next Steps:**

1. Review and approve this plan
2. Create GitHub issues for each sprint
3. Assign team members
4. Begin Sprint 1: Foundation & Design System

---

**Document Version:** 1.0
**Last Updated:** 2025-12-25
**Status:** Ready for Review
