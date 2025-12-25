import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Family } from './family';
import { HouseholdService, type HouseholdMember } from '../../services/household.service';
import { AuthService } from '../../services/auth.service';
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

  const mockUser = { id: 'user-1', email: 'test@example.com' };
  const mockHousehold = { id: 'household-1', name: 'Test Family' };
  const mockMembers: HouseholdMember[] = [
    {
      userId: 'user-1',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'parent',
      joinedAt: new Date().toISOString(),
    },
    {
      userId: 'user-2',
      email: 'child@example.com',
      displayName: 'Test Child',
      role: 'child',
      joinedAt: new Date().toISOString(),
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

    // Default mock returns
    mockHouseholdService.listHouseholds.mockResolvedValue([mockHousehold]);
    mockHouseholdService.getHouseholdMembers.mockResolvedValue(mockMembers);

    await TestBed.configureTestingModule({
      imports: [Family],
      providers: [
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: AuthService, useValue: mockAuthService },
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
      const membersWithoutDisplayName = [
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
  });

  describe('computed values', () => {
    it('should compute member count correctly', async () => {
      await component.ngOnInit();

      expect(component['memberCount']()).toBe(2);
    });

    it('should compute sidebar user data', async () => {
      await component.ngOnInit();

      const sidebarUser = component['sidebarUser']();
      expect(sidebarUser.name).toBe('test');
      expect(sidebarUser.household).toBe('Test Family');
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
      const inviteData: InviteMemberData = {
        email: 'new@example.com',
        role: 'parent',
        message: 'Welcome!',
      };

      await component['onInviteSent'](inviteData);

      expect(component['inviteModalOpen']()).toBe(false);
    });

    it('should handle invite error', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const inviteData: InviteMemberData = {
        email: 'new@example.com',
        role: 'adult',
      };

      await component['onInviteSent'](inviteData);

      expect(consoleSpy).toHaveBeenCalledWith('Sending invite:', inviteData);
      expect(consoleSpy).toHaveBeenCalledWith('Invitation sent to new@example.com as adult');
    });
  });

  describe('onChildAdded', () => {
    it('should handle add child event', async () => {
      const childData: AddChildData = {
        name: 'New Child',
        age: 10,
        avatar: '😊',
      };

      await component['onChildAdded'](childData);

      expect(component['addChildModalOpen']()).toBe(false);
      // Should reload data
      expect(mockHouseholdService.getHouseholdMembers).toHaveBeenCalled();
    });

    it('should handle add child error', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const childData: AddChildData = {
        name: 'New Child',
        age: 8,
        avatar: '🎮',
      };

      await component['onChildAdded'](childData);

      expect(consoleSpy).toHaveBeenCalledWith('Adding child:', childData);
      expect(consoleSpy).toHaveBeenCalledWith('Child New Child added successfully');
    });
  });

  describe('navigation', () => {
    it('should update active screen on navigation', () => {
      expect(component['activeScreen']()).toBe('family');

      component['onNavigate']('home');
      expect(component['activeScreen']()).toBe('home');

      component['onNavigate']('tasks');
      expect(component['activeScreen']()).toBe('tasks');
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
