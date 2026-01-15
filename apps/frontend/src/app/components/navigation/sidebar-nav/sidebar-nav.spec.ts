import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarNav } from './sidebar-nav';
import { ComponentRef } from '@angular/core';
import { HouseholdService } from '../../../services/household.service';

describe('SidebarNav', () => {
  let component: SidebarNav;
  let componentRef: ComponentRef<SidebarNav>;
  let fixture: ComponentFixture<SidebarNav>;

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
    fixture.detectChanges();

    const logo = fixture.nativeElement.querySelector('.sidebar-logo');
    expect(logo?.textContent).toContain('Diddit!');
  });

  it('should display all 5 navigation items', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.sidebar-btn');
    expect(navButtons.length).toBe(5);
  });

  it('should display correct icons and labels', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.sidebar-btn');
    const icons = Array.from(navButtons).map((btn) =>
      (btn as HTMLElement).querySelector('.sidebar-icon')?.textContent?.trim(),
    );

    expect(icons).toEqual(['🏠', '✓', '👥', '🏆', '🎁']);

    // Test against component's navItems directly to avoid encoding issues in test DOM
    expect(component.navItems.map((item) => item.label)).toEqual([
      'Hjem',
      'Oppgaver',
      'Familie',
      'Fremgang',
      'Belønninger',
    ]);
  });

  it('should apply active class to current screen', () => {
    componentRef.setInput('activeScreen', 'tasks');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.sidebar-btn');
    const tasksButton = navButtons[1];

    expect(tasksButton.classList.contains('active')).toBe(true);
  });

  it('should emit navigate event when nav item clicked', () => {
    const navigateSpy = vi.fn();
    component.navigate.subscribe(navigateSpy);

    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.sidebar-btn');
    const familyButton = navButtons[2];
    familyButton.click();

    expect(navigateSpy).toHaveBeenCalledWith('family');
  });

  it('should display "Add Task" button', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const addButton = fixture.nativeElement.querySelector('.sidebar-add-btn');
    // Norwegian is the source language
    expect(addButton?.textContent).toContain('Legg til oppgave');
  });

  it('should emit addTask event when "Add Task" button clicked', () => {
    const addTaskSpy = vi.fn();
    component.addTask.subscribe(addTaskSpy);

    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const addButton = fixture.nativeElement.querySelector('.sidebar-add-btn');
    addButton.click();

    expect(addTaskSpy).toHaveBeenCalled();
  });

  it('should display household switcher', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const householdSwitcher = fixture.nativeElement.querySelector('app-household-switcher');
    expect(householdSwitcher).toBeTruthy();
  });

  it('should have correct accessibility attributes on nav', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('.sidebar-nav');
    expect(nav.getAttribute('role')).toBe('navigation');
    // Norwegian is the source language
    expect(nav.getAttribute('aria-label')).toBe('Hovednavigasjon');
  });

  it('should set aria-current on active item', () => {
    componentRef.setInput('activeScreen', 'progress');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.sidebar-btn');
    const progressButton = navButtons[3];

    expect(progressButton.getAttribute('aria-current')).toBe('page');
  });

  it('should have aria-label for "Add Task" button', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const addButton = fixture.nativeElement.querySelector('.sidebar-add-btn');
    // Norwegian is the source language
    expect(addButton.getAttribute('aria-label')).toBe('Legg til ny oppgave');
  });

  it('should update active state when activeScreen changes', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    let navButtons = fixture.nativeElement.querySelectorAll('.sidebar-btn');
    expect(navButtons[0].classList.contains('active')).toBe(true);

    componentRef.setInput('activeScreen', 'family');
    fixture.detectChanges();

    navButtons = fixture.nativeElement.querySelectorAll('.sidebar-btn');
    expect(navButtons[0].classList.contains('active')).toBe(false);
    expect(navButtons[2].classList.contains('active')).toBe(true);
  });
});
