import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/**
 * EmptyGroup: rule 7's white card for an empty group (guide: Desktop: rules for all pages).
 * One title line and one sentence, left-aligned, no button. The default is 13 / 15 px inside;
 * `roomy` is Home's taller «Gjort i dag» card, 20 px inside (desktop-14).
 */
@Component({
  selector: 'app-empty-group',
  template: `<div class="card" [class.roomy]="roomy()" role="status">
    <p class="title">{{ heading() }}</p>
    <p class="sub">{{ hint() }}</p>
  </div>`,
  styleUrl: './empty-group.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyGroup {
  heading = input.required<string>();
  hint = input.required<string>();
  roomy = input<boolean>(false);
}
