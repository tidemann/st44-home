import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  imports: [],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCard {
  /**
   * Icon or emoji to display (e.g., '✓', '🏆', '📊')
   */
  icon = input.required<string>();

  /**
   * Stat value to display (e.g., '3/8', '450', '100%')
   */
  value = input.required<number | string>();

  /**
   * Label describing the stat (e.g., 'Today', 'Points', 'Week')
   */
  label = input.required<string>();

  /**
   * Optional custom gradient class name
   * If not provided, uses default primary gradient
   */
  gradient = input<string>();
}
