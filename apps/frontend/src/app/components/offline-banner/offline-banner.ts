import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { PwaService } from '../../services/pwa.service';

/**
 * "No network" strip (sketch 08). The page keeps the last data it has; the
 * strip says the data is from the last time the phone was online.
 */
@Component({
  selector: 'app-offline-banner',
  templateUrl: './offline-banner.html',
  styleUrl: './offline-banner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineBanner {
  private readonly pwa = inject(PwaService);

  /** Force the strip on or off (Storybook); 'auto' follows the network */
  readonly offline = input<boolean | 'auto'>('auto');

  /** Override the last sync time (Storybook) */
  readonly lastSyncAt = input<number | null | 'auto'>('auto');

  protected readonly visible = computed(() => {
    const forced = this.offline();
    return forced === 'auto' ? !this.pwa.online() : forced;
  });

  /** "16:02", or null when the app has never been online */
  protected readonly lastSyncTime = computed(() => {
    const forced = this.lastSyncAt();
    const at = forced === 'auto' ? this.pwa.lastSyncAt() : forced;
    if (at === null) return null;
    return new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(at),
    );
  });
}
