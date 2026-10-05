import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { PushNotificationService, type PushState } from '../../services/push-notification.service';
import { PwaService } from '../../services/pwa.service';

/** Who reads the card: children get "due" reminders, parents get "done" messages */
export type NotificationAudience = 'parent' | 'child';

/**
 * Push notifications on this phone (ST-623): turn them on or off, send a test,
 * and the honest "Varsler blokkert" state from sketch 08 that says what stops
 * working and how to switch it back on.
 *
 * `compact` is the child's card on "Mine oppgaver": it shows only when there is
 * something to do (off, blocked, needs install), and hides once push is on.
 */
@Component({
  selector: 'app-notification-settings',
  templateUrl: './notification-settings.html',
  styleUrl: './notification-settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationSettings implements OnInit {
  private readonly push = inject(PushNotificationService);
  private readonly pwa = inject(PwaService);

  readonly audience = input<NotificationAudience>('parent');
  readonly compact = input(false);
  /** Force a state (Storybook); 'auto' follows this phone */
  readonly state = input<PushState | 'auto'>('auto');

  protected readonly current = computed<PushState>(() => {
    const forced = this.state();
    return forced === 'auto' ? this.push.state() : forced;
  });

  protected readonly busy = this.push.busy;
  protected readonly ios = this.pwa.ios;
  protected readonly testResult = signal<'sent' | 'none' | 'failed' | null>(null);

  protected readonly visible = computed(() => {
    if (!this.compact()) return true;
    return ['off', 'blocked', 'needs-install'].includes(this.current());
  });

  ngOnInit(): void {
    if (this.state() === 'auto') void this.push.refresh();
  }

  protected async enable(): Promise<void> {
    this.testResult.set(null);
    await this.push.enable();
  }

  protected async disable(): Promise<void> {
    this.testResult.set(null);
    await this.push.disable();
  }

  protected async recheck(): Promise<void> {
    await this.push.refresh();
  }

  protected async sendTest(): Promise<void> {
    try {
      const sent = await this.push.sendTest();
      this.testResult.set(sent > 0 ? 'sent' : 'none');
    } catch {
      this.testResult.set('failed');
    }
  }
}
