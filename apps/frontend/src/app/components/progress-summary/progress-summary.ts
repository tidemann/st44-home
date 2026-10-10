import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

/**
 * Progress data for a time period
 */
export interface ProgressData {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  pointsEarned: number;
}

/**
 * Progress Summary Component
 *
 * Displays week or month progress with a visual progress bar
 * and task/points statistics.
 *
 * @example
 * ```html
 * <app-progress-summary
 *   title="This Week"
 *   [progress]="weekProgress"
 * />
 * ```
 */
@Component({
  selector: 'app-progress-summary',
  imports: [],
  templateUrl: './progress-summary.html',
  styleUrl: './progress-summary.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressSummary {
  /** Title for the progress section (e.g., "This Week", "This Month") */
  title = input.required<string>();

  /** Progress data to display */
  progress = input.required<ProgressData>();

  /** Optional icon/emoji to display */
  icon = input<string>('');

  /** Rounded completion percentage */
  progressPercent = computed(() => Math.round(this.progress().completionRate));

  /** Get progress bar color class based on completion rate */
  progressClass = computed(() => {
    const rate = this.progress().completionRate;
    if (rate >= 80) return 'progress-excellent';
    if (rate >= 60) return 'progress-good';
    if (rate >= 40) return 'progress-fair';
    return 'progress-low';
  });

  /** Get encouraging message based on completion rate */
  progressMessage = computed(() => {
    const rate = this.progress().completionRate;
    if (rate === 100) return $localize`:@@progressSummary.msgPerfect:Perfekt!`;
    if (rate >= 80) return $localize`:@@progressSummary.msgExcellent:Kjempebra!`;
    if (rate >= 60) return $localize`:@@progressSummary.msgGood:God fremgang!`;
    if (rate >= 40) return $localize`:@@progressSummary.msgKeepGoing:Fortsett sånn!`;
    if (rate > 0) return $localize`:@@progressSummary.msgStarted:Godt i gang!`;
    return $localize`:@@progressSummary.msgReady:Klar til å starte?`;
  });
}
