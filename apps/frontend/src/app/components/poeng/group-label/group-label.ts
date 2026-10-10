import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/**
 * Group label ("Forfalt", "I dag", "Gjort i dag", "Hentet før") with an
 * optional count or summary on the right (guide: Label 13/600).
 */
@Component({
  selector: 'app-group-label',
  template: `<h2 class="glabel" [class.rust]="overdue()">
    <span>{{ label() }}</span>
    @if (right()) {
      <span class="right">{{ right() }}</span>
    }
  </h2>`,
  styleUrl: './group-label.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupLabel {
  label = input.required<string>();
  right = input<string>('');
  overdue = input<boolean>(false);
}
