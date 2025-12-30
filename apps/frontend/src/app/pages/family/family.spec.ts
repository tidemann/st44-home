import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Family } from './family';
import { HouseholdService, type HouseholdMember } from '../../services/household.service';
import { AuthService } from '../../services/auth.service';
import { InvitationService } from '../../services/invitation.service';
import { ChildrenService } from '../../services/children.service';
import type { InviteMemberData } from '../../components/modals/invite-modal/invite-modal';
import type { AddChildData } from '../../components/modals/add-child-modal/add-child-modal';

describe('Family', () => {
  let component: Family;
  let fixture: ComponentFixture<Family>;
  let mockHouseholdService: {
    listHouseholds: ReturnType<typeof vi.fn>;
    getHouseholdMembers: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: { currentUser: ReturnType<typeof vi.fn> };
  let mockInvitationService: { sendInvitation: ReturnType<typeof vi.fn> };
  let mockChildrenService: { createChild: ReturnType<typeof vi.fn> };

  const mockUser = { id: 'user-1', email: 'test@example.com' };
  const mockHousehold = { id: 'household-1', name: 'Test Family' };
  const mockMembers: HouseholdMember[] = [
    {
      userId: 'user-1',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'parent',
      joinedAt: new Date().toISOString(),
      tasksCompleted: 0,
      totalTasks: 0,
      points: 0,
    },
    {
      userId: 'user-2',
      email: 'child@example.com',
      displayName: 'Test Child',
      role: 'child',
      joinedAt: new Date().toISOString(),
      tasksCompleted: 3,
      totalTasks: 5,
      points: 150,
    },
  ];

  beforeEach(async () => {
    // Create mock services
    mockHouseholdService = {
      listHouseholds: vi.fn(),
      getHouseholdMembers: vi.fn(),
    };
    mockAuthService = {
      currentUser: vi.fn().mockReturnValue(mockUser),
    };
    mockInvitationService = {
      sendInvitation: vi.fn().mockResolvedValue({ id: 'invite-1' }),
    };
    mockChildrenService = {
      createChild: vi.fn().mockResolvedValue({ id: 'child-1', name: 'New Child' }),
    };

    // Default mock returns
    mockHouseholdService.listHouseholds.mockResolvedValue([mockHousehold]);
    mockHouseholdService.getHouseholdMembers.mockResolvedValue(mockMembers);

    await TestBed.configureTestingModule({
      imports: [Family],
      providers: [
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: InvitationService, useValue: mockInvitationService },
        { provide: ChildrenService, useValue: mockChildrenService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Family);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load household members on init', async () => {
      await component.ngOnInit();

      expect(mockHouseholdService.listHouseholds).toHaveBeenCalled();
      expect(mockHouseholdService.getHouseholdMembers).toHaveBeenCalledWith('household-1');
      expect(component['loading']()).toBe(false);
      expect(component['householdName']()).toBe('Test Family');
      expect(component['members']().length).toBe(2);
    });

    it('should handle error when user not authenticated', async () => {
      mockAuthService.currentUser.mockReturnValue(null);

      await component.ngOnInit();

      expect(component['error']()).toBe('User not authenticated');
      expect(component['loading']()).toBe(false);
    });

    it('should handle error when no household found', async () => {
      mockHouseholdService.listHouseholds.mockResolvedValue([]);

      await component.ngOnInit();

      expect(component['error']()).toBe('No household found');
      expect(component['loading']()).toBe(false);
    });

    it('should handle error when loading members fails', async () => {
      mockHouseholdService.getHouseholdMembers.mockRejectedValue(
        new Error('Failed to load members'),
      );

      await component.ngOnInit();

      expect(component['error']()).toBe('Failed to load family members. Please try again.');
      expect(component['loading']()).toBe(false);
    });
  });

  describe('member data transformation', () => {
    it('should transform household members to member card data', async () => {
      await component.ngOnInit();

      const members = component['members']();
      expect(members[0]).toMatchObject({
        id: 'user-1',
        name: 'Test User (You)',
        email: 'test@example.com',
        role: 'parent',
      });
      expect(members[1]).toMatchObject({
        id: 'user-2',
        name: 'Test Child',
        email: 'child@example.com',
        role: 'child',
      });
    });

    it('should use email username when displayName is null', async () => {
      const membersWithoutDisplayName: HouseholdMember[] = [
        {
          ...mockMembers[0],
          displayName: null,
        },
      ];
      mockHouseholdService.getHouseholdMembers.mockResolvedValue(membersWithoutDisplayName);

      await component.ngOnInit();

      const members = component['members']();
      expect(members[0].name).toBe('test (You)');
    });

    it('should mark current user with (You) suffix', async () => {
      await component.ngOnInit();

      const currentUserMember = component['members']().find((m) => m.id === 'user-1');
      expect(currentUserMember?.name).toContain('(You)');

      const otherMember = component['members']().find((m) => m.id === 'user-2');
      expect(otherMember?.name).not.toContain('(You)');
    });

    it('should pass through task stats and points from backend', async () => {
      await component.ngOnInit();

      const childMember = component['members']().find((m) => m.id === 'user-2');
      expect(childMember?.tasksCompleted).toBe(3);
      expect(childMember?.totalTasks).toBe(5);
      expect(childMember?.points).toBe(150);

      const parentMember = component['members']().find((m) => m.id === 'user-1');
      expect(parentMember?.tasksCompleted).toBe(0);
      expect(parentMember?.totalTasks).toBe(0);
      expect(parentMember?.points).toBe(0);
    });
  });

  describe('computed values', () => {
    it('should compute member count correctly', async () => {
      await component.ngOnInit();

      expect(component['memberCount']()).toBe(2);
    });
  });

  describe('modal interactions', () => {
    it('should open and close invite modal', () => {
      expect(component['inviteModalOpen']()).toBe(false);

      component['openInviteModal']();
      expect(component['inviteModalOpen']()).toBe(true);

      component['closeInviteModal']();
      expect(component['inviteModalOpen']()).toBe(false);
    });

    it('should open and close add child modal', () => {
      expect(component['addChildModalOpen']()).toBe(false);

      component['openAddChildModal']();
      expect(component['addChildModalOpen']()).toBe(true);

      component['closeAddChildModal']();
      expect(component['addChildModalOpen']()).toBe(false);
    });
  });

  describe('onInviteSent', () => {
    it('should handle invite sent event', async () => {
      // First load data to set householdId
      await component.ngOnInit();

      const inviteData: InviteMemberData = {
        email: 'new@example.com',
        role: 'parent',
        message: 'Welcome!',
      };

      await component['onInviteSent'](inviteData);

      expect(component['inviteModalOpen']()).toBe(false);
      expect(mockInvitationService.sendInvitation).toHaveBeenCalledWith(
        'household-1',
        'new@example.com',
        'parent',
      );
    });

    it('should close modal after invite sent', async () => {
      // First load data to set householdId
      await component.ngOnInit();

      const inviteData: InviteMemberData = {
        email: 'new@example.com',
        role: 'adult',
      };

      await component['onInviteSent'](inviteData);

      // Modal should be closed after invite
      expect(component['inviteModalOpen']()).toBe(false);
    });

    it('should set error when no household is selected', async () => {
      // Don't call ngOnInit - householdId will be null
      const inviteData: InviteMemberData = {
        email: 'new@example.com',
        role: 'parent',
      };

      await component['onInviteSent'](inviteData);

      expect(component['error']()).toBe('No household selected');
      expect(mockInvitationService.sendInvitation).not.toHaveBeenCalled();
    });
  });

  describe('onChildAdded', () => {
    it('should handle add child event', async () => {
      // First load data to set householdId
      await component.ngOnInit();
      // Reset call count after ngOnInit
      mockHouseholdService.getHouseholdMembers.mockClear();

      const childData: AddChildData = {
        name: 'New Child',
        age: 10,
        avatar: 'smile',
      };

      await component['onChildAdded'](childData);

      expect(component['addChildModalOpen']()).toBe(false);
      // Should call createChild API
      expect(mockChildrenService.createChild).toHaveBeenCalledWith('household-1', {
        name: 'New Child',
        birthYear: new Date().getFullYear() - 10,
      });
      // Should reload data
      expect(mockHouseholdService.getHouseholdMembers).toHaveBeenCalled();
    });

    it('should close modal after child added', async () => {
      // First load data to set householdId
      await component.ngOnInit();
      // Reset call count after ngOnInit
      mockHouseholdService.getHouseholdMembers.mockClear();

      const childData: AddChildData = {
        name: 'New Child',
        age: 8,
        avatar: 'game',
      };

      await component['onChildAdded'](childData);

      // Modal should be closed after adding child
      expect(component['addChildModalOpen']()).toBe(false);
      // Data should be reloaded
      expect(mockHouseholdService.getHouseholdMembers).toHaveBeenCalled();
    });

    it('should set error when no household is selected', async () => {
      // Don't call ngOnInit - householdId will be null
      const childData: AddChildData = {
        name: 'New Child',
        age: 10,
        avatar: 'smile',
      };

      await component['onChildAdded'](childData);

      expect(component['error']()).toBe('No household selected');
      expect(mockChildrenService.createChild).not.toHaveBeenCalled();
    });
  });

  describe('loadData', () => {
    it('should be callable to retry loading', async () => {
      mockHouseholdService.getHouseholdMembers.mockRejectedValue(
        new Error('Failed to load members'),
      );

      await component.ngOnInit();
      expect(component['error']()).toBeTruthy();

      // Reset mock to succeed
      mockHouseholdService.getHouseholdMembers.mockResolvedValue(mockMembers);

      await component['loadData']();
      expect(component['error']()).toBeNull();
      expect(component['members']().length).toBe(2);
    });
  });
});
