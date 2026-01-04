import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { LineChart, type LineChartSeries } from '../charts/line-chart/line-chart';
import type { ChildProgressHistory } from '@st44/types';

// Colors for different children
const CHILD_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

/**
 * Children Trends Component
 *
 * Displays completion rate trends for each child in the household
 * using a multi-series line chart.
 *
 * @example
 * ```html
 * <app-children-trends [childrenProgress]="analytics.childrenProgress" />
 * ```
 */
@Component({
  selector: 'app-children-trends',
  imports: [LineChart],
  templateUrl: './children-trends.html',
  styleUrl: './children-trends.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildrenTrends {
  /** Children progress data from analytics API */
  childrenProgress = input.required<ChildProgressHistory[]>();

  /** Chart height */
  height = input<number>(220);

  /** Whether to show the legend */
  showLegend = input<boolean>(true);

  /** X-axis labels (dates formatted as day names) */
  chartLabels = computed<string[]>(() => {
    const children = this.childrenProgress();
    if (children.length === 0) return [];

    // Get labels from first child's daily data
    const firstChild = children[0];
    return firstChild.dailyData.map((d) => this.formatDayLabel(d.date));
  });

  /** Series data for each child */
  chartSeries = computed<LineChartSeries[]>(() => {
    return this.childrenProgress().map((child, index) => ({
      label: child.childName,
      data: child.dailyData.map((d) => Math.round(d.completionRate)),
      color: CHILD_COLORS[index % CHILD_COLORS.length],
    }));
  });

  /** Summary stats for each child */
  childSummaries = computed(() => {
    return this.childrenProgress().map((child, index) => ({
      name: child.childName,
      avgRate: Math.round(child.averageCompletionRate),
      totalPoints: child.totalPointsEarned,
      color: CHILD_COLORS[index % CHILD_COLORS.length],
    }));
  });

  /** Format date to short day name */
  private formatDayLabel(dateStr: string): string {
    // Handle both YYYY-MM-DD and full ISO timestamp formats
    // Extract just the date portion if it's an ISO timestamp
    const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const date = new Date(dateOnly + 'T12:00:00'); // Use noon to avoid timezone issues
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
}
