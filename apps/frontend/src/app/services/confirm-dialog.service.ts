import { Injectable, signal } from '@angular/core';

/**
 * One question for the Diddit confirm dialog (guide: Popups). Replaces the browser's confirm().
 */
export interface ConfirmRequest {
  title: string;
  message: string;
  /** The button that acts, on the right */
  confirmLabel: string;
  /** The safe button, on the left (default «Avbryt») */
  cancelLabel?: string;
  /** A destroying answer: the act button is filled with Overdue Rust */
  danger?: boolean;
}

interface PendingConfirm extends ConfirmRequest {
  resolve: (answer: boolean) => void;
}

/**
 * Asks a blocking yes/no question in the Diddit look and resolves with the answer.
 * The dialog itself is <app-confirm-dialog>, mounted once in the app root.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly pendingSignal = signal<PendingConfirm | null>(null);

  readonly pending = this.pendingSignal.asReadonly();

  confirm(request: ConfirmRequest): Promise<boolean> {
    // A second question answers the first with "no" rather than leaving it hanging
    this.pendingSignal()?.resolve(false);
    return new Promise<boolean>((resolve) => {
      this.pendingSignal.set({ ...request, resolve });
    });
  }

  answer(answer: boolean): void {
    const pending = this.pendingSignal();
    if (!pending) return;
    this.pendingSignal.set(null);
    pending.resolve(answer);
  }
}
