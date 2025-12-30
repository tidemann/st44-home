import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  effect,
  OnDestroy,
} from '@angular/core';

/**
 * Celebration Animation Component
 *
 * Displays a confetti-like celebration effect when triggered.
 * Respects user's motion preferences and auto-dismisses after animation.
 *
 * Usage:
 * ```html
 * <app-celebration [show]="showCelebration()" (dismissed)="onCelebrationDone()" />
 * ```
 */
@Component({
  selector: 'app-celebration',
  templateUrl: './celebration.html',
  styleUrl: './celebration.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CelebrationComponent implements OnDestroy {
  /** Whether to show the celebration animation */
  show = input<boolean>(false);

  /** Message to display during celebration */
  message = input<string>('Great job!');

  /** Duration in milliseconds before auto-dismiss */
  duration = input<number>(2500);

  /** Emitted when the celebration animation completes */
  dismissed = output<void>();

  /** Internal visibility state */
  protected visible = signal(false);

  /** Internal animation state */
  protected animating = signal(false);

  /** Particles for the confetti effect */
  protected particles = signal<
    { id: number; x: number; y: number; color: string; delay: number }[]
  >([]);

  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Watch for show input changes
    effect(() => {
      if (this.show()) {
        this.startCelebration();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  private startCelebration(): void {
    // Generate confetti particles
    this.generateParticles();

    // Show and animate
    this.visible.set(true);
    this.animating.set(true);

    // Auto-dismiss after duration
    this.timeoutId = setTimeout(() => {
      this.dismiss();
    }, this.duration());
  }

  private generateParticles(): void {
    const colors = [
      'var(--color-primary)',
      'var(--color-secondary)',
      'var(--color-success)',
      '#fbbf24', // amber
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#06b6d4', // cyan
    ];

    const particles = [];
    for (let i = 0; i < 20; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100, // percentage position
        y: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.3, // stagger animation
      });
    }
    this.particles.set(particles);
  }

  protected dismiss(): void {
    this.animating.set(false);

    // Wait for fade-out animation
    setTimeout(() => {
      this.visible.set(false);
      this.particles.set([]);
      this.dismissed.emit();
    }, 300);
  }
}
