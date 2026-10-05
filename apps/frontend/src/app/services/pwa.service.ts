import { Injectable, computed, inject, signal } from '@angular/core';
import { z } from 'zod';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from './storage-keys';

/** Chrome's install prompt event (not in the TypeScript DOM types) */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** "Ikke nå" hides the install card for 14 days (sketch 01) */
export const INSTALL_DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

/** Cache the service worker keeps API answers in (see public/sw.js) */
export const API_CACHE_NAME = 'diddit-api';

export type InstallPlatform = 'ios' | 'android' | null;

/**
 * Installable app (PWA) state: service worker registration, the install card,
 * and online/offline.
 */
@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly storage = inject(StorageService);

  /** The browser has a network connection */
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  /** Running from the home screen, not a browser tab */
  readonly standalone = signal(this.detectStandalone());

  /** Time of the last API answer that came from the network (ms) */
  readonly lastSyncAt = signal<number | null>(
    this.storage.get(STORAGE_KEYS.LAST_SYNC_AT, z.number()),
  );

  private readonly installEvent = signal<BeforeInstallPromptEvent | null>(null);
  private readonly installDismissed = signal(
    this.storage.get(STORAGE_KEYS.INSTALL_DISMISSED, z.boolean()) === true,
  );
  /** iPhone or iPad: push only works once Diddit is on the home screen */
  readonly ios = this.detectIos();

  /** Which install card to show, or null for none */
  readonly installPlatform = computed<InstallPlatform>(() => {
    if (this.standalone() || this.installDismissed()) return null;
    if (this.installEvent()) return 'android';
    if (this.ios) return 'ios';
    return null;
  });

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
    window.addEventListener('beforeinstallprompt', (event) => {
      // Keep Chrome's own mini-bar away; our card shows the button instead
      event.preventDefault();
      this.installEvent.set(event as BeforeInstallPromptEvent);
    });
    window.addEventListener('appinstalled', () => {
      this.installEvent.set(null);
      this.standalone.set(true);
    });
  }

  /**
   * Registers public/sw.js for the app's scope. Not on localhost, so dev
   * servers and e2e runs never get cached answers.
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!environment.production || !('serviceWorker' in navigator)) return null;
    if (['localhost', '127.0.0.1'].includes(location.hostname)) return null;
    try {
      return await navigator.serviceWorker.register('sw.js', { scope: './' });
    } catch (err) {
      console.error('Service worker registration failed:', err);
      return null;
    }
  }

  /** Shows Chrome's install dialog. Returns true when the user installed. */
  async install(): Promise<boolean> {
    const event = this.installEvent();
    if (!event) return false;
    await event.prompt();
    const choice = await event.userChoice;
    this.installEvent.set(null);
    if (choice.outcome === 'dismissed') this.dismissInstall();
    return choice.outcome === 'accepted';
  }

  /** "Ikke nå": hide the card for 14 days */
  dismissInstall(): void {
    this.installDismissed.set(true);
    this.storage.setWithTTL(STORAGE_KEYS.INSTALL_DISMISSED, true, INSTALL_DISMISS_MS);
  }

  /** Called for every API answer that came from the network */
  markSynced(at: number = Date.now()): void {
    this.lastSyncAt.set(at);
    this.storage.set(STORAGE_KEYS.LAST_SYNC_AT, at);
  }

  /** Forget cached API answers (on logout, so the next user never sees them) */
  async clearApiCache(): Promise<void> {
    if (typeof caches === 'undefined') return;
    try {
      await caches.delete(API_CACHE_NAME);
    } catch {
      // Cache storage can be unavailable (private mode); nothing to clear then
    }
  }

  /**
   * Turn push off on this phone (on logout, so the next user never gets the
   * last user's reminders). The server drops the subscription when the push
   * service answers 410 for it.
   */
  async forgetPushSubscription(): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager?.getSubscription();
      await subscription?.unsubscribe();
    } catch {
      // No service worker or no push support; nothing to forget
    }
  }

  private detectStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
  }

  private detectIos(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    // iPadOS reports itself as a Mac, but with touch
    const iPadOs = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    return /iPhone|iPad|iPod/.test(ua) || iPadOs;
  }
}
