import { Component, ChangeDetectionStrategy, input } from '@angular/core';

export type ChoreState = 'done' | 'open' | 'late';

/**
 * Chore meter (guide: Meters, 2): one 7 px pill per chore today, 3 px apart.
 * Done green, open track, overdue rust. Never yellow. The "1 av 3 gjort" text
 * beside it carries the number, so the meter is hidden from assistive tech.
 */
@Component({
  selector: 'app-chore-meter',
  template: `@for (state of states(); track $index) {
    <i [class.ok]="state === 'done'" [class.late]="state === 'late'"></i>
  }`,
  styleUrl: './chore-meter.css',
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChoreMeter {
  states = input<ChoreState[]>([]);
}
