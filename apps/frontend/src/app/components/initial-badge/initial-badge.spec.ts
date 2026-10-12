import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { InitialBadge } from './initial-badge';
import { AuthService } from '../../services/auth.service';

describe('InitialBadge', () => {
  let fixture: ComponentFixture<InitialBadge>;
  let router: Router;
  const auth = {
    currentUser: vi.fn(),
    logout: vi.fn(),
  };

  function create(user: { firstName: string; email: string; role: string } | null) {
    auth.currentUser.mockReturnValue(user);
    fixture = TestBed.createComponent(InitialBadge);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    auth.logout.mockReset();
    await TestBed.configureTestingModule({
      imports: [InitialBadge],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
  });

  it("should draw the person's initial", () => {
    const el = create({ firstName: 'Kari', email: 'k@example.test', role: 'parent' });
    expect(el.querySelector('.initial-badge')?.textContent?.trim()).toBe('K');
  });

  it('should draw nothing without a user', () => {
    const el = create(null);
    expect(el.querySelector('.initial-badge')).toBeNull();
  });

  it('should take a parent to settings', () => {
    const el = create({ firstName: 'Kari', email: 'k@example.test', role: 'parent' });
    (el.querySelector('.initial-badge') as HTMLElement).click();

    expect(router.navigate).toHaveBeenCalledWith(['/settings']);
    expect(el.querySelector('.badge-menu')).toBeNull();
  });

  it("should open a child's one-item menu, and log out from it", () => {
    const el = create({ firstName: 'Jonas', email: 'j@example.test', role: 'child' });
    const badge = el.querySelector('.initial-badge') as HTMLElement;
    expect(badge.getAttribute('aria-expanded')).toBe('false');

    badge.click();
    fixture.detectChanges();
    expect(badge.getAttribute('aria-expanded')).toBe('true');

    (el.querySelector('.badge-menu-item') as HTMLElement).click();
    fixture.detectChanges();
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/child-login']);
    expect(el.querySelector('.badge-menu')).toBeNull();
  });

  it('should take the Yellow Inset fill on the yellow', () => {
    create({ firstName: 'Kari', email: 'k@example.test', role: 'parent' });
    fixture.componentRef.setInput('onYellow', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.initial-badge.on-yellow')).toBeTruthy();
  });
});
