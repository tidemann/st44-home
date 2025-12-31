import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import type { Child } from '@st44/types';
import { MemberCard, type MemberCardData } from '../../components/member-card/member-card';
import {
  InviteModal,
  type InviteMemberData,
} from '../../components/modals/invite-modal/invite-modal';
import {
  AddChildModal,
  type AddChildData,
} from '../../components/modals/add-child-modal/add-child-modal';
import { ChildDetailsModal } from '../../components/modals/child-details-modal/child-details-modal';
import { HouseholdService, type HouseholdMemberResponse } from '../../services/household.service';
import { AuthService } from '../../services/auth.service';
import { InvitationService } from '../../services/invitation.service';
import { ChildrenService } from '../../services/children.service';

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
 * Navigation is handled by the parent MainLayout component.
 */
@Component({
  selector: 'app-family',
  imports: [MemberCard, InviteModal, AddChildModal, ChildDetailsModal],
  templateUrl: './family.html',
  styleUrl: './family.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Family implements OnInit {
  private readonly householdService = inject(HouseholdService);
  private readonly authService = inject(AuthService);
  private readonly invitationService = inject(InvitationService);
  private readonly childrenService = inject(ChildrenService);

  // State signals
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly members = signal<MemberCardData[]>([]);
  protected readonly householdName = signal<string>('My Family');
  protected readonly householdId = signal<string | null>(null);
  protected readonly currentUserId = signal<string | null>(null);

  // Modal state
  protected readonly inviteModalOpen = signal(false);
  protected readonly addChildModalOpen = signal(false);
  protected readonly childDetailsModalOpen = signal(false);

  // Child details modal data
  protected readonly selectedChild = signal<Child | null>(null);
  protected readonly selectedChildEmail = signal<string | null>(null);

  // Children map for looking up child by id or userId
  private readonly childrenById = signal<Map<string, Child>>(new Map());
  private readonly childrenByUserId = signal<Map<string, Child>>(new Map());
  private readonly householdMembers = signal<HouseholdMemberResponse[]>([]);

  // Computed values
  protected readonly memberCount = computed(() => this.members().length);

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

      // Load household members and children in parallel
      const [householdMembers, children] = await Promise.all([
        this.householdService.getHouseholdMembers(household.id),
        this.childrenService.listChildren(household.id),
      ]);

      // Store household members for later lookup
      this.householdMembers.set(householdMembers);

      // Build maps for child lookup
      const childByIdMap = new Map<string, Child>();
      const childByUserIdMap = new Map<string, Child>();
      for (const child of children) {
        childByIdMap.set(child.id, child);
        if (child.userId) {
          childByUserIdMap.set(child.userId, child);
        }
      }
      this.childrenById.set(childByIdMap);
      this.childrenByUserId.set(childByUserIdMap);

      // Track which children already have accounts (appear in householdMembers)
      const childrenWithAccounts = new Set<string>();
      for (const member of householdMembers) {
        if (member.role === 'child') {
          const child = childByUserIdMap.get(member.userId);
          if (child) {
            childrenWithAccounts.add(child.id);
          }
        }
      }

      // Transform HouseholdMember[] to MemberCardData[]
      const memberCards: MemberCardData[] = householdMembers.map((member) => {
        const isCurrentUser = member.userId === user.id;
        const isChild = member.role === 'child';
        // Handle null email for unlinked children
        const emailUsername = member.email ? member.email.split('@')[0] : null;
        const displayName = isCurrentUser
          ? `${member.displayName || emailUsername || 'Unknown'} (You)`
          : member.displayName || emailUsername || 'Child';

        return {
          id: member.userId,
          name: displayName,
          email: member.email ?? undefined, // Convert null to undefined for optional field
          role: isChild ? 'child' : 'parent',
          // Use real stats from backend
          tasksCompleted: member.tasksCompleted,
          totalTasks: member.totalTasks,
          points: member.points,
        };
      });

      // Add children WITHOUT accounts to the member list
      for (const child of children) {
        if (!childrenWithAccounts.has(child.id)) {
          memberCards.push({
            id: `child:${child.id}`, // Prefix to distinguish from userId
            name: child.name,
            email: undefined,
            role: 'child',
            tasksCompleted: 0,
            totalTasks: 0,
            points: 0,
          });
        }
      }

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
    const householdId = this.householdId();
    if (!householdId) {
      this.error.set('No household selected');
      return;
    }

    try {
      // Map frontend role to backend role
      const apiRole = data.role === 'parent' ? 'parent' : 'parent';
      await this.invitationService.sendInvitation(householdId, data.email, apiRole);
      this.inviteModalOpen.set(false);

      // Reload members to show updated state
      await this.loadData();
    } catch (err) {
      console.error('Failed to send invitation:', err);
      this.error.set('Failed to send invitation. Please try again.');
    }
  }

  /**
   * Handle add child submission
   */
  protected async onChildAdded(data: AddChildData): Promise<void> {
    const householdId = this.householdId();
    if (!householdId) {
      this.error.set('No household selected');
      return;
    }

    try {
      // Convert age to birth year
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - data.age;

      await this.childrenService.createChild(householdId, {
        name: data.name,
        birthYear,
      });
      this.addChildModalOpen.set(false);

      // Reload members to show new child
      await this.loadData();
    } catch (err) {
      console.error('Failed to add child:', err);
      this.error.set('Failed to add child. Please try again.');
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
   * Handle member card click - opens child details modal for children
   */
  protected onMemberClick(memberId: string): void {
    let child: Child | undefined;
    let email: string | null = null;

    // Check if this is a child without account (prefixed with "child:")
    if (memberId.startsWith('child:')) {
      const childId = memberId.substring(6); // Remove "child:" prefix
      child = this.childrenById().get(childId);
      // No email for children without accounts
    } else {
      // Child with account - lookup by userId
      child = this.childrenByUserId().get(memberId);
      if (child) {
        const member = this.householdMembers().find((m) => m.userId === memberId);
        email = member?.email ?? null;
      }
    }

    if (!child) {
      return;
    }

    this.selectedChildEmail.set(email);
    this.selectedChild.set(child);
    this.childDetailsModalOpen.set(true);
  }

  /**
   * Close child details modal
   */
  protected closeChildDetailsModal(): void {
    this.childDetailsModalOpen.set(false);
    this.selectedChild.set(null);
    this.selectedChildEmail.set(null);
  }

  /**
   * Handle account created event - reload data to reflect changes
   */
  protected async onChildAccountCreated(): Promise<void> {
    this.closeChildDetailsModal();
    await this.loadData();
  }

  /**
   * Check if a member is a child (for clickable state)
   */
  protected isChildMember(member: MemberCardData): boolean {
    return member.role === 'child';
  }
}
