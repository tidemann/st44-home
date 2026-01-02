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
import { PageComponent } from '../../components/page/page';
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
  imports: [MemberCard, InviteModal, AddChildModal, ChildDetailsModal, PageComponent],
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

      // Build a map of userId -> childId for children with accounts
      const userIdToChildId = new Map<string, string>();
      for (const child of children) {
        if (child.userId) {
          userIdToChildId.set(child.userId, child.id);
        }
      }

      // Track which children are already included in householdMembers response
      // The backend includes BOTH linked children (with user accounts) AND unlinked children
      // - Linked children: member.userId is the actual user ID, matches child.userId
      // - Unlinked children: member.userId is the child ID itself (no user account)
      const childrenInResponse = new Set<string>();
      for (const member of householdMembers) {
        // Check if this is a linked child (member.userId matches a child.userId)
        const childId = userIdToChildId.get(member.userId);
        if (childId) {
          childrenInResponse.add(childId);
        }
        // Check if this is an unlinked child (member.userId IS the child.id)
        // The backend uses childId as userId for unlinked children
        if (childByIdMap.has(member.userId)) {
          childrenInResponse.add(member.userId);
        }
      }

      // Transform HouseholdMember[] to MemberCardData[]
      // Trust the backend's role field - it correctly returns 'child' for all children
      const memberCards: MemberCardData[] = householdMembers.map((member) => {
        const isCurrentUser = member.userId === user.id;
        // Trust the backend's role - it correctly identifies children (linked and unlinked)
        const isChild = member.role === 'child';
        // Handle null email for unlinked children
        const emailUsername = member.email ? member.email.split('@')[0] : null;
        const displayName = isCurrentUser
          ? `${member.displayName || emailUsername || 'Unknown'} (You)`
          : member.displayName || emailUsername || 'Child';

        // For children, use child:childId format for consistent lookup
        // For linked children: look up childId from userIdToChildId
        // For unlinked children: member.userId IS the childId
        let memberId = member.userId;
        if (isChild) {
          const linkedChildId = userIdToChildId.get(member.userId);
          if (linkedChildId) {
            // Linked child - member.userId is user ID, look up child ID
            memberId = `child:${linkedChildId}`;
          } else if (childByIdMap.has(member.userId)) {
            // Unlinked child - member.userId IS the child ID
            memberId = `child:${member.userId}`;
          }
        }

        return {
          id: memberId,
          name: displayName,
          email: member.email ?? undefined, // Convert null to undefined for optional field
          role: isChild ? 'child' : 'parent',
          // Use real stats from backend
          tasksCompleted: member.tasksCompleted,
          totalTasks: member.totalTasks,
          points: member.points,
        };
      });

      // Add children that are NOT in the householdMembers response
      // This should be rare - the backend normally includes all children
      // But keep this as a safety net for edge cases
      for (const child of children) {
        if (!childrenInResponse.has(child.id)) {
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

      // Sort members: admin → parent → child, then alphabetically by name within each role
      memberCards.sort((a, b) => {
        const roleOrder: Record<string, number> = { admin: 0, parent: 1, child: 2 };
        const roleCompare = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
        if (roleCompare !== 0) {
          return roleCompare;
        }
        // Within same role, sort alphabetically by name (case-insensitive)
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
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
   * All children use "child:childId" format for consistent lookup
   */
  protected onMemberClick(memberId: string): void {
    // All children should use "child:" prefix
    if (!memberId.startsWith('child:')) {
      return; // Not a child, ignore
    }

    const childId = memberId.substring(6); // Remove "child:" prefix
    const child = this.childrenById().get(childId);

    if (!child) {
      return;
    }

    // Get email if child has an account (has userId)
    let email: string | null = null;
    if (child.userId) {
      const member = this.householdMembers().find((m) => m.userId === child.userId);
      email = member?.email ?? null;
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
   * Handle child updated event - reload data to reflect changes
   */
  protected async onChildUpdated(): Promise<void> {
    await this.loadData();
  }

  /**
   * Handle child deleted event - reload data to reflect changes
   */
  protected async onChildDeleted(): Promise<void> {
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
