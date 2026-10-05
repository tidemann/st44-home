import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import {
  PUSH_BROWSER,
  PushNotificationService,
  vapidKeyToBytes,
  type PushBrowser,
} from './push-notification.service';
import { ApiService } from './api.service';
import { PwaService } from './pwa.service';

describe('PushNotificationService', () => {
  const endpoint = 'https://push.example.com/abc';
  let subscription: {
    endpoint: string;
    toJSON: () => unknown;
    unsubscribe: ReturnType<typeof vi.fn>;
  };
  let current: typeof subscription | null;
  let pushManager: {
    getSubscription: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  };
  let browser: { [K in keyof PushBrowser]: ReturnType<typeof vi.fn> };
  let api: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let pwa: { ios: boolean; standalone: ReturnType<typeof signal<boolean>> };

  function create(): PushNotificationService {
    TestBed.configureTestingModule({
      providers: [
        { provide: PUSH_BROWSER, useValue: browser },
        { provide: ApiService, useValue: api },
        { provide: PwaService, useValue: pwa },
      ],
    });
    return TestBed.inject(PushNotificationService);
  }

  beforeEach(() => {
    subscription = {
      endpoint,
      toJSON: () => ({ endpoint, keys: { p256dh: 'p-key', auth: 'a-key' } }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    current = null;
    pushManager = {
      getSubscription: vi.fn(async () => current),
      subscribe: vi.fn(async () => {
        current = subscription;
        return subscription;
      }),
    };
    browser = {
      supported: vi.fn(() => true),
      permission: vi.fn(() => 'default'),
      requestPermission: vi.fn().mockResolvedValue('granted'),
      registration: vi.fn().mockResolvedValue({ pushManager }),
    };
    api = {
      get: vi.fn().mockResolvedValue({ enabled: true, publicKey: 'AQID' }),
      post: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    pwa = { ios: false, standalone: signal(false) };
  });

  it('decodes a base64url VAPID key', () => {
    expect(Array.from(vapidKeyToBytes('AQID'))).toEqual([1, 2, 3]);
    expect(Array.from(vapidKeyToBytes('-_8'))).toEqual([251, 255]);
  });

  it('is off when allowed but not subscribed', async () => {
    expect(await create().refresh()).toBe('off');
  });

  it('asks iPhone users in Safari to install first', async () => {
    browser.supported.mockReturnValue(false);
    pwa.ios = true;
    expect(await create().refresh()).toBe('needs-install');
  });

  it('is unsupported in a browser without push', async () => {
    browser.supported.mockReturnValue(false);
    expect(await create().refresh()).toBe('unsupported');
  });

  it('is server-off when the server has no keys', async () => {
    api.get.mockResolvedValue({ enabled: false, publicKey: null });
    expect(await create().refresh()).toBe('server-off');
  });

  it('is blocked when the browser denied notifications', async () => {
    browser.permission.mockReturnValue('denied');
    const service = create();
    expect(await service.refresh()).toBe('blocked');
    expect(service.state()).toBe('blocked');
  });

  it('is on, and re-saves the subscription for the current user', async () => {
    browser.permission.mockReturnValue('granted');
    current = subscription;
    expect(await create().refresh()).toBe('on');
    expect(api.post).toHaveBeenCalledWith(
      '/push/subscriptions',
      { endpoint, keys: { p256dh: 'p-key', auth: 'a-key' } },
      { skipLoading: true },
    );
  });

  it('subscribes and saves on enable', async () => {
    const service = create();
    expect(await service.enable()).toBe('on');
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3]),
    });
    expect(api.post).toHaveBeenCalledWith('/push/subscriptions', expect.anything(), {
      skipLoading: true,
    });
    expect(service.state()).toBe('on');
    expect(service.busy()).toBe(false);
  });

  it('is blocked when the user says no to the permission prompt', async () => {
    browser.requestPermission.mockResolvedValue('denied');
    expect(await create().enable()).toBe('blocked');
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('stays off when the user closes the permission prompt', async () => {
    browser.requestPermission.mockResolvedValue('default');
    expect(await create().enable()).toBe('off');
  });

  it('removes the subscription on disable', async () => {
    current = subscription;
    expect(await create().disable()).toBe('off');
    expect(api.delete).toHaveBeenCalledWith('/push/subscriptions', {
      body: { endpoint },
      skipLoading: true,
    });
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });

  it('reports an error when the server cannot be reached', async () => {
    api.get.mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = create();
    expect(await service.refresh()).toBe('error');
    expect(service.busy()).toBe(false);
  });

  it('returns how many test messages were sent', async () => {
    api.post.mockResolvedValue({ sent: 2 });
    expect(await create().sendTest()).toBe(2);
    expect(api.post).toHaveBeenCalledWith('/push/test', {}, { skipLoading: true });
  });

  it('sends "Påminn nå" for one chore and returns how many phones got it', async () => {
    api.post.mockResolvedValue({ sent: 1 });
    expect(await create().remind('a-1')).toBe(1);
    expect(api.post).toHaveBeenCalledWith('/assignments/a-1/remind', {}, { skipLoading: true });
  });
});
