import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { MemberCard, type MemberCardData } from '../../components/member-card/member-card';
import {
  InviteModal,
  type InviteMemberData,
} from '../../components/modals/invite-modal/invite-modal';
import {
  AddChildModal,
  type AddChildData,
} from '../../components/modals/add-child-modal/add-child-modal';
import { HouseholdService } from '../../services/household.service';
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
  imports: [MemberCard, InviteModal, AddChildModal],
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
}
