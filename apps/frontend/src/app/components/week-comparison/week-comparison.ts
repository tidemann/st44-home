import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import type { PeriodComparison } from '@st44/types';

/**
 * Week Comparison Component
 *
 * Displays this week vs last week comparison with visual indicators
 * for improvement or decline.
 *
 * @example
 * ```html
 * <app-week-comparison [comparison]="analytics.periodComparison" />
 * ```
 */
@Component({
  selector: 'app-week-comparison',
  imports: [],
  templateUrl: './week-comparison.html',
  styleUrl: './week-comparison.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekComparison {
  /** Period comparison data from analytics API */
  comparison = input.required<PeriodComparison>();

  /** Current week completion rate */
  currentRate = computed(() => Math.round(this.comparison().current.completionRate));

  /** Previous week completion rate */
  previousRate = computed(() => Math.round(this.comparison().previous.completionRate));

  /** Completion rate change */
  rateChange = computed(() => {
    const change = this.comparison().change.completionRateDelta;
    return Math.round(change * 10) / 10; // Round to 1 decimal
  });

  /** Points change */
  pointsChange = computed(() => this.comparison().change.pointsDelta);

  /** Whether completion rate improved */
  isImproved = computed(() => this.comparison().change.completionRateDelta > 0);

  /** Whether completion rate declined */
  isDeclined = computed(() => this.comparison().change.completionRateDelta < 0);

  /** Get trend arrow */
  trendArrow = computed(() => {
    if (this.isImproved()) return '↑';
    if (this.isDeclined()) return '↓';
    return '→';
  });

  /** Get trend message */
  trendMessage = computed(() => {
    const change = Math.abs(this.rateChange());
    if (change === 0) return 'Same as last week';
    if (this.isImproved()) return `Up ${change}% from last week`;
    return `Down ${change}% from last week`;
  });
}
