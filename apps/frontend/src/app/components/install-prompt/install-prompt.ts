import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { PwaService, type InstallPlatform } from '../../services/pwa.service';

/**
 * Install card (sketch 01). iPhone: the two manual steps in Safari, because
 * Safari has no install button. Android/Chrome: our own "Installer" button.
 * Both have an equal-weight "Ikke nå" that hides the card for 14 days.
 */
@Component({
  selector: 'app-install-prompt',
  templateUrl: './install-prompt.html',
  styleUrl: './install-prompt.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallPrompt {
  private readonly pwa = inject(PwaService);

  /** Force a variant (Storybook); 'auto' follows the device */
  readonly platform = input<InstallPlatform | 'auto'>('auto');

  protected readonly variant = computed<InstallPlatform>(() => {
    const forced = this.platform();
    return forced === 'auto' ? this.pwa.installPlatform() : forced;
  });

  protected async install(): Promise<void> {
    await this.pwa.install();
  }

  protected dismiss(): void {
    this.pwa.dismissInstall();
  }
}
