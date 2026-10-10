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

  it('should display the 4 Poeng navigation items', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    expect(navButtons.length).toBe(4);
  });

  it('should display an icon and label per item', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    const labels = Array.from(navButtons).map((btn) =>
      (btn as HTMLElement).querySelector('.nav-label')?.textContent?.trim(),
    );

    expect(
      Array.from(navButtons).every((btn) => (btn as HTMLElement).querySelector('.nav-icon svg')),
    ).toBe(true);
    // Norwegian is the source language; order as drawn in the signed-off picture
    expect(labels).toEqual(['Hjem', 'Oppgaver', 'Belønninger', 'Familie']);
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
    const familyButton = navButtons[3];

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
    expect(navigateSpy).toHaveBeenCalledWith('rewards');

    (navButtons[3] as HTMLButtonElement).click();
    expect(navigateSpy).toHaveBeenCalledWith('family');
  });

  it('should have correct accessibility attributes', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('.bottom-nav');
    expect(nav.getAttribute('role')).toBe('navigation');
    // Norwegian is the source language
    expect(nav.getAttribute('aria-label')).toBe('Hovednavigasjon');
  });

  it('should set aria-current on active item', () => {
    componentRef.setInput('activeScreen', 'family');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    const familyButton = navButtons[3];

    expect(familyButton.getAttribute('aria-current')).toBe('page');
  });

  it('should not set aria-current on non-active items', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    const tasksButton = navButtons[1];

    expect(tasksButton.getAttribute('aria-current')).toBeNull();
  });

  it('should name each navigation item by its visible label', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    const navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    const labels = Array.from(navButtons).map((btn) => (btn as HTMLElement).textContent?.trim());

    expect(labels).toEqual(['Hjem', 'Oppgaver', 'Belønninger', 'Familie']);
  });

  it('should update active state when activeScreen changes', () => {
    componentRef.setInput('activeScreen', 'home');
    fixture.detectChanges();

    let navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    expect(navButtons[0].classList.contains('active')).toBe(true);

    componentRef.setInput('activeScreen', 'rewards');
    fixture.detectChanges();

    navButtons = fixture.nativeElement.querySelectorAll('.nav-btn');
    expect(navButtons[0].classList.contains('active')).toBe(false);
    expect(navButtons[2].classList.contains('active')).toBe(true);
  });
});
