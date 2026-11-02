import '@angular/localize/init';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import type { TaskTurn, TurnHistoryEntry } from '@st44/types';
import { Modal } from '../modals/modal/modal';
import { TurnService, nextInTurn, scanLink, turnChild } from '../../services/turn.service';
import { clockTime, dayWord } from '../../utils/poeng-format';
import { printTurnCards } from './print-turn-cards';

export type TurnPopupView = 'history' | 'move' | 'code';

/**
 * The parent's popups for an «Etter tur» chore (ST-2075, drawings 10–13 on ST-2066):
 * the history with «Tur nå» and «Flytt», moving the turn by hand, and the scan code
 * with the NFC steps, «Kopier lenken» and «Skriv ut kort».
 */
@Component({
  selector: 'app-turn-popup',
  imports: [Modal],
  templateUrl: './turn-popup.html',
  styleUrl: './turn-popup.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnPopup {
  private readonly turnService = inject(TurnService);

  readonly householdId = input.required<string>();
  /** The chore; null closes the popup */
  readonly turn = input<TaskTurn | null>(null);
  readonly startView = input<TurnPopupView>('history');
  /** «Familien Nordmoen» on the printed card */
  readonly householdName = input<string>('');

  readonly closed = output<void>();
  /** The turn was moved; carries the chore as it is now */
  readonly turnChanged = output<TaskTurn>();

  protected readonly view = signal<TurnPopupView>('history');
  protected readonly history = signal<TurnHistoryEntry[] | null>(null);
  protected readonly picked = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly qr = signal<string | null>(null);
  protected readonly copied = signal(false);

  protected readonly holder = computed(() => {
    const turn = this.turn();
    return turn ? turnChild(turn) : null;
  });

  /** «Neste: Jonas · deretter Mathea» */
  protected readonly nextLine = computed(() => {
    const turn = this.turn();
    if (!turn) return '';
    const next = nextInTurn(turn, 1);
    const then = turn.order.length > 2 ? nextInTurn(turn, 2) : null;
    return then
      ? $localize`:@@turnPopup.nextThen:Neste: ${next?.name}:next: · deretter ${then.name}:then:`
      : $localize`:@@turnPopup.next:Neste: ${next?.name ?? ''}:next:`;
  });

  protected readonly link = computed(() => {
    const code = this.turn()?.scanCode;
    return code ? scanLink(code) : '';
  });

  protected readonly title = computed(() => {
    switch (this.view()) {
      case 'move':
        return $localize`:@@turnPopup.moveTitle:Flytt turen`;
      case 'code':
        return $localize`:@@turnPopup.codeTitle:Skannekode`;
      default:
        return this.turn()?.name ?? '';
    }
  });

  constructor() {
    effect(() => {
      const turn = this.turn();
      if (!turn) return;
      this.error.set(null);
      this.copied.set(false);
      this.view.set(this.startView());
      this.picked.set(turn.turnChildId);
      void this.loadHistory(turn);
      void this.drawQr();
    });
  }

  private async loadHistory(turn: TaskTurn): Promise<void> {
    this.history.set(null);
    try {
      this.history.set(await this.turnService.history(this.householdId(), turn.taskId));
    } catch {
      this.history.set([]);
    }
  }

  private async drawQr(): Promise<void> {
    const link = this.link();
    this.qr.set(
      link
        ? await QRCode.toDataURL(link, { errorCorrectionLevel: 'M', margin: 0, width: 480 })
        : null,
    );
  }

  /** «i dag 16.48 · haket av i appen» */
  protected entryMeta(entry: TurnHistoryEntry): string {
    const at = new Date(entry.at);
    const when = `${dayWord(format(at, 'yyyy-MM-dd'))} ${clockTime(at)}`;
    switch (entry.kind) {
      case 'scan':
        return $localize`:@@turnPopup.viaScan:${when}:when: · skannet koden`;
      case 'moved':
        return entry.movedByName
          ? $localize`:@@turnPopup.movedBy:${when}:when: · flyttet av ${entry.movedByName}:parent:`
          : $localize`:@@turnPopup.moved:${when}:when: · flyttet`;
      default:
        return $localize`:@@turnPopup.viaApp:${when}:when: · haket av i appen`;
    }
  }

  protected entryPoints(entry: TurnHistoryEntry): string {
    return entry.kind === 'moved'
      ? $localize`:@@turnPopup.noPoints:ingen poeng`
      : $localize`:@@turnPopup.points:+${entry.points}:points: p`;
  }

  /** «Når Emma har gjort den, kommer det opp her med klokkeslett og poeng.» */
  protected emptyLine(): string {
    const name = this.holder()?.name ?? '';
    return $localize`:@@turnPopup.emptyBody:Når ${name}:name: har gjort den, kommer det opp her med klokkeslett og poeng.`;
  }

  protected holderSuffix(childId: string): string {
    return childId === this.turn()?.turnChildId
      ? $localize`:@@turnPopup.hasTurn:(har turen nå)`
      : '';
  }

  protected async onMove(): Promise<void> {
    const turn = this.turn();
    const childId = this.picked();
    if (!turn || !childId || this.busy()) return;
    if (childId === turn.turnChildId) {
      this.view.set('history');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const moved = await this.turnService.moveTurn(this.householdId(), turn.taskId, childId);
      this.turnChanged.emit(moved);
    } catch {
      this.error.set($localize`:@@turnPopup.moveFailed:Turen ble ikke flyttet. Prøv igjen.`);
    } finally {
      this.busy.set(false);
    }
  }

  protected async onCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link());
      this.copied.set(true);
    } catch {
      this.copied.set(false);
    }
  }

  protected onPrint(): void {
    const turn = this.turn();
    const qr = this.qr();
    if (!turn || !qr) return;
    printTurnCards({
      taskName: turn.name,
      points: turn.points,
      qrDataUrl: qr,
      link: this.link(),
      householdName: this.householdName(),
    });
  }
}
