import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

/**
 * Streak Counter Component
 *
 * Displays a child's current streak and longest streak with visual feedback.
 * Shows a fire emoji and encouraging messages based on streak length.
 *
 * @example
 * ```html
 * <app-streak-counter [currentStreak]="5" [longestStreak]="10" />
 * ```
 */
@Component({
  selector: 'app-streak-counter',
  imports: [],
  templateUrl: './streak-counter.html',
  styleUrl: './streak-counter.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreakCounter {
  /** Current consecutive days with 100% task completion */
  currentStreak = input.required<number>();

  /** Longest streak ever achieved */
  longestStreak = input.required<number>();

  /** Whether to show the longest streak badge */
  showLongest = input<boolean>(true);

  /** Get an encouraging message based on streak length */
  streakMessage = computed(() => {
    const streak = this.currentStreak();
    if (streak === 0) return 'Start your streak today!';
    if (streak === 1) return 'Great start! Keep it going!';
    if (streak < 3) return "You're on a roll!";
    if (streak < 7) return 'Amazing consistency!';
    if (streak < 14) return "You're unstoppable!";
    if (streak < 30) return 'Incredible dedication!';
    return 'Legendary streak!';
  });

  /** Get the number of fire emojis to show (max 5) */
  fireCount = computed(() => {
    const streak = this.currentStreak();
    if (streak === 0) return 0;
    if (streak < 3) return 1;
    if (streak < 7) return 2;
    if (streak < 14) return 3;
    if (streak < 30) return 4;
    return 5;
  });

  /** Check if current streak equals or beats longest streak */
  isNewRecord = computed(() => {
    return this.currentStreak() > 0 && this.currentStreak() >= this.longestStreak();
  });
}
