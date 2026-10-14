import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TopTabs, type TopTab } from './top-tabs';
import { HouseholdService } from '../../../services/household.service';
import { AuthService } from '../../../services/auth.service';

describe('TopTabs', () => {
  let component: TopTabs<string>;
  let componentRef: ComponentRef<TopTabs<string>>;
  let fixture: ComponentFixture<TopTabs<string>>;

  const tabs: TopTab[] = [
    { id: 'home', icon: 'home', label: 'Hjem' },
    { id: 'tasks', icon: 'tasks', label: 'Oppgaver' },
    { id: 'family', icon: 'family', label: 'Familie' },
    { id: 'progress', icon: 'progress', label: 'Fremgang' },
    { id: 'rewards', icon: 'rewards', label: 'Belønninger' },
  ];

  const mockHouseholdService = {
    listHouseholds: vi.fn().mockResolvedValue([]),
    getActiveHouseholdId: vi.fn().mockReturnValue(null),
    setActiveHousehold: vi.fn(),
  };

  const mockAuthService = {
    currentUser: vi
      .fn()
      .mockReturnValue({ firstName: 'Kari', email: 'k@example.test', role: 'parent' }),
    logout: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopTabs],
      providers: [
        provideRouter([]),
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopTabs<string>);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('tabs', tabs);
    componentRef.setInput('activeId', 'home');
  });

  it('should draw the mark, the wordmark, every tab with an icon, and the initial badge', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('app-diddit-mark svg')).toBeTruthy();
    expect(el.querySelector('.wordmark')?.textContent?.trim()).toBe('Diddit');
    const labels = Array.from(el.querySelectorAll('.tab-label')).map((l) => l.textContent?.trim());
    expect(labels).toEqual(['Hjem', 'Oppgaver', 'Familie', 'Fremgang', 'Belønninger']);
    expect(el.querySelectorAll('.tab .tab-icon svg').length).toBe(5);
    expect(el.querySelector('.initial-badge')?.textContent?.trim()).toBe('K');
  });

  it('should mark only the chosen tab as active and as the current page', () => {
    componentRef.setInput('activeId', 'progress');
    fixture.detectChanges();

    const buttons: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.tab'));
    expect(buttons.map((b) => b.classList.contains('active'))).toEqual([
      false,
      false,
      false,
      true,
      false,
    ]);
    expect(buttons[3].getAttribute('aria-current')).toBe('page');
    expect(buttons.filter((b) => b.hasAttribute('aria-current')).length).toBe(1);
  });

  it('should choose no tab on a screen outside the menu', () => {
    componentRef.setInput('activeId', 'none');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.tab.active').length).toBe(0);
  });

  it('should emit the tab id when a tab is pressed', () => {
    const emitted: string[] = [];
    component.navigate.subscribe((id) => emitted.push(id));
    fixture.detectChanges();

    (fixture.nativeElement.querySelectorAll('.tab')[4] as HTMLElement).click();
    expect(emitted).toEqual(['rewards']);
  });
});
