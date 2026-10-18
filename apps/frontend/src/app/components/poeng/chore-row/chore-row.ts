import '@angular/localize/init';
import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

/** The Android and iOS long-press threshold (ST-1391) */
export const LONG_PRESS_MS = 500;
/** A finger that moves further than this is scrolling, and scroll always wins */
export const LONG_PRESS_SLOP_PX = 10;

/**
 * Poeng chore row (guide: Cards and rows)
 *
 * White 68 px card: checkbox, title over a who-and-when line, then either the
 * points in amber ink or a projected row action (`[row-action]`, e.g. «Ferdig»).
 * Overdue rows keep the white fill and get a 2 px rust border; done rows show a
 * green tick and say when ("Gjort 16.10"), never a tick alone.
 *
 * In select mode (`selectable`) the whole row is one checkbox (ST-1343). A
 * `pressable` row starts select mode on a 500 ms touch press: a 2 px Ink line
 * inside the card while the finger is down, and the tap that follows the lift is
 * swallowed so the row does not also open (ST-1391).
 */
@Component({
  selector: 'app-chore-row',
  templateUrl: './chore-row.html',
  styleUrl: './chore-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChoreRow {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

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

  /**
   * A line under the row, inside the card: «Påminnelse sendt 16.49» with a green
   * tick, or a failure in rust with a warning sign (ST-1066, option C). Null hides it
   */
  note = input<{ text: string; tone: 'done' | 'overdue' } | null>(null);

  /** Ticked the box */
  check = output<void>();

  /** Select mode: the whole row is a checkbox (ST-1343) */
  selectable = input<boolean>(false);

  /** Ticked in select mode */
  selected = input<boolean>(false);

  /** A long touch press starts select mode (ST-1391). Off for rows with no live template */
  pressable = input<boolean>(false);

  /** Tapped the row in select mode */
  pick = output<void>();

  /** Held for 500 ms; carries the card's top edge in the viewport, so the page can keep it there */
  longPress = output<number>();

  /** Tapped the title area */
  open = output<void>();

  /** The finger is down on the row: draws the 2 px Ink line */
  protected readonly held = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private start: { x: number; y: number } | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelPress());
  }

  protected readonly checkLabel = (title: string) =>
    $localize`:@@choreRow.check:Merk som ferdig: ${title}:title:`;

  protected onPointerDown(event: PointerEvent): void {
    // A mouse has no long press: desktop is unchanged (ST-1391)
    if (!this.pressable() || this.selectable() || event.pointerType === 'mouse') return;
    // The tick-off box and a row action keep their own tap
    const target = event.target as HTMLElement | null;
    if (target?.closest('.cb, [row-action]')) return;

    this.cancelPress();
    this.start = { x: event.clientX, y: event.clientY };
    this.held.set(true);
    this.timer = setTimeout(() => this.firePress(), LONG_PRESS_MS);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.start) return;
    const dx = event.clientX - this.start.x;
    const dy = event.clientY - this.start.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_SLOP_PX) this.cancelPress();
  }

  /** Lift before 500 ms, a scroll taking over (pointercancel) or leaving the row */
  protected cancelPress(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.start = null;
    this.held.set(false);
  }

  /** Kills Android Chrome's own long-press menu, but never the desktop right-click */
  protected onContextMenu(event: Event): void {
    const type = (event as PointerEvent).pointerType;
    if (this.pressable() && (type === 'touch' || type === 'pen' || this.timer !== null)) {
      event.preventDefault();
    }
  }

  private firePress(): void {
    const top = this.host.nativeElement.getBoundingClientRect().top;
    this.cancelPress();
    swallowNextClick();
    navigator.vibrate?.(10);
    this.longPress.emit(top);
  }
}

/**
 * A long press must never also open the row (ST-1391). Select mode re-draws the list under
 * the finger, so the click after the lift can land on another row: catch it on the window,
 * in the capture phase. Released shortly after the lift if no click comes.
 */
function swallowNextClick(): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const release = () => {
    clearTimeout(timer);
    window.removeEventListener('click', swallow, true);
    window.removeEventListener('pointerup', onLift, true);
  };
  const swallow = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    release();
  };
  const onLift = () => {
    clearTimeout(timer);
    timer = setTimeout(release, 400);
  };
  window.addEventListener('click', swallow, true);
  window.addEventListener('pointerup', onLift, true);
  // Never hold on to a click for long, whatever the browser does
  timer = setTimeout(release, 5000);
}
