import '@angular/localize/init';
import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { PointsMeter } from '../points-meter/points-meter';

/** The reward the child is saving for, shown on the meter */
export interface TickGoal {
  name: string;
  cost: number;
  /** Balance after this chore */
  balance: number;
}

/** The next open chore, shown on the darker inset */
export interface TickNext {
  title: string;
  meta: string;
  points: number;
}

/** How long «Angre» is offered; the server enforces the same 5 minutes */
export const TICK_UNDO_MS = 5 * 60 * 1000;

/**
 * The tick-off moment (guide: "The tick-off moment (signature)", screen 4).
 *
 * Yellow edge to edge, no nav. Ink badge, the chore, "Haket av 16.48", a huge
 * black «+10 poeng», the praise, the ink meter on the darker gold track, the next
 * chore inset one shade darker, and «Angre» offered at the same size as «Ferdig».
 * Stays until the child presses «Ferdig» (or Escape); it does not time out.
 */
@Component({
  selector: 'app-tick-moment',
  imports: [PointsMeter],
  templateUrl: './tick-moment.html',
  styleUrl: './tick-moment.css',
  host: { '(document:keydown.escape)': 'onEscape()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TickMoment {
  title = input.required<string>();
  /** Clock time it was ticked, "16.48" */
  doneAt = input.required<string>();
  points = input.required<number>();
  childName = input<string>('');
  goal = input<TickGoal | null>(null);
  next = input<TickNext | null>(null);
  /** Undo request in flight */
  undoBusy = input<boolean>(false);
  /** Why the undo did not go through, in words a child understands */
  undoError = input<string | null>(null);

  undo = output<void>();
  closed = output<void>();

  private readonly doneButton = viewChild<ElementRef<HTMLButtonElement>>('doneButton');

  /** «Angre» goes away after 5 minutes, as the text promises */
  protected readonly undoExpired = signal(false);

  protected readonly praise = computed(() =>
    this.childName()
      ? $localize`:@@tick.praiseName:Bra jobba, ${this.childName()}:name:`
      : $localize`:@@tick.praise:Bra jobba`,
  );
  protected readonly pointsLabel = computed(
    () => $localize`:@@tick.pointsAria:${this.points()}:points: poeng`,
  );
  protected readonly goalShare = computed(() => {
    const goal = this.goal();
    return goal && goal.cost > 0 ? goal.balance / goal.cost : 0;
  });
  protected readonly goalLeft = computed(() => {
    const goal = this.goal();
    return goal ? Math.max(goal.cost - goal.balance, 0) : 0;
  });

  constructor() {
    const timer = setTimeout(() => this.undoExpired.set(true), TICK_UNDO_MS);
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
    // The moment is a dialog: put the keyboard on «Ferdig»
    afterNextRender(() => this.doneButton()?.nativeElement.focus());
  }

  protected onEscape(): void {
    this.closed.emit();
  }
}
