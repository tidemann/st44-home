import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { z } from 'zod';
import { AuthService } from '../../services/auth.service';
import { PushNotificationService, type PushState } from '../../services/push-notification.service';
import { INSTALL_DISMISS_MS, PwaService } from '../../services/pwa.service';
import { StorageService } from '../../services/storage.service';
import { STORAGE_KEYS } from '../../services/storage-keys';
import type { NotificationAudience } from '../notification-settings/notification-settings';

/**
 * Notifications offer (ST-686): after install or login, a card at the bottom
 * that asks to turn on notifications, for parents and children. Browsers only
 * show their permission question after a tap, so the card has the button.
 *
 * Shows only when push is "off" on this phone (allowed, not yet on), and not
 * while the install card is up. "Ikke nå" hides it for 14 days, like the
 * install card.
 */
@Component({
  selector: 'app-notification-offer',
  templateUrl: './notification-offer.html',
  styleUrl: './notification-offer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationOffer {
  private readonly push = inject(PushNotificationService);
  private readonly pwa = inject(PwaService);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);

  /** Force a state (Storybook); 'auto' follows this phone */
  readonly state = input<PushState | 'auto'>('auto');
  /** Force who reads it (Storybook); 'auto' follows the login */
  readonly audience = input<NotificationAudience | 'auto'>('auto');

  private readonly dismissed = signal(
    this.storage.get(STORAGE_KEYS.NOTIFY_OFFER_DISMISSED, z.boolean()) === true,
  );

  protected readonly busy = this.push.busy;

  protected readonly forChild = computed(() => {
    const forced = this.audience();
    return forced === 'auto' ? this.auth.hasRole('child') : forced === 'child';
  });

  protected readonly visible = computed(() => {
    const forced = this.state();
    if (forced !== 'auto') return forced === 'off';
    return (
      this.auth.isAuthenticated() &&
      !this.dismissed() &&
      this.pwa.installPlatform() === null &&
      this.push.state() === 'off'
    );
  });

  constructor() {
    // Find out where push stands each time someone logs in on this phone
    effect(() => {
      if (this.state() === 'auto' && this.auth.isAuthenticated()) {
        untracked(() => void this.push.refresh());
      }
    });
  }

  protected async enable(): Promise<void> {
    await this.push.enable();
  }

  protected dismiss(): void {
    this.dismissed.set(true);
    this.storage.setWithTTL(STORAGE_KEYS.NOTIFY_OFFER_DISMISSED, true, INSTALL_DISMISS_MS);
  }
}
