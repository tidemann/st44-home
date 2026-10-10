import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

/**
 * Points meter (guide: Meters, 1): segmented pills, 14 px tall, 4 px apart.
 * On white: yellow filled on track. On the yellow tick screen: ink on yellow-track.
 * Never alone: the number always sits beside it, so the meter itself is hidden
 * from assistive tech.
 */
@Component({
  selector: 'app-points-meter',
  template: `@for (on of cells(); track $index) {
    <i [class.on]="on"></i>
  }`,
  styleUrl: './points-meter.css',
  host: { 'aria-hidden': 'true', '[class.on-yellow]': 'onYellow()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PointsMeter {
  /** Number of segments */
  segments = input<number>(10);

  /** Share filled, 0..1 */
  value = input<number>(0);

  /** Drawn on the yellow tick screen */
  onYellow = input<boolean>(false);

  protected readonly cells = computed(() => {
    const n = Math.max(1, Math.round(this.segments()));
    const v = Math.min(Math.max(this.value(), 0), 1);
    // A meter that is not full never looks full: 99 % still leaves the last cell empty
    const filled = v >= 1 ? n : Math.min(Math.floor(v * n), n - 1);
    return Array.from({ length: n }, (_, i) => i < filled);
  });
}
