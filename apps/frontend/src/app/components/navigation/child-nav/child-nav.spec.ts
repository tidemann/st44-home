import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChildNav } from './child-nav';
import { ComponentRef } from '@angular/core';

describe('ChildNav', () => {
  let component: ChildNav;
  let componentRef: ComponentRef<ChildNav>;
  let fixture: ComponentFixture<ChildNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChildNav],
    }).compileComponents();

    fixture = TestBed.createComponent(ChildNav);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display 2 navigation items', () => {
    componentRef.setInput('activeScreen', 'tasks');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.child-nav-btn');
    expect(navButtons.length).toBe(2);
  });

  it('should display correct icons and labels', () => {
    componentRef.setInput('activeScreen', 'tasks');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.child-nav-btn');
    const icons = Array.from(navButtons).map((btn) =>
      (btn as HTMLElement).querySelector('.child-nav-icon')?.textContent?.trim(),
    );
    const labels = Array.from(navButtons).map((btn) =>
      (btn as HTMLElement).querySelector('.child-nav-label')?.textContent?.trim(),
    );

    expect(icons).toEqual(['📋', '🎁']);
    expect(labels).toEqual(['My Tasks', 'My Rewards']);
  });

  it('should apply active class to current screen', () => {
    componentRef.setInput('activeScreen', 'tasks');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.child-nav-btn');
    const tasksButton = navButtons[0];
    const rewardsButton = navButtons[1];

    expect(tasksButton.classList.contains('active')).toBe(true);
    expect(rewardsButton.classList.contains('active')).toBe(false);
  });

  it('should apply active class to rewards when active', () => {
    componentRef.setInput('activeScreen', 'rewards');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.child-nav-btn');
    const tasksButton = navButtons[0];
    const rewardsButton = navButtons[1];

    expect(tasksButton.classList.contains('active')).toBe(false);
    expect(rewardsButton.classList.contains('active')).toBe(true);
  });

  it('should emit navigate event when nav item clicked', () => {
    const navigateSpy = vi.fn();
    component.navigate.subscribe(navigateSpy);

    componentRef.setInput('activeScreen', 'tasks');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.child-nav-btn');
    const rewardsButton = navButtons[1];
    rewardsButton.click();

    expect(navigateSpy).toHaveBeenCalledWith('rewards');
  });

  it('should emit correct screen for each navigation item', () => {
    const navigateSpy = vi.fn();
    component.navigate.subscribe(navigateSpy);

    componentRef.setInput('activeScreen', 'tasks');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.child-nav-btn');

    (navButtons[0] as HTMLButtonElement).click();
    expect(navigateSpy).toHaveBeenCalledWith('tasks');

    (navButtons[1] as HTMLButtonElement).click();
    expect(navigateSpy).toHaveBeenCalledWith('rewards');
  });

  it('should have correct accessibility attributes', () => {
    componentRef.setInput('activeScreen', 'tasks');
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('.child-nav');
    expect(nav.getAttribute('role')).toBe('navigation');
    expect(nav.getAttribute('aria-label')).toBe('Child navigation');
  });

  it('should set aria-current on active item', () => {
    componentRef.setInput('activeScreen', 'rewards');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.child-nav-btn');
    const rewardsButton = navButtons[1];

    expect(rewardsButton.getAttribute('aria-current')).toBe('page');
  });

  it('should not set aria-current on non-active items', () => {
    componentRef.setInput('activeScreen', 'tasks');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.child-nav-btn');
    const rewardsButton = navButtons[1];

    expect(rewardsButton.getAttribute('aria-current')).toBeNull();
  });

  it('should have aria-label for each navigation item', () => {
    componentRef.setInput('activeScreen', 'tasks');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.child-nav-btn');
    const labels = Array.from(navButtons).map((btn) =>
      (btn as HTMLElement).getAttribute('aria-label'),
    );

    expect(labels).toEqual(['My Tasks', 'My Rewards']);
  });

  it('should update active state when activeScreen changes', () => {
    componentRef.setInput('activeScreen', 'tasks');
    fixture.detectChanges();

    let navButtons = fixture.nativeElement.querySelectorAll('.child-nav-btn');
    expect(navButtons[0].classList.contains('active')).toBe(true);
    expect(navButtons[1].classList.contains('active')).toBe(false);

    componentRef.setInput('activeScreen', 'rewards');
    fixture.detectChanges();

    navButtons = fixture.nativeElement.querySelectorAll('.child-nav-btn');
    expect(navButtons[0].classList.contains('active')).toBe(false);
    expect(navButtons[1].classList.contains('active')).toBe(true);
  });
});
