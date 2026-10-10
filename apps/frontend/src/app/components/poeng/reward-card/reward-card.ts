import '@angular/localize/init';
import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { PointsMeter } from '../points-meter/points-meter';

/**
 * Reward card (guide: Reward card, screen 5). Title and muted cost on top; then
 * either "Du har nok poeng" with a yellow «Spør mor», or a yellow points meter
 * with "… igjen". A reward that is out of stock says so in words.
 */
@Component({
  selector: 'app-reward-card',
  imports: [PointsMeter],
  templateUrl: './reward-card.html',
  styleUrl: './reward-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RewardCard {
  name = input.required<string>();
  cost = input.required<number>();
  balance = input<number>(0);
  available = input<boolean>(true);
  /** The ask is in flight or already waiting for an answer */
  waiting = input<boolean>(false);

  ask = output<void>();

  protected readonly affordable = computed(() => this.balance() >= this.cost());
  protected readonly missing = computed(() => Math.max(this.cost() - this.balance(), 0));
  protected readonly share = computed(() =>
    this.cost() > 0 ? Math.min(this.balance() / this.cost(), 1) : 1,
  );
  protected readonly askLabel = computed(
    () =>
      $localize`:@@rewardCard.askAria:Spør om ${this.name()}:name: for ${this.cost()}:cost: poeng`,
  );
}
