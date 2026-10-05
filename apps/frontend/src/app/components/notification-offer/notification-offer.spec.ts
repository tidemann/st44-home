import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NotificationOffer } from './notification-offer';
import { PushNotificationService, type PushState } from '../../services/push-notification.service';
import { PwaService, type InstallPlatform } from '../../services/pwa.service';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { STORAGE_KEYS } from '../../services/storage-keys';

describe('NotificationOffer', () => {
  let fixture: ComponentFixture<NotificationOffer>;
  const state = signal<PushState>('checking');
  const installPlatform = signal<InstallPlatform>(null);
  const isAuthenticated = signal(true);
  const push = {
    state,
    busy: signal(false),
    refresh: vi.fn().mockResolvedValue('off'),
    enable: vi.fn().mockResolvedValue('on'),
  };
  const auth = { isAuthenticated, hasRole: vi.fn().mockReturnValue(false) };
  let stored: Record<string, unknown>;
  const storage = {
    get: vi.fn((key: string) => stored[key] ?? null),
    setWithTTL: vi.fn((key: string, value: unknown) => {
      stored[key] = value;
    }),
  };

  async function create(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [NotificationOffer],
      providers: [
        { provide: PushNotificationService, useValue: push },
        { provide: PwaService, useValue: { installPlatform } },
        { provide: AuthService, useValue: auth },
        { provide: StorageService, useValue: storage },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(NotificationOffer);
  }

  beforeEach(() => {
    stored = {};
    state.set('checking');
    installPlatform.set(null);
    isAuthenticated.set(true);
    auth.hasRole.mockReturnValue(false);
    [push.refresh, push.enable, storage.setWithTTL].forEach((fn) => fn.mockClear());
  });

  function render(pushState: PushState): HTMLElement {
    state.set(pushState);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function button(el: HTMLElement, label: string): HTMLButtonElement {
    const match = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(label),
    );
    if (!match) throw new Error(`No button "${label}"`);
    return match;
  }

  it('checks push on this phone once someone is logged in', async () => {
    await create();
    render('checking');
    expect(push.refresh).toHaveBeenCalledTimes(1);
  });

  it('offers notifications to a parent when push is off, and the tap asks the browser', async () => {
    await create();
    const el = render('off');
    expect(el.textContent).toContain('Slå på varsler?');
    expect(el.textContent).toContain('når barna er ferdige');
    button(el, 'Slå på varsler').click();
    expect(push.enable).toHaveBeenCalled();
  });

  it('talks to a child about reminders', async () => {
    auth.hasRole.mockImplementation((role: string) => role === 'child');
    await create();
    expect(render('off').textContent).toContain('når du har oppgaver igjen');
  });

  it('hides once push is on, blocked or not possible', async () => {
    await create();
    for (const s of ['on', 'blocked', 'unsupported', 'needs-install', 'server-off'] as const) {
      expect(render(s).querySelector('.notify-card')).toBeNull();
    }
  });

  it('waits while the install card is up', async () => {
    installPlatform.set('android');
    await create();
    expect(render('off').querySelector('.notify-card')).toBeNull();
  });

  it('shows nothing before login', async () => {
    isAuthenticated.set(false);
    await create();
    expect(render('off').querySelector('.notify-card')).toBeNull();
    expect(push.refresh).not.toHaveBeenCalled();
  });

  it('"Ikke nå" hides it and remembers that for 14 days', async () => {
    await create();
    const el = render('off');
    button(el, 'Ikke nå').click();
    fixture.detectChanges();
    expect(el.querySelector('.notify-card')).toBeNull();
    expect(storage.setWithTTL).toHaveBeenCalledWith(
      STORAGE_KEYS.NOTIFY_OFFER_DISMISSED,
      true,
      14 * 24 * 60 * 60 * 1000,
    );
  });

  it('stays hidden after an earlier "Ikke nå"', async () => {
    stored[STORAGE_KEYS.NOTIFY_OFFER_DISMISSED] = true;
    await create();
    expect(render('off').querySelector('.notify-card')).toBeNull();
  });
});
