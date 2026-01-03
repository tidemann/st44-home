import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { BarChart, type BarChartDataPoint } from '../charts/bar-chart/bar-chart';
import type { DailyCompletion } from '@st44/types';

/**
 * Daily Points Chart Component
 *
 * Displays a bar chart showing points earned each day.
 * Uses the DailyCompletion data from the analytics API.
 *
 * @example
 * ```html
 * <app-daily-points-chart
 *   [dailyData]="analytics.dailyPoints"
 *   title="Points This Week"
 * />
 * ```
 */
@Component({
  selector: 'app-daily-points-chart',
  imports: [BarChart],
  templateUrl: './daily-points-chart.html',
  styleUrl: './daily-points-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailyPointsChart {
  /** Daily completion data from analytics API */
  dailyData = input.required<DailyCompletion[]>();

  /** Chart title */
  title = input<string>('Points Earned');

  /** Chart height in pixels */
  height = input<number>(180);

  /** Bar color */
  barColor = input<string>('#fbbf24');

  /** Transform daily data into chart data points */
  chartData = computed<BarChartDataPoint[]>(() => {
    const data = this.dailyData();
    return data.map((d) => ({
      label: this.formatDayLabel(d.date),
      value: d.pointsEarned,
    }));
  });

  /** Calculate total points for the period */
  totalPoints = computed(() => {
    return this.dailyData().reduce((sum, d) => sum + d.pointsEarned, 0);
  });

  /** Format date to short day name (Mon, Tue, etc.) */
  private formatDayLabel(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00'); // Use noon to avoid timezone issues
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
}
