import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import type { PushConfigResponse, PushSubscriptionRequest, PushTestResponse } from '@st44/types';
import { ApiService } from './api.service';
import { PwaService } from './pwa.service';

/**
 * Where push stands on this phone (ST-623):
 * - checking: not known yet
 * - unsupported: this browser has no web push
 * - needs-install: iPhone in Safari; push works only from the home screen
 * - server-off: the server has no push keys yet
 * - off: allowed, but not turned on here
 * - on: this phone gets reminders
 * - blocked: the user said no in the browser; only the browser settings can undo it
 * - error: the server could not be reached
 */
export type PushState =
  | 'checking'
  | 'unsupported'
  | 'needs-install'
  | 'server-off'
  | 'off'
  | 'on'
  | 'blocked'
  | 'error';

/** The browser APIs push needs, behind a token so tests can fake them */
export interface PushBrowser {
  supported(): boolean;
  permission(): NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
  registration(): Promise<ServiceWorkerRegistration | undefined>;
}

export const PUSH_BROWSER = new InjectionToken<PushBrowser>('PushBrowser', {
  providedIn: 'root',
  factory: () => ({
    supported: () =>
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window,
    permission: () => Notification.permission,
    requestPermission: () => Notification.requestPermission(),
    registration: () => navigator.serviceWorker.getRegistration(),
  }),
});

/** VAPID public key (base64url) to the bytes PushManager.subscribe wants */
export function vapidKeyToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Web push on this phone: turn reminders on and off, and know when the browser
 * has blocked them (sketch 08).
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly api = inject(ApiService);
  private readonly pwa = inject(PwaService);
  private readonly browser = inject(PUSH_BROWSER);

  readonly state = signal<PushState>('checking');
  readonly busy = signal(false);

  /** Work out the state again (on page open, and after the user was in the browser settings) */
  async refresh(): Promise<PushState> {
    return this.settle(() => this.detect());
  }

  /** Ask the browser for permission and subscribe this phone */
  async enable(): Promise<PushState> {
    return this.settle(async () => {
      const config = await this.config();
      if (!config.enabled || !config.publicKey) return 'server-off';

      const permission = await this.browser.requestPermission();
      if (permission === 'denied') return 'blocked';
      if (permission !== 'granted') return 'off';

      const registration = await this.browser.registration();
      if (!registration) return 'unsupported';
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKeyToBytes(config.publicKey),
        }));
      await this.save(subscription);
      return 'on';
    });
  }

  /** Stop reminders on this phone */
  async disable(): Promise<PushState> {
    return this.settle(async () => {
      const subscription = await this.subscription();
      if (subscription) {
        await this.api.delete<void>('/push/subscriptions', {
          body: { endpoint: subscription.endpoint },
          skipLoading: true,
        });
        await subscription.unsubscribe();
      }
      return 'off';
    });
  }

  /** Send a test notification to this user's phones; returns how many were sent */
  async sendTest(): Promise<number> {
    const result = await this.api.post<PushTestResponse>('/push/test', {}, { skipLoading: true });
    return result.sent;
  }

  /**
   * "Påminn nå" (ST-686): a parent sends the reminder for one open chore to the
   * child's phones. Returns how many phones got it (0: the child has no phone
   * with notifications on). Fails with 409 in quiet hours (20:00-07:00).
   */
  async remind(assignmentId: string): Promise<number> {
    const result = await this.api.post<PushTestResponse>(
      `/assignments/${assignmentId}/remind`,
      {},
      { skipLoading: true },
    );
    return result.sent;
  }

  private async detect(): Promise<PushState> {
    if (!this.browser.supported()) {
      return this.pwa.ios && !this.pwa.standalone() ? 'needs-install' : 'unsupported';
    }
    const config = await this.config();
    if (!config.enabled || !config.publicKey) return 'server-off';

    const permission = this.browser.permission();
    if (permission === 'denied') return 'blocked';
    if (permission !== 'granted') return 'off';

    const subscription = await this.subscription();
    if (!subscription) return 'off';
    // Ties this phone to whoever is logged in now (the server upserts by endpoint)
    await this.save(subscription);
    return 'on';
  }

  private async settle(work: () => Promise<PushState>): Promise<PushState> {
    this.busy.set(true);
    try {
      const state = await work();
      this.state.set(state);
      return state;
    } catch (err) {
      console.error('Push notifications:', err);
      this.state.set('error');
      return 'error';
    } finally {
      this.busy.set(false);
    }
  }

  private config(): Promise<PushConfigResponse> {
    return this.api.get<PushConfigResponse>('/push/config', { skipLoading: true });
  }

  private async subscription(): Promise<PushSubscription | null> {
    const registration = await this.browser.registration();
    return (await registration?.pushManager.getSubscription()) ?? null;
  }

  private async save(subscription: PushSubscription): Promise<void> {
    const json = subscription.toJSON();
    const body: PushSubscriptionRequest = {
      endpoint: subscription.endpoint,
      keys: { p256dh: json.keys?.['p256dh'] ?? '', auth: json.keys?.['auth'] ?? '' },
    };
    await this.api.post<void>('/push/subscriptions', body, { skipLoading: true });
  }
}
