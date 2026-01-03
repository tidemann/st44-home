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
 * Data point for bar chart
 */
export interface BarChartDataPoint {
  label: string;
  value: number;
}

/**
 * Bar Chart Component
 *
 * A reusable bar chart component using Chart.js.
 * Displays vertical bars for data visualization.
 *
 * @example
 * ```html
 * <app-bar-chart
 *   [data]="dailyPoints"
 *   [barColor]="'#3b82f6'"
 *   [height]="200"
 * />
 * ```
 */
@Component({
  selector: 'app-bar-chart',
  imports: [],
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarChart implements OnDestroy {
  /** Data points to display */
  data = input.required<BarChartDataPoint[]>();

  /** Bar color (CSS color value) */
  barColor = input<string>('#3b82f6');

  /** Chart height in pixels */
  height = input<number>(200);

  /** Y-axis label */
  yAxisLabel = input<string>('');

  /** Show grid lines */
  showGrid = input<boolean>(true);

  /** Canvas element reference */
  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');

  /** Chart.js instance */
  private chart: Chart | null = null;

  constructor() {
    // Effect to update chart when data changes
    effect(() => {
      const data = this.data();
      const color = this.barColor();
      const showGrid = this.showGrid();
      const yLabel = this.yAxisLabel();

      // Defer chart creation/update to next microtask to ensure canvas is ready
      queueMicrotask(() => {
        this.updateChart(data, color, showGrid, yLabel);
      });
    });
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private updateChart(
    data: BarChartDataPoint[],
    color: string,
    showGrid: boolean,
    yLabel: string,
  ): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    // Destroy existing chart
    this.destroyChart();

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: color,
            borderColor: color,
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
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
              display: showGrid,
              color: 'rgba(0, 0, 0, 0.05)',
            },
            title: {
              display: !!yLabel,
              text: yLabel,
              font: { size: 12 },
            },
            ticks: {
              font: { size: 11 },
              stepSize: 1,
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
}
