import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Modal } from '../modal/modal';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';

/**
 * The Diddit confirm dialog (guide: Popups): a blocking popup with the ink edge and the 30 % veil,
 * the safe answer outlined on the left, the one that acts filled on the right («Slett» in rust).
 * Mounted once in the app root; ask through ConfirmDialogService.confirm().
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Modal],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  private readonly service = inject(ConfirmDialogService);

  protected readonly request = this.service.pending;
  protected readonly open = computed(() => this.request() !== null);

  protected answer(answer: boolean): void {
    this.service.answer(answer);
  }
}
