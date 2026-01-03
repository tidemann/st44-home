import {
  Component,
  input,
  effect,
  ElementRef,
  viewChild,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

/**
 * Data series for line chart
 */
export interface LineChartSeries {
  label: string;
  data: number[];
  color: string;
}

/**
 * Line Chart Component
 *
 * A reusable line chart component using Chart.js.
 * Supports multiple series for comparison.
 *
 * @example
 * ```html
 * <app-line-chart
 *   [labels]="['Mon', 'Tue', 'Wed', 'Thu', 'Fri']"
 *   [series]="[{ label: 'Points', data: [10, 20, 15, 25, 30], color: '#3b82f6' }]"
 *   [height]="200"
 * />
 * ```
 */
@Component({
  selector: 'app-line-chart',
  imports: [],
  templateUrl: './line-chart.html',
  styleUrl: './line-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChart implements OnDestroy {
  /** X-axis labels */
  labels = input.required<string[]>();

  /** Data series to display */
  series = input.required<LineChartSeries[]>();

  /** Chart height in pixels */
  height = input<number>(200);

  /** Show area fill under line */
  showFill = input<boolean>(true);

  /** Show data points */
  showPoints = input<boolean>(true);

  /** Y-axis label */
  yAxisLabel = input<string>('');

  /** Show legend */
  showLegend = input<boolean>(false);

  /** Canvas element reference */
  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');

  /** Chart.js instance */
  private chart: Chart | null = null;

  constructor() {
    // Effect to update chart when inputs change
    effect(() => {
      const labels = this.labels();
      const series = this.series();
      const showFill = this.showFill();
      const showPoints = this.showPoints();
      const yLabel = this.yAxisLabel();
      const showLegend = this.showLegend();

      // Defer chart creation/update to next microtask to ensure canvas is ready
      queueMicrotask(() => {
        this.updateChart(labels, series, showFill, showPoints, yLabel, showLegend);
      });
    });
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private updateChart(
    labels: string[],
    series: LineChartSeries[],
    showFill: boolean,
    showPoints: boolean,
    yLabel: string,
    showLegend: boolean,
  ): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    // Destroy existing chart
    this.destroyChart();

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: series.map((s) => ({
          label: s.label,
          data: s.data,
          borderColor: s.color,
          backgroundColor: showFill ? this.hexToRgba(s.color, 0.1) : 'transparent',
          fill: showFill,
          tension: 0.3,
          pointRadius: showPoints ? 4 : 0,
          pointHoverRadius: showPoints ? 6 : 0,
          pointBackgroundColor: s.color,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: showLegend,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 16,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: { size: 12 },
            bodyFont: { size: 14, weight: 'bold' },
            padding: 10,
            cornerRadius: 6,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: { size: 11 },
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
            title: {
              display: !!yLabel,
              text: yLabel,
              font: { size: 12 },
            },
            ticks: {
              font: { size: 11 },
            },
          },
        },
      },
    };

    this.chart = new Chart(canvas, config);
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hex;
  }
}
