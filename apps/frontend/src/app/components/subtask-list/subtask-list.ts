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
  model,
  signal,
} from '@angular/core';
import { moveItem } from '../rotation-order/rotation-order';

/** One sub-task row of the form; `id` is set on rows the server already has */
export interface SubtaskDraft {
  key: string;
  id?: string;
  name: string;
  /** null while the field is empty */
  points: number | null;
}

interface DragState {
  from: number;
  to: number;
  dy: number;
}

interface PendingPointer {
  index: number;
  pointerId: number;
  startY: number;
}

interface RowGeometry {
  tops: number[];
  heights: number[];
  gap: number;
}

/** Movement that turns a press on the handle into a drag */
const DRAG_THRESHOLD_PX = 5;
/** Points a new row starts with (ST-2042 sheet 2, frame 3) */
const NEW_ROW_POINTS = 5;

let nextKey = 0;

/** A new form row; `key` only tells rows apart in the list */
export function subtaskDraft(name = '', points: number | null = NEW_ROW_POINTS, id?: string) {
  return { key: `sub-${nextKey++}`, ...(id && { id }), name, points } as SubtaskDraft;
}

/** 1–1000 whole points, as the chore's own «Poeng» field */
export function subtaskPointsValid(points: number | null): boolean {
  return points !== null && Number.isInteger(points) && points >= 1 && points <= 1000;
}

/**
 * «Deloppgaver (valgfritt)» in the task popup (ST-2074, drawn on ST-2042 sheet 2).
 *
 * Each sub-task is a row of two fields, name and points, with the rotation list's handle on the
 * left (ST-2028) and × on the right. The order is changed by dragging the handle, or without
 * dragging by pressing the handle and moving the row with the arrows (WCAG 2.1.1, 2.5.7). While
 * a row moves, every row puts its fields away and shows its name and points, so the rows are
 * cards that can pass each other.
 */
@Component({
  selector: 'app-subtask-list',
  templateUrl: './subtask-list.html',
  styleUrl: './subtask-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubtaskList {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /**
   * The rows, in order. A model, so a change is the list's own value at once: an «add» and the
   * typing right after it in the same tick must build on each other, not on the old input.
   */
  readonly items = model<SubtaskDraft[]>([]);
  /** The main action was pressed: rows that are not complete show as errors */
  readonly showErrors = input(false);

  protected readonly drag = signal<DragState | null>(null);
  /** Key of the row in move mode (the keyboard / one-finger way), or null */
  protected readonly movingKey = signal<string | null>(null);
  protected readonly announcement = signal('');
  private readonly geometry = signal<RowGeometry | null>(null);

  private pending: PendingPointer | null = null;
  /** A drag ends with pointerup, and the click after it must not open move mode */
  private suppressClickUntil = 0;

  protected readonly canReorder = computed(() => this.items().length >= 2);
  /** Rows show name and points instead of their fields while one of them moves */
  protected readonly compact = computed(() => this.drag() !== null || this.movingKey() !== null);

  protected readonly hint = computed(() => {
    const items = this.items();
    const drag = this.drag();
    if (drag) {
      return $localize`:@@subtaskList.dropHint:Slipp for å legge «${this.label(items[drag.from])}:name:» her.`;
    }
    const moving = items.find((item) => item.key === this.movingKey());
    if (moving) {
      return $localize`:@@subtaskList.moveHint:Flytt «${this.label(moving)}:name:» med pilene. Trykk håndtaket igjen når du er ferdig.`;
    }
    if (this.canReorder()) {
      return $localize`:@@subtaskList.dragHint:Dra håndtaket for å bytte rekkefølge.`;
    }
    return $localize`:@@subtaskList.emptyHint:Del opp oppgaven hvis den har flere trinn. Hvert trinn får sine egne poeng.`;
  });

  constructor() {
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

  /** The name as the row shows it while it moves */
  protected label(item: SubtaskDraft | undefined): string {
    return item?.name.trim() || $localize`:@@subtaskList.unnamed:Uten navn`;
  }

  // Names for screen readers. Bound with $localize: an interpolated i18n-aria-label comes out
  // empty in this build, so the controls would have no name.
  protected gripLabel(item: SubtaskDraft, index: number): string {
    return $localize`:@@subtaskList.moveRow:Flytt ${this.label(item)}:name:, nummer ${index + 1}:place:`;
  }

  protected upLabel(item: SubtaskDraft): string {
    return $localize`:@@subtaskList.moveUp:Flytt ${this.label(item)}:name: opp`;
  }

  protected downLabel(item: SubtaskDraft): string {
    return $localize`:@@subtaskList.moveDown:Flytt ${this.label(item)}:name: ned`;
  }

  protected nameLabel(index: number): string {
    return $localize`:@@subtaskList.nameLabel:Deloppgave ${index + 1}:place:`;
  }

  protected pointsLabel(index: number): string {
    return $localize`:@@subtaskList.pointsLabel:Poeng for deloppgave ${index + 1}:place:`;
  }

  protected removeLabel(item: SubtaskDraft): string {
    return $localize`:@@subtaskList.remove:Fjern ${this.label(item)}:name:`;
  }

  protected nameInvalid(item: SubtaskDraft): boolean {
    return this.showErrors() && item.name.trim() === '';
  }

  protected pointsInvalid(item: SubtaskDraft): boolean {
    return this.showErrors() && !subtaskPointsValid(item.points);
  }

  // ------------------------------------------------------------ editing

  protected add(): void {
    const row = subtaskDraft();
    this.items.set([...this.items(), row]);
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLInputElement>(`[data-row="${row.key}"] [data-name]`)
          ?.focus(),
      { injector: this.injector },
    );
  }

  protected remove(index: number): void {
    const items = this.items();
    this.items.set(items.filter((_, i) => i !== index));
    // Focus stays in the list: the next row's ×, the one above, or «Legg til deloppgave»
    const next = items[index + 1] ?? items[index - 1];
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const target = next
          ? root.querySelector<HTMLElement>(`[data-row="${next.key}"] [data-remove]`)
          : root.querySelector<HTMLElement>('[data-add]');
        target?.focus();
      },
      { injector: this.injector },
    );
  }

  protected setName(index: number, event: Event): void {
    const name = (event.target as HTMLInputElement).value;
    this.items.set(this.items().map((item, i) => (i === index ? { ...item, name } : item)));
  }

  protected setPoints(index: number, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const points = raw === '' ? null : Number(raw);
    this.items.set(this.items().map((item, i) => (i === index ? { ...item, points } : item)));
  }

  // ------------------------------------------------------------ move mode (no drag)

  protected onHandleClick(item: SubtaskDraft): void {
    if (Date.now() < this.suppressClickUntil) return;
    if (this.movingKey() === item.key) {
      this.endMove();
      return;
    }
    this.movingKey.set(item.key);
    this.focusArrow(item.key, 'up');
  }

  protected moveBy(index: number, step: -1 | 1): void {
    const items = this.items();
    const target = index + step;
    if (target < 0 || target >= items.length) return;
    const moved = items[index];
    this.items.set(moveItem(items, index, target));
    this.announce(moved, target);
    const edge = target === 0 || target === items.length - 1;
    this.focusArrow(moved.key, edge ? (step < 0 ? 'down' : 'up') : step < 0 ? 'up' : 'down');
  }

  protected onRowKeydown(index: number, item: SubtaskDraft, event: KeyboardEvent): void {
    if (this.movingKey() !== item.key) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveBy(index, event.key === 'ArrowUp' ? -1 : 1);
    } else if (event.key === 'Escape' || event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.endMove();
    }
  }

  protected onRowFocusOut(item: SubtaskDraft, event: FocusEvent): void {
    if (this.movingKey() !== item.key) return;
    const next = event.relatedTarget as Node | null;
    if (next instanceof HTMLElement && this.host.nativeElement.contains(next)) {
      if (next.closest('[data-arrows]') || next.closest(`[data-row="${item.key}"]`)) return;
    }
    if (next) this.movingKey.set(null);
  }

  private endMove(): void {
    const key = this.movingKey();
    this.movingKey.set(null);
    if (key) {
      afterNextRender(
        () =>
          this.host.nativeElement
            .querySelector<HTMLElement>(`[data-row="${key}"] [data-grip]`)
            ?.focus(),
        { injector: this.injector },
      );
    }
  }

  private focusArrow(key: string, direction: 'up' | 'down'): void {
    afterNextRender(
      () => {
        const row = this.host.nativeElement.querySelector<HTMLElement>(`[data-row="${key}"]`);
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

  private announce(item: SubtaskDraft, place: number): void {
    this.announcement.set(
      $localize`:@@subtaskList.moved:«${this.label(item)}:name:» er nå nummer ${place + 1}:place:.`,
    );
  }

  // ------------------------------------------------------------ dragging

  protected onHandlePointerDown(index: number, event: PointerEvent): void {
    if (!this.canReorder() || event.button !== 0) return;
    this.cancelPending();
    this.pending = { index, pointerId: event.pointerId, startY: event.clientY };
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const pending = this.pending;
    if (!pending || event.pointerId !== pending.pointerId) return;
    const dy = event.clientY - pending.startY;
    if (!this.drag()) {
      if (Math.abs(dy) <= DRAG_THRESHOLD_PX) return;
      this.startDrag();
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
    const items = this.items();
    this.drag.set(null);
    this.geometry.set(null);
    if (drag.to !== drag.from) {
      this.items.set(moveItem(items, drag.from, drag.to));
      this.announce(items[drag.from], drag.to);
    }
  };

  private readonly onPointerCancel = (): void => {
    this.cancelPending();
    this.drag.set(null);
    this.geometry.set(null);
  };

  private startDrag(): void {
    const pending = this.pending;
    if (!pending) return;
    this.movingKey.set(null);
    (document.activeElement as HTMLElement | null)?.blur();
    this.drag.set({ from: pending.index, to: pending.index, dy: 0 });
    // The rows change to cards when the drag starts; measure them once they are drawn
    afterNextRender(() => this.geometry.set(this.measureRows()), { injector: this.injector });
    navigator.vibrate?.(10);
  }

  private updateDrag(dy: number): void {
    const drag = this.drag();
    const geometry = this.geometry();
    if (!drag) return;
    if (!geometry) {
      this.drag.set({ ...drag, dy });
      return;
    }
    const { tops, heights } = geometry;
    const minDy = tops[0] - tops[drag.from];
    const last = tops.length - 1;
    const maxDy = tops[last] + heights[last] - heights[drag.from] - tops[drag.from];
    const clamped = Math.min(Math.max(dy, minDy), maxDy);
    const centre = tops[drag.from] + heights[drag.from] / 2 + clamped;
    let to = 0;
    tops.forEach((top, i) => {
      const middle = top + heights[i] / 2;
      if (i < drag.from ? middle < centre : i > drag.from && middle <= centre) to++;
    });
    this.drag.set({ from: drag.from, to, dy: clamped });
  }

  private measureRows(): RowGeometry {
    const rows = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>('[data-sub-row]'),
    );
    const tops = rows.map((row) => row.offsetTop);
    const heights = rows.map((row) => row.offsetHeight);
    const gap = rows.length > 1 ? tops[1] - tops[0] - heights[0] : 8;
    return { tops, heights, gap };
  }

  private readonly previewTops = computed(() => {
    const drag = this.drag();
    const geometry = this.geometry();
    if (!drag || !geometry) return null;
    const indices = moveItem(
      this.items().map((_, i) => i),
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

  protected rowTransform(index: number): string | null {
    const drag = this.drag();
    const tops = this.previewTops();
    const geometry = this.geometry();
    if (!drag || !tops || !geometry) return null;
    if (index === drag.from) return `translate(6px, ${drag.dy}px)`;
    const shift = tops[index] - geometry.tops[index];
    return shift === 0 ? null : `translateY(${shift}px)`;
  }

  protected readonly slot = computed(() => {
    const drag = this.drag();
    const tops = this.previewTops();
    const geometry = this.geometry();
    if (!drag || !tops || !geometry) return null;
    return { top: tops[drag.from], height: geometry.heights[drag.from] };
  });

  private cancelPending(): void {
    this.pending = null;
    this.stopListening();
  }

  private stopListening(): void {
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
  }
}
