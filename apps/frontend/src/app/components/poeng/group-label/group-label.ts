import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/**
 * Group label ("Forfalt", "I dag", "Gjort i dag", "Hentet før") with an
 * optional count or summary on the right (guide: Label 13/600).
 *
 * A projected `[label-action]` (the «Velg» row-action button, ST-1343) sits after
 * the count, outside the heading.
 */
@Component({
  selector: 'app-group-label',
  template: `<div class="gl">
    <h2 class="glabel" [class.rust]="overdue()">
      <span>{{ label() }}</span>
      @if (right()) {
        <span class="right">{{ right() }}</span>
      }
    </h2>
    <ng-content select="[label-action]" />
  </div>`,
  styleUrl: './group-label.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupLabel {
  label = input.required<string>();
  right = input<string>('');
  overdue = input<boolean>(false);
}
