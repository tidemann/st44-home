import '@angular/localize/init';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

/**
 * Poeng chore row (guide: Cards and rows)
 *
 * White 68 px card: checkbox, title over a who-and-when line, then either the
 * points in amber ink or a projected row action (`[row-action]`, e.g. «Hak av»).
 * Overdue rows keep the white fill and get a 2 px rust border; done rows show a
 * green tick and say when ("Gjort 16.10"), never a tick alone.
 */
@Component({
  selector: 'app-chore-row',
  templateUrl: './chore-row.html',
  styleUrl: './chore-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChoreRow {
  /** Chore title (Body 16/600) */
  title = input.required<string>();

  /** Who and when, e.g. "Mathea – I dag" (Meta sm 13/500) */
  meta = input<string>('');

  /** Rust border and rust meta line */
  overdue = input<boolean>(false);

  /** Green tick instead of the empty box */
  done = input<boolean>(false);

  /** Right-hand points text, e.g. "5 p" or "+10". Empty hides it */
  points = input<string>('');

  /** The checkbox is a real control that completes the chore */
  checkable = input<boolean>(false);

  /** The checkbox is busy (request in flight) */
  busy = input<boolean>(false);

  /** The title area opens the chore (edit) */
  openable = input<boolean>(false);

  /** Ticked the box */
  check = output<void>();

  /** Tapped the title area */
  open = output<void>();

  protected readonly checkLabel = (title: string) =>
    $localize`:@@choreRow.check:Hak av ${title}:title:`;
}
