import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarNav, type SidebarUser } from './sidebar-nav';
import { ComponentRef } from '@angular/core';
import { HouseholdService } from '../../../services/household.service';

describe('SidebarNav', () => {
  let component: SidebarNav;
  let componentRef: ComponentRef<SidebarNav>;
  let fixture: ComponentFixture<SidebarNav>;

  const mockUser: SidebarUser = {
    name: 'Sarah Johnson',
    avatar: 'SJ',
    household: 'The Johnson Family',
  };

  const mockHouseholdService = {
    listHouseholds: vi
      .fn()
      .mockResolvedValue([{ id: '1', name: 'The Johnson Family', role: 'parent' }]),
    getActiveHouseholdId: vi.fn().mockReturnValue('1'),
    setActiveHousehold: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarNav],
      providers: [{ provide: HouseholdService, useValue: mockHouseholdService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarNav);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display logo', () => {
    componentRef.setInput('activeScreen', 'home');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    const logo = fixture.nativeElement.querySelector('.sidebar-logo');
    expect(logo?.textContent).toContain('Diddit!');
  });

  it('should display all 5 navigation items', () => {
    componentRef.setInput('activeScreen', 'home');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.sidebar-btn');
    expect(navButtons.length).toBe(5);
  });

  it('should display correct icons and labels', () => {
    componentRef.setInput('activeScreen', 'home');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.sidebar-btn');
    const icons = Array.from(navButtons).map((btn) =>
      (btn as HTMLElement).querySelector('.sidebar-icon')?.textContent?.trim(),
    );
    const labels = Array.from(navButtons).map((btn) =>
      (btn as HTMLElement).textContent?.replace(/[^\w\s]/g, '').trim(),
    );

    expect(icons).toEqual(['🏠', '✓', '👥', '🏆', '🎁']);
    expect(labels).toEqual(['Home', 'Tasks', 'Family', 'Progress', 'Rewards']);
  });

  it('should apply active class to current screen', () => {
    componentRef.setInput('activeScreen', 'tasks');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.sidebar-btn');
    const tasksButton = navButtons[1];

    expect(tasksButton.classList.contains('active')).toBe(true);
  });

  it('should emit navigate event when nav item clicked', () => {
    const navigateSpy = vi.fn();
    component.navigate.subscribe(navigateSpy);

    componentRef.setInput('activeScreen', 'home');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.sidebar-btn');
    const familyButton = navButtons[2];
    familyButton.click();

    expect(navigateSpy).toHaveBeenCalledWith('family');
  });

  it('should display "Add Task" button', () => {
    componentRef.setInput('activeScreen', 'home');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    const addButton = fixture.nativeElement.querySelector('.sidebar-add-btn');
    expect(addButton?.textContent).toContain('Add Task');
  });

  it('should emit addTask event when "Add Task" button clicked', () => {
    const addTaskSpy = vi.fn();
    component.addTask.subscribe(addTaskSpy);

    componentRef.setInput('activeScreen', 'home');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    const addButton = fixture.nativeElement.querySelector('.sidebar-add-btn');
    addButton.click();

    expect(addTaskSpy).toHaveBeenCalled();
  });

  it('should display user information', () => {
    componentRef.setInput('activeScreen', 'home');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    const userName = fixture.nativeElement.querySelector('.sidebar-user-info h4');
    const householdSwitcher = fixture.nativeElement.querySelector('app-household-switcher');

    expect(userName?.textContent).toContain('Sarah Johnson');
    expect(householdSwitcher).toBeTruthy();
  });

  it('should display user initials in avatar', () => {
    componentRef.setInput('activeScreen', 'home');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    const avatar = fixture.nativeElement.querySelector('.sidebar-avatar');
    expect(avatar?.textContent?.trim()).toBe('SJ');
  });

  it('should compute initials from user name', () => {
    componentRef.setInput('activeScreen', 'home');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    expect(component.userInitials()).toBe('SJ');
  });

  it('should handle single name for initials', () => {
    const singleNameUser: SidebarUser = {
      name: 'Mike',
      avatar: 'MI',
      household: 'Test Family',
    };

    componentRef.setInput('activeScreen', 'home');
    componentRef.setInput('user', singleNameUser);
    fixture.detectChanges();

    expect(component.userInitials()).toBe('MI');
  });

  it('should have correct accessibility attributes on nav', () => {
    componentRef.setInput('activeScreen', 'home');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('.sidebar-nav');
    expect(nav.getAttribute('role')).toBe('navigation');
    expect(nav.getAttribute('aria-label')).toBe('Main navigation');
  });

  it('should set aria-current on active item', () => {
    componentRef.setInput('activeScreen', 'progress');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.sidebar-btn');
    const progressButton = navButtons[3];

    expect(progressButton.getAttribute('aria-current')).toBe('page');
  });

  it('should have aria-label for "Add Task" button', () => {
    componentRef.setInput('activeScreen', 'home');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    const addButton = fixture.nativeElement.querySelector('.sidebar-add-btn');
    expect(addButton.getAttribute('aria-label')).toBe('Add new task');
  });

  it('should have aria-label for avatar', () => {
    componentRef.setInput('activeScreen', 'home');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    const avatar = fixture.nativeElement.querySelector('.sidebar-avatar');
    expect(avatar.getAttribute('aria-label')).toBe('Avatar for Sarah Johnson');
  });

  it('should update active state when activeScreen changes', () => {
    componentRef.setInput('activeScreen', 'home');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    let navButtons = fixture.nativeElement.querySelectorAll('.sidebar-btn');
    expect(navButtons[0].classList.contains('active')).toBe(true);

    componentRef.setInput('activeScreen', 'family');
    fixture.detectChanges();

    navButtons = fixture.nativeElement.querySelectorAll('.sidebar-btn');
    expect(navButtons[0].classList.contains('active')).toBe(false);
    expect(navButtons[2].classList.contains('active')).toBe(true);
  });

  it('should update user info when user changes', () => {
    componentRef.setInput('activeScreen', 'home');
    componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    let userName = fixture.nativeElement.querySelector('.sidebar-user-info h4');
    expect(userName?.textContent).toContain('Sarah Johnson');

    const newUser: SidebarUser = {
      name: 'Mike Smith',
      avatar: 'MS',
      household: 'The Smith Family',
    };

    componentRef.setInput('user', newUser);
    fixture.detectChanges();

    userName = fixture.nativeElement.querySelector('.sidebar-user-info h4');

    expect(userName?.textContent).toContain('Mike Smith');
  });
});
