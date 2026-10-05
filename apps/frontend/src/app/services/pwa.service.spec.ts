import { TestBed } from '@angular/core/testing';
import { PwaService, type BeforeInstallPromptEvent, INSTALL_DISMISS_MS } from './pwa.service';
import { STORAGE_KEYS } from './storage-keys';

function setUserAgent(ua: string, maxTouchPoints = 0): void {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
  Object.defineProperty(navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true });
}

function fakeInstallEvent(outcome: 'accepted' | 'dismissed'): BeforeInstallPromptEvent {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent;
  Object.assign(event, {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
  return event;
}

// Other spec files swap window.localStorage for mocks and do not all put it back,
// so this spec brings its own working storage instead of trusting test order.
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    key: (index: number) => [...items.keys()][index] ?? null,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, String(value)),
    removeItem: (key: string) => void items.delete(key),
    clear: () => items.clear(),
  };
}

describe('PwaService', () => {
  const originalUa = navigator.userAgent;
  let previousStorage: Storage;

  beforeEach(() => {
    previousStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: memoryStorage(),
      writable: true,
      configurable: true,
    });
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0');
  });

  afterEach(() => {
    setUserAgent(originalUa);
    Object.defineProperty(window, 'localStorage', {
      value: previousStorage,
      writable: true,
      configurable: true,
    });
    vi.useRealTimers();
  });

  function create(): PwaService {
    TestBed.configureTestingModule({});
    return TestBed.inject(PwaService);
  }

  it('shows no install card on a desktop browser without an install event', () => {
    expect(create().installPlatform()).toBeNull();
  });

  it('shows the iPhone card in Safari on iOS', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1');
    expect(create().installPlatform()).toBe('ios');
  });

  it('treats an iPad that reports itself as a Mac as iOS', () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 5);
    expect(create().installPlatform()).toBe('ios');
  });

  it('shows the Android card when Chrome offers installing, and installs on request', async () => {
    const pwa = create();
    const event = fakeInstallEvent('accepted');
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(pwa.installPlatform()).toBe('android');

    await expect(pwa.install()).resolves.toBe(true);
    expect(event.prompt).toHaveBeenCalled();
    expect(pwa.installPlatform()).toBeNull();
  });

  it('hides the card for 14 days after "Ikke nå"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T12:00:00Z'));
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1');
    create().dismissInstall();

    TestBed.resetTestingModule();
    expect(create().installPlatform()).toBeNull();

    vi.setSystemTime(new Date(Date.now() + INSTALL_DISMISS_MS + 1000));
    TestBed.resetTestingModule();
    expect(create().installPlatform()).toBe('ios');
  });

  it('follows the online and offline events', () => {
    const pwa = create();
    window.dispatchEvent(new Event('offline'));
    expect(pwa.online()).toBe(false);
    window.dispatchEvent(new Event('online'));
    expect(pwa.online()).toBe(true);
  });

  it('stores the last sync time', () => {
    const pwa = create();
    pwa.markSynced(1234);
    expect(pwa.lastSyncAt()).toBe(1234);
    expect(localStorage.getItem(STORAGE_KEYS.LAST_SYNC_AT)).toBe('1234');
  });

  it('deletes the API cache on clearApiCache', async () => {
    const del = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', { delete: del });
    await create().clearApiCache();
    expect(del).toHaveBeenCalledWith('diddit-api');
    vi.unstubAllGlobals();
  });
});
