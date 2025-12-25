import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BottomNav } from './bottom-nav';
import { ComponentRef } from '@angular/core';

describe('BottomNav', () => {
  let component: BottomNav;
  let componentRef: ComponentRef<BottomNav>;
  let fixture: ComponentFixture<BottomNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNav],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNav);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display all 4 navigation items', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    expect(navButtons.length).toBe(4);
  });

  it('should display correct icons and labels', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    const icons = Array.from(navButtons).map((btn) =>
      (btn as HTMLElement).querySelector('.nav-icon')?.textContent?.trim(),
    );
    const labels = Array.from(navButtons).map((btn) =>
      (btn as HTMLElement).querySelector('.nav-label')?.textContent?.trim(),
    );

    expect(icons).toEqual(['🏠', '✓', '👥', '🏆']);
    expect(labels).toEqual(['Home', 'Tasks', 'Family', 'Progress']);
  });

  it('should apply active class to current screen', () => {
    componentRef.setInput('activeScreen', 'tasks');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    const tasksButton = navButtons[1];

    expect(tasksButton.classList.contains('active')).toBe(true);
  });

  it('should not apply active class to non-active screens', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    const tasksButton = navButtons[1];
    const familyButton = navButtons[2];

    expect(tasksButton.classList.contains('active')).toBe(false);
    expect(familyButton.classList.contains('active')).toBe(false);
  });

  it('should emit navigate event when nav item clicked', () => {
    const navigateSpy = vi.fn();
    component.navigate.subscribe(navigateSpy);

    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    const tasksButton = navButtons[1];
    tasksButton.click();

    expect(navigateSpy).toHaveBeenCalledWith('tasks');
  });

  it('should emit correct screen for each navigation item', () => {
    const navigateSpy = vi.fn();
    component.navigate.subscribe(navigateSpy);

    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');

    (navButtons[0] as HTMLButtonElement).click();
    expect(navigateSpy).toHaveBeenCalledWith('home');

    (navButtons[2] as HTMLButtonElement).click();
    expect(navigateSpy).toHaveBeenCalledWith('family');

    (navButtons[3] as HTMLButtonElement).click();
    expect(navigateSpy).toHaveBeenCalledWith('progress');
  });

  it('should have correct accessibility attributes', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('.bottom-nav');
    expect(nav.getAttribute('role')).toBe('navigation');
    expect(nav.getAttribute('aria-label')).toBe('Main navigation');
  });

  it('should set aria-current on active item', () => {
    componentRef.setInput('activeScreen', 'family');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    const familyButton = navButtons[2];

    expect(familyButton.getAttribute('aria-current')).toBe('page');
  });

  it('should not set aria-current on non-active items', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    const tasksButton = navButtons[1];

    expect(tasksButton.getAttribute('aria-current')).toBeNull();
  });

  it('should have aria-label for each navigation item', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    const labels = Array.from(navButtons).map((btn) =>
      (btn as HTMLElement).getAttribute('aria-label'),
    );

    expect(labels).toEqual(['Home', 'Tasks', 'Family', 'Progress']);
  });

  it('should update active state when activeScreen changes', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    let navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    expect(navButtons[0].classList.contains('active')).toBe(true);

    componentRef.setInput('activeScreen', 'progress');
    fixture.detectChanges();

    navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    expect(navButtons[0].classList.contains('active')).toBe(false);
    expect(navButtons[3].classList.contains('active')).toBe(true);
  });
});
