import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

/**
 * Page width variants
 * - narrow: 600px - For forms, settings pages
 * - medium: 800px - Default for most pages
 * - wide: 1200px - For dashboards, family page
 */
export type PageWidth = 'narrow' | 'medium' | 'wide';

/**
 * Page Component
 *
 * Provides consistent layout structure for parent/admin pages with:
 * - Configurable header (gradient or plain)
 * - Automatic responsive container widths
 * - Content projection for header actions and main content
 *
 * Note: Bottom nav spacing is handled by MainLayout, not this component.
 *
 * @example Basic usage
 * ```html
 * <app-page title="Tasks" subtitle="Manage your family's tasks">
 *   <div class="task-list">...</div>
 * </app-page>
 * ```
 *
 * @example With header actions
 * ```html
 * <app-page title="Rewards" [showGradient]="true" maxWidth="wide">
 *   <ng-container page-actions>
 *     <button class="btn">Add Reward</button>
 *   </ng-container>
 *   <div class="rewards-grid">...</div>
 * </app-page>
 * ```
 *
 * @example Plain header (no gradient)
 * ```html
 * <app-page title="All Tasks" [showGradient]="false">
 *   ...
 * </app-page>
 * ```
 */
@Component({
  selector: 'app-page',
  templateUrl: './page.html',
  styleUrl: './page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageComponent {
  /**
   * Page title displayed in the header (required)
   */
  title = input.required<string>();

  /**
   * Optional subtitle displayed below the title
   */
  subtitle = input<string>();

  /**
   * Show gradient header background (default: true)
   * When false, shows a plain white header with border
   */
  showGradient = input<boolean>(true);

  /**
   * Maximum content width
   * - 'narrow': 600px (forms, settings)
   * - 'medium': 800px (default, most pages)
   * - 'wide': 1200px (dashboards, family)
   */
  maxWidth = input<PageWidth>('medium');

  /**
   * Show the header section (default: true)
   * Set to false when page needs custom header or no header
   */
  showHeader = input<boolean>(true);

  /**
   * Computed CSS class for container width
   */
  protected containerClass = computed(() => {
    const widthClasses: Record<PageWidth, string> = {
      narrow: 'page-container--narrow',
      medium: 'page-container--medium',
      wide: 'page-container--wide',
    };
    return widthClasses[this.maxWidth()];
  });

  /**
   * Computed CSS class for header style
   */
  protected headerClass = computed(() => {
    return this.showGradient() ? 'page-header--gradient' : 'page-header--plain';
  });
}
