import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { addWeeks, getISOWeek } from 'date-fns';
import type { Child } from '@st44/types';
import { mondayOf, weekNumbers } from '../../utils/rotation-weeks';

/** A row being dragged: where it came from, where it would land, and how far it has moved */
interface DragState {
  from: number;
  to: number;
  dy: number;
}

/** Pointer that went down on a row and may become a drag */
interface PendingPointer {
  index: number;
  pointerId: number;
  startY: number;
  /** Handle: starts on the first move. Row (touch): starts after a long press. */
  viaHandle: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

interface RowGeometry {
  tops: number[];
  heights: number[];
  gap: number;
}

/** Long press on a row (touch) before it lifts */
const LONG_PRESS_MS = 400;
/** Movement that turns a press on the handle into a drag, and cancels a long press */
const DRAG_THRESHOLD_PX = 5;
const LONG_PRESS_SLOP_PX = 8;

/**
 * The weekly rotation list of the task popup (ST-2030, picture signed off on ST-2028).
 *
 * One row per child in the household. A tick puts the child in the rotation; the order of
 * the ticked rows is the rotation order, and row 1 has the first week shown. The order is
 * changed by dragging the handle (or a long press on the row on a phone), and without
 * dragging by pressing the handle and moving the row with the arrows (WCAG 2.1.1, 2.5.7).
 * Odd/even weeks are offered only with exactly two ticked children; the top row has the
 * odd weeks.
 */
@Component({
  selector: 'app-rotation-order',
  templateUrl: './rotation-order.html',
  styleUrl: './rotation-order.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RotationOrder {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Every child in the household, in household order */
  readonly children = input<Child[]>([]);
  /** Ticked children, in rotation order */
  readonly order = input<string[]>([]);
  /** The odd/even switch as the parent left it; it only counts with exactly two children */
  readonly oddEven = input(false);
  /** Edit: a changed order starts next week, so row 1 is next week's child (rule 1) */
  readonly startsNextWeek = input(false);
  /** Edit: the child who has this week and keeps it, when it is known */
  readonly thisWeekName = input<string | null>(null);
  /** «Legg til» was pressed with fewer than two ticked: the list is the field in error */
  readonly showError = input(false);
  /** Today, for the week numbers (stories and tests pin it) */
  readonly today = input<Date>(new Date());

  readonly orderChange = output<string[]>();
  readonly oddEvenChange = output<boolean>();

  protected readonly drag = signal<DragState | null>(null);
  /** Child id of the row in move mode (the keyboard / one-finger way), or null */
  protected readonly movingId = signal<string | null>(null);
  /** Read out after each move */
  protected readonly announcement = signal('');

  private pending: PendingPointer | null = null;
  private geometry: RowGeometry | null = null;
  /** A drag ends with pointerup, and the click after it must not tick or open move mode */
  private suppressClickUntil = 0;

  private readonly childById = computed(
    () => new Map(this.children().map((child) => [child.id, child])),
  );

  /** Ticked children that still exist, in rotation order */
  protected readonly ticked = computed(() =>
    this.order()
      .map((id) => this.childById().get(id))
      .filter((child): child is Child => child !== undefined),
  );

  protected readonly unticked = computed(() => {
    const inRotation = new Set(this.order());
    return this.children().filter((child) => !inRotation.has(child.id));
  });

  protected readonly count = computed(() => this.ticked().length);
  protected readonly canReorder = computed(() => this.count() >= 2);
  protected readonly oddEvenAllowed = computed(() => this.count() === 2);
  protected readonly oddEvenOn = computed(() => this.oddEven() && this.oddEvenAllowed());

  /** The order as it will be when the held row is dropped where it is now */
  protected readonly previewOrder = computed(() => {
    const rows = this.ticked();
    const drag = this.drag();
    return drag ? moveItem(rows, drag.from, drag.to) : rows;
  });

  private readonly thisMonday = computed(() => mondayOf(this.today()));
  private readonly thisWeek = computed(() => getISOWeek(this.thisMonday()));
  private readonly nextWeek = computed(() => getISOWeek(addWeeks(this.thisMonday(), 1)));

  /** Week numbers of row 1, 2, ... */
  private readonly rowWeeks = computed(() =>
    weekNumbers(addWeeks(this.thisMonday(), this.startsNextWeek() ? 1 : 0), this.count()),
  );

  /** Second line of the row at a place in the rotation */
  protected weekLabel(place: number): string {
    if (this.oddEvenOn()) {
      return place === 0
        ? $localize`:@@rotationOrder.oddWeeks:oddetallsuker`
        : $localize`:@@rotationOrder.evenWeeks:partallsuker`;
    }
    const week = this.rowWeeks()[place];
    return $localize`:@@rotationOrder.week:uke ${week}:week:`;
  }

  /** Place of each ticked row (by its index in the list) in the order being shown */
  protected readonly placeOfRow = computed(() => {
    const rows = this.ticked();
    const preview = this.previewOrder();
    return rows.map((child) => preview.indexOf(child));
  });

  /** The line under the switch: what the state means, or why it is off */
  protected readonly switchLine = computed(() => {
    if (!this.oddEvenAllowed()) {
      return $localize`:@@rotationOrder.oddEvenNeedsTwo:Oddetall/partall passer bare når to barn deler.`;
    }
    if (!this.oddEvenOn()) {
      return $localize`:@@rotationOrder.everyWeek:De bytter hver uke.`;
    }
    const [odd, even] = this.previewOrder();
    return $localize`:@@rotationOrder.oddEvenWho:${odd.name}:odd: tar oddetallsuker, ${even.name}:even: partallsuker.`;
  });

  /** «Denne uka» and «Neste uke», updated while dragging */
  protected readonly weekLines = computed(() => {
    const order = this.previewOrder();
    if (order.length < 2) return [];
    const thisWeek = this.thisWeek();
    const nextWeek = this.nextWeek();
    const oddEven = this.oddEvenOn();
    const byParity = (week: number) => order[week % 2 === 1 ? 0 : 1].name;

    let thisName: string | null;
    let nextName: string;
    if (this.startsNextWeek()) {
      thisName = this.thisWeekName();
      nextName = oddEven ? byParity(nextWeek) : order[0].name;
    } else {
      thisName = oddEven ? byParity(thisWeek) : order[0].name;
      nextName = oddEven ? byParity(nextWeek) : order[1].name;
    }

    const lines: { label: string; name: string }[] = [];
    if (thisName) {
      lines.push({
        label: oddEven
          ? thisWeek % 2 === 1
            ? $localize`:@@rotationOrder.thisWeekOdd:Denne uka (uke ${thisWeek}:week:, oddetall):`
            : $localize`:@@rotationOrder.thisWeekEven:Denne uka (uke ${thisWeek}:week:, partall):`
          : $localize`:@@rotationOrder.thisWeek:Denne uka (uke ${thisWeek}:week:):`,
        name: thisName,
      });
    }
    lines.push({
      label: oddEven
        ? nextWeek % 2 === 1
          ? $localize`:@@rotationOrder.nextWeekOdd:Neste uke (uke ${nextWeek}:week:, oddetall):`
          : $localize`:@@rotationOrder.nextWeekEven:Neste uke (uke ${nextWeek}:week:, partall):`
        : $localize`:@@rotationOrder.nextWeek:Neste uke (uke ${nextWeek}:week:):`,
      name: nextName,
    });
    return lines;
  });

  protected readonly hint = computed(() => {
    const id = this.movingId();
    const child = id ? this.childById().get(id) : undefined;
    return child
      ? $localize`:@@rotationOrder.moveHint:Flytt ${child.name}:name: med pilene. Trykk håndtaket igjen når du er ferdig.`
      : $localize`:@@rotationOrder.dragHint:Dra håndtaket for å bytte rekkefølge.`;
  });

  constructor() {
    // While a row is held on a touch screen the page must not scroll under the finger.
    // Pointer events cannot stop a scroll that has begun, so stop the touchmove itself.
    const el = this.host.nativeElement;
    const stopScroll = (event: TouchEvent) => {
      if (this.drag()) event.preventDefault();
    };
    el.addEventListener('touchmove', stopScroll, { passive: false });
    inject(DestroyRef).onDestroy(() => {
      el.removeEventListener('touchmove', stopScroll);
      this.stopListening();
    });
  }

  // ------------------------------------------------------------ ticking

  protected toggle(child: Child, event: Event): void {
    // The tick is drawn from the order, never from the box's own state: rows are kept
    // by place, so a box left ticked by the browser would show on the next child.
    event.preventDefault();
    if (Date.now() < this.suppressClickUntil) return;
    if (this.movingId()) {
      // In move mode a press on the row ends it rather than ticking
      this.endMove();
      return;
    }
    const ids = this.ticked().map((c) => c.id);
    const next = ids.includes(child.id) ? ids.filter((id) => id !== child.id) : [...ids, child.id];
    this.orderChange.emit(next);
  }

  protected toggleOddEven(): void {
    if (!this.oddEvenAllowed()) return;
    this.oddEvenChange.emit(!this.oddEven());
  }

  // ------------------------------------------------------------ move mode (no drag)

  protected onHandleClick(child: Child): void {
    if (Date.now() < this.suppressClickUntil) return;
    this.movingId.set(child.id);
    this.focusArrow(child.id, 'up');
  }

  protected moveBy(index: number, step: -1 | 1): void {
    const target = index + step;
    const rows = this.ticked();
    if (target < 0 || target >= rows.length) return;
    const moved = rows[index];
    this.emitOrder(moveItem(rows, index, target));
    this.announce(moved, target);
    // Keep the finger / focus on the same arrow, or the other one at the end of the list
    const edge = target === 0 || target === rows.length - 1;
    this.focusArrow(moved.id, edge ? (step < 0 ? 'down' : 'up') : step < 0 ? 'up' : 'down');
  }

  protected onRowKeydown(index: number, child: Child, event: KeyboardEvent): void {
    if (this.movingId() !== child.id) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveBy(index, event.key === 'ArrowUp' ? -1 : 1);
    } else if (event.key === 'Escape' || event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.endMove();
    }
  }

  protected onRowFocusOut(child: Child, event: FocusEvent): void {
    if (this.movingId() !== child.id) return;
    const row = event.currentTarget as HTMLElement;
    const next = event.relatedTarget as Node | null;
    // Focus moving to another row's arrow after a move is still move mode
    if (next && this.host.nativeElement.contains(next) && next instanceof HTMLElement) {
      if (row.contains(next) || next.closest('[data-arrows]')) return;
    }
    if (next) this.movingId.set(null);
  }

  private endMove(): void {
    const id = this.movingId();
    this.movingId.set(null);
    if (id) {
      afterNextRender(
        () =>
          this.host.nativeElement
            .querySelector<HTMLElement>(`[data-row="${id}"] [data-grip]`)
            ?.focus(),
        { injector: this.injector },
      );
    }
  }

  private focusArrow(id: string, direction: 'up' | 'down'): void {
    afterNextRender(
      () => {
        const row = this.host.nativeElement.querySelector<HTMLElement>(`[data-row="${id}"]`);
        const wanted = row?.querySelector<HTMLElement>(`[data-arrow="${direction}"]`);
        const other = row?.querySelector<HTMLElement>(
          `[data-arrow="${direction === 'up' ? 'down' : 'up'}"]`,
        );
        const usable = (el: HTMLElement | null | undefined) =>
          el && getComputedStyle(el).visibility !== 'hidden' ? el : null;
        (usable(wanted) ?? usable(other))?.focus();
      },
      { injector: this.injector },
    );
  }

  private announce(child: Child, place: number): void {
    this.announcement.set(
      $localize`:@@rotationOrder.moved:${child.name}:name: er nå nummer ${place + 1}:place:, ${this.weekLabel(place)}:week:.`,
    );
  }

  // ------------------------------------------------------------ dragging

  protected onHandlePointerDown(index: number, event: PointerEvent): void {
    if (!this.canReorder() || event.button !== 0) return;
    this.beginPending(index, event, true);
  }

  protected onRowPointerDown(index: number, event: PointerEvent): void {
    // A long press lifts the row on a touch screen; the mouse uses the handle
    if (!this.canReorder() || event.pointerType !== 'touch' || this.pending) return;
    if ((event.target as HTMLElement).closest('[data-grip], [data-arrows]')) return;
    this.beginPending(index, event, false);
    this.pending!.timer = setTimeout(() => {
      if (this.pending) {
        this.pending.timer = null;
        this.startDrag();
      }
    }, LONG_PRESS_MS);
  }

  protected onContextMenu(event: Event): void {
    // Android opens a menu on a long press; the long press is ours here
    if (this.pending || this.drag()) event.preventDefault();
  }

  private beginPending(index: number, event: PointerEvent, viaHandle: boolean): void {
    this.cancelPending();
    this.pending = {
      index,
      pointerId: event.pointerId,
      startY: event.clientY,
      viaHandle,
      timer: null,
    };
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const pending = this.pending;
    if (!pending || event.pointerId !== pending.pointerId) return;
    const dy = event.clientY - pending.startY;

    if (!this.drag()) {
      if (pending.viaHandle) {
        if (Math.abs(dy) > DRAG_THRESHOLD_PX) this.startDrag();
      } else if (Math.abs(dy) > LONG_PRESS_SLOP_PX) {
        // Moved before the long press: it is a scroll, not a drag
        this.cancelPending();
      }
      if (!this.drag()) return;
    }
    event.preventDefault();
    this.updateDrag(dy);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.pending || event.pointerId !== this.pending.pointerId) return;
    const drag = this.drag();
    this.cancelPending();
    if (!drag) return;
    this.suppressClickUntil = Date.now() + 400;
    const rows = this.ticked();
    const moved = rows[drag.from];
    this.drag.set(null);
    this.geometry = null;
    if (drag.to !== drag.from) {
      this.emitOrder(moveItem(rows, drag.from, drag.to));
      this.announce(moved, drag.to);
    }
  };

  private readonly onPointerCancel = (): void => {
    this.cancelPending();
    this.drag.set(null);
    this.geometry = null;
  };

  private startDrag(): void {
    const pending = this.pending;
    if (!pending) return;
    this.movingId.set(null);
    this.geometry = this.measureRows();
    this.drag.set({ from: pending.index, to: pending.index, dy: 0 });
    navigator.vibrate?.(10);
  }

  private updateDrag(dy: number): void {
    const drag = this.drag();
    const geometry = this.geometry;
    if (!drag || !geometry) return;
    const { tops, heights } = geometry;
    // Keep the held row within the list
    const minDy = tops[0] - tops[drag.from];
    const last = tops.length - 1;
    const maxDy = tops[last] + heights[last] - heights[drag.from] - tops[drag.from];
    const clamped = Math.min(Math.max(dy, minDy), maxDy);
    const centre = tops[drag.from] + heights[drag.from] / 2 + clamped;
    // It lands after every other row whose middle it has reached. Held against the end of
    // the list its middle is exactly the end row's, so reaching counts going down and only
    // passing counts going up: both ends can be reached.
    let to = 0;
    tops.forEach((top, i) => {
      const middle = top + heights[i] / 2;
      if (i < drag.from ? middle < centre : i > drag.from && middle <= centre) to++;
    });
    this.drag.set({ from: drag.from, to, dy: clamped });
  }

  private measureRows(): RowGeometry {
    const rows = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>('[data-ticked-row]'),
    );
    const tops = rows.map((row) => row.offsetTop);
    const heights = rows.map((row) => row.offsetHeight);
    const gap = rows.length > 1 ? tops[1] - tops[0] - heights[0] : 8;
    return { tops, heights, gap };
  }

  /** Where each ticked row stands in the order being shown, as a top offset */
  private readonly previewTops = computed(() => {
    const drag = this.drag();
    const geometry = this.geometry;
    if (!drag || !geometry) return null;
    const indices = moveItem(
      this.ticked().map((_, i) => i),
      drag.from,
      drag.to,
    );
    const tops: number[] = new Array(indices.length);
    let y = geometry.tops[0];
    for (const i of indices) {
      tops[i] = y;
      y += geometry.heights[i] + geometry.gap;
    }
    return tops;
  });

  /** The transform of a ticked row while a row is held */
  protected rowTransform(index: number): string | null {
    const drag = this.drag();
    const tops = this.previewTops();
    if (!drag || !tops || !this.geometry) return null;
    if (index === drag.from) return `translate(6px, ${drag.dy}px)`;
    const shift = tops[index] - this.geometry.tops[index];
    return shift === 0 ? null : `translateY(${shift}px)`;
  }

  /** The gap where the held row will land */
  protected readonly slot = computed(() => {
    const drag = this.drag();
    const tops = this.previewTops();
    if (!drag || !tops || !this.geometry) return null;
    return { top: tops[drag.from], height: this.geometry.heights[drag.from] };
  });

  private cancelPending(): void {
    if (this.pending?.timer) clearTimeout(this.pending.timer);
    this.pending = null;
    this.stopListening();
  }

  private stopListening(): void {
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
  }

  private emitOrder(rows: Child[]): void {
    this.orderChange.emit(rows.map((child) => child.id));
  }
}

/** A copy of the list with the item at `from` moved to `to` */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
