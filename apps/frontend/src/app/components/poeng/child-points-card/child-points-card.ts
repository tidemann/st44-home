import '@angular/localize/init';
import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { ChoreMeter, type ChoreState } from '../chore-meter/chore-meter';

/**
 * A child on the family screen (guide: Child card): name, points total in
 * Number 30, "poeng", the green/rust chore meter and "1 av 3 gjort".
 * Three across at 109 px on a 390 px phone.
 */
@Component({
  selector: 'app-child-points-card',
  imports: [ChoreMeter],
  templateUrl: './child-points-card.html',
  styleUrl: './child-points-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildPointsCard {
  name = input.required<string>();
  points = input<number>(0);
  chores = input<ChoreState[]>([]);

  protected readonly done = computed(() => this.chores().filter((c) => c === 'done').length);
  protected readonly behind = computed(() => this.chores().includes('late'));
  protected readonly doneLabel = computed(
    () => $localize`:@@childCard.done:${this.done()}:done: av ${this.chores().length}:total: gjort`,
  );
  protected readonly pointsLabel = computed(
    () => $localize`:@@childCard.pointsAria:${this.points()}:points: poeng`,
  );
}
