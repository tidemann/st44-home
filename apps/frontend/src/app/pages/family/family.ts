import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { MemberCard, type MemberCardData } from '../../components/member-card/member-card';
import { BottomNav } from '../../components/navigation/bottom-nav/bottom-nav';
import { SidebarNav } from '../../components/navigation/sidebar-nav/sidebar-nav';
import {
  InviteModal,
  type InviteMemberData,
} from '../../components/modals/invite-modal/invite-modal';
import {
  AddChildModal,
  type AddChildData,
} from '../../components/modals/add-child-modal/add-child-modal';
import {
  QuickAddModal,
  type QuickAddTaskData,
} from '../../components/modals/quick-add-modal/quick-add-modal';
import { HouseholdService } from '../../services/household.service';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../services/task.service';
import { ChildrenService } from '../../services/children.service';
import type { SidebarUser } from '../../components/navigation/sidebar-nav/sidebar-nav';
import type { Child } from '@st44/types';

/**
 * Family Screen
 *
 * Displays and manages household members:
 * - Household info (name and member count)
 * - Action buttons (Invite Member, Add Child)
 * - List of all family members with their stats using member-card components
 * - Integration with invite-modal and add-child-modal for member management
 *
 * Design matches the "Diddit!" playful aesthetic from UX redesign.
 */
@Component({
  selector: 'app-family',
  imports: [MemberCard, BottomNav, SidebarNav, InviteModal, AddChildModal, QuickAddModal],
  templateUrl: './family.html',
  styleUrl: './family.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Family implements OnInit {
  private readonly router = inject(Router);
  private readonly householdService = inject(HouseholdService);
  private readonly authService = inject(AuthService);
  private readonly taskService = inject(TaskService);
  private readonly childrenService = inject(ChildrenService);

  // State signals
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly members = signal<MemberCardData[]>([]);
  protected readonly householdName = signal<string>('My Family');
  protected readonly householdId = signal<string | null>(null);
  protected readonly currentUserId = signal<string | null>(null);

  // Children for quick-add modal
  protected readonly children = signal<Child[]>([]);

  // Modal state
  protected readonly inviteModalOpen = signal(false);
  protected readonly addChildModalOpen = signal(false);
  protected readonly quickAddOpen = signal(false);

  // Navigation state
  protected readonly activeScreen = signal<'home' | 'tasks' | 'family' | 'progress'>('family');

  // Computed values
  protected readonly memberCount = computed(() => this.members().length);

  protected readonly sidebarUser = computed<SidebarUser>(() => {
    const user = this.authService.currentUser();
    return {
      name: user?.email.split('@')[0] || 'User',
      avatar: '', // Will use initials
      household: this.householdName(),
    };
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  /**
   * Load household members and data
   */
  protected async loadData(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);

      const user = this.authService.currentUser();
      if (!user) {
        this.error.set('User not authenticated');
        return;
      }

      this.currentUserId.set(user.id);

      // Get user's household
      const households = await this.householdService.listHouseholds();
      if (households.length === 0) {
        this.error.set('No household found');
        return;
      }

      const household = households[0];
      this.householdId.set(household.id);
      this.householdName.set(household.name);

      // Load household members
      const householdMembers = await this.householdService.getHouseholdMembers(household.id);

      // Transform HouseholdMember[] to MemberCardData[]
      // TODO: Get actual task/points data from backend
      const memberCards: MemberCardData[] = householdMembers.map((member) => {
        const isCurrentUser = member.userId === user.id;
        const displayName = isCurrentUser
          ? `${member.displayName || member.email.split('@')[0]} (You)`
          : member.displayName || member.email.split('@')[0];

        return {
          id: member.userId,
          name: displayName,
          email: member.email,
          role: member.role === 'child' ? 'child' : 'parent',
          tasksCompleted: 0, // TODO: Get from backend
          totalTasks: 0, // TODO: Get from backend
          points: 0, // TODO: Get from backend
        };
      });

      this.members.set(memberCards);
    } catch (err) {
      console.error('Failed to load family members:', err);
      this.error.set('Failed to load family members. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Handle invite member submission
   */
  protected async onInviteSent(data: InviteMemberData): Promise<void> {
    try {
      // TODO: Implement invite API call when backend endpoint is ready (#197)
      // For now, close modal and show mock success
      void data; // Placeholder until API integration
      this.inviteModalOpen.set(false);

      // Reload members to show pending invite (when backend supports it)
      // await this.loadData();
    } catch {
      this.error.set('Failed to send invitation. Please try again.');
    }
  }

  /**
   * Handle add child submission
   */
  protected async onChildAdded(data: AddChildData): Promise<void> {
    try {
      // TODO: Implement add child API call when backend endpoint is ready (#197)
      // For now, close modal and reload data
      void data; // Placeholder until API integration
      this.addChildModalOpen.set(false);

      // Reload members to show new child
      await this.loadData();
    } catch {
      this.error.set('Failed to add child. Please try again.');
    }
  }

  /**
   * Handle navigation between screens
   */
  protected onNavigate(screen: 'home' | 'tasks' | 'family' | 'progress'): void {
    const routes: Record<string, string> = {
      home: '/home',
      tasks: '/household/all-tasks',
      family: '/family',
      progress: '/progress',
    };

    const route = routes[screen];
    if (route) {
      this.router.navigate([route]);
    }
  }

  /**
   * Open invite member modal
   */
  protected openInviteModal(): void {
    this.inviteModalOpen.set(true);
  }

  /**
   * Close invite member modal
   */
  protected closeInviteModal(): void {
    this.inviteModalOpen.set(false);
  }

  /**
   * Open add child modal
   */
  protected openAddChildModal(): void {
    this.addChildModalOpen.set(true);
  }

  /**
   * Close add child modal
   */
  protected closeAddChildModal(): void {
    this.addChildModalOpen.set(false);
  }

  /**
   * Load children for quick-add modal
   */
  private async loadChildren(): Promise<void> {
    const household = this.householdId();
    if (!household) return;

    try {
      const childrenData = await this.childrenService.listChildren(household);
      this.children.set(childrenData);
    } catch (err) {
      console.error('Failed to load children:', err);
    }
  }

  /**
   * Open quick-add modal
   */
  protected openQuickAdd(): void {
    // Load children if not already loaded
    if (this.children().length === 0) {
      this.loadChildren();
    }
    this.quickAddOpen.set(true);
  }

  /**
   * Close quick-add modal
   */
  protected closeQuickAdd(): void {
    this.quickAddOpen.set(false);
  }

  /**
   * Handle quick-add task creation
   */
  protected onTaskCreated(data: QuickAddTaskData): void {
    const household = this.householdId();
    if (!household) return;

    this.taskService
      .createTask(household, {
        name: data.name,
        points: data.points,
        ruleType: 'daily', // Default to daily for quick-add
      })
      .subscribe({
        next: () => {
          this.quickAddOpen.set(false);
        },
        error: (err) => {
          this.error.set('Failed to create task. Please try again.');
          console.error('Create task error:', err);
        },
      });
  }
}
