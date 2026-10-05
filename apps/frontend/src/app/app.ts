import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InstallPrompt } from './components/install-prompt/install-prompt';
import { OfflineBanner } from './components/offline-banner/offline-banner';
import { PwaService } from './services/pwa.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, InstallPrompt, OfflineBanner],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly pwa = inject(PwaService);

  constructor() {
    void this.pwa.register();
  }
}
