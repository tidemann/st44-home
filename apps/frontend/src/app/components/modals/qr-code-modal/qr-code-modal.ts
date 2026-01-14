import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { Modal } from '../modal/modal';
import { QrCodeDisplayComponent } from '../../qr-code-display/qr-code-display';

/**
 * QR Code Modal
 *
 * Displays a QR code for a child to enable quick login.
 * Parents can download, print, or regenerate the QR code.
 */
@Component({
  selector: 'app-qr-code-modal',
  imports: [Modal, QrCodeDisplayComponent],
  templateUrl: './qr-code-modal.html',
  styleUrl: './qr-code-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeModal {
  /**
   * Whether the modal is open
   */
  open = input<boolean>(false);

  /**
   * The child ID to generate QR code for
   */
  childId = input.required<string>();

  /**
   * The child's name for display
   */
  childName = input<string>('');

  /**
   * Event emitted when the modal should be closed
   */
  closeRequested = output<void>();

  /**
   * Handle close request
   */
  protected handleClose(): void {
    this.closeRequested.emit();
  }
}
