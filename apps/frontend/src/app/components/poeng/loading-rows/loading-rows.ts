import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

/** Bar widths of the three drawn placeholder rows, as a share of the row */
const BAR_WIDTHS = [52, 38, 45];

/**
 * LoadingRows: rule 7 (guide: Desktop: rules for all pages). While a list loads, it shows grey
 * placeholder rows in the shape of the rows that are coming — 68 px tall, 13 px corners, 8 px
 * apart, as wide as the list — not a sentence. Desktop only: under 1024 px it draws nothing
 * and the page keeps its own loading state.
 */
@Component({
  selector: 'app-loading-rows',
  template: `
    <span class="visually-hidden">{{ label() }}</span>
    @for (width of widths(); track $index) {
      <div class="row" aria-hidden="true">
        <span class="bar" [style.width.%]="width"></span>
      </div>
    }
  `,
  styles: `
    :host {
      display: none;
    }

    @media (min-width: 1024px) {
      :host {
        display: block;
      }
    }

    .row {
      box-sizing: border-box;
      height: 68px;
      padding: 17px 15px 0;
      border-radius: var(--r-card);
      background: var(--surface);
    }

    .row + .row {
      margin-top: 8px;
    }

    .bar {
      display: block;
      height: 15px;
      border-radius: 999px;
      background: var(--track);
    }
  `,
  host: { role: 'status', 'aria-live': 'polite' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingRows {
  /** How many rows to draw (the pictures draw 3) */
  count = input<number>(3);

  /** What a screen reader hears while the rows show */
  label = input<string>($localize`:@@loadingRows.label:Laster …`);

  protected widths = computed(() =>
    Array.from({ length: this.count() }, (_, i) => BAR_WIDTHS[i % BAR_WIDTHS.length]),
  );
}
