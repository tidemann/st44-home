import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { InitialBadge } from '../initial-badge/initial-badge';

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
  imports: [InitialBadge],
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
   * Show user button in header (default: true on desktop)
   * Set to false to hide the user button
   */
  showUserButton = input<boolean>(true);

  /**
   * A, the yellow top (guide: "A — the yellow top"): the title row, the sub-line and
   * whatever is projected with the `page-band` attribute sit on a full-bleed yellow band
   * that ends 17 px under its last item. Everything else stays on the paper below.
   */
  band = input<boolean>(false);

  /**
   * Desktop A (guide: "Desktop and tablet — layout A"): from 1024 px the band's title and
   * sub-line sit on the left of an 880 px container and the `page-band` content on the right,
   * on one line; the content below gets the same 880 px. Under 1024 px nothing changes.
   */
  split = input<boolean>(false);

  /**
   * Rule 4 (guide: "Desktop: rules for all pages"): from 1024 px the content is one 428 px
   * column at the 880 px page's left edge, for a form or a short list. Under 1024 px nothing
   * changes.
   */
  column = input<boolean>(false);

  /**
   * Rule 2 for a page that has no band on the phone: from 1024 px the title row becomes the
   * yellow band with the title and `deskSubtitle` in it. Under 1024 px nothing changes.
   */
  deskBand = input<boolean>(false);
  deskSubtitle = input<string>();

  /**
   * The household name as the title (ST-1065): with 2 or more households the title is a
   * button with a caret right after the name, and a tap emits `titleMenuOpen`.
   */
  titleMenu = input<boolean>(false);
  titleMenuOpen = output<void>();

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

  /** The title up to its last word, and the last word, which wraps together with the caret (ST-1103) */
  protected titleHead = computed(() => {
    const title = this.title();
    const cut = title.lastIndexOf(' ');
    return cut < 0 ? '' : title.slice(0, cut + 1);
  });
  protected titleLast = computed(() => {
    const title = this.title();
    return title.slice(title.lastIndexOf(' ') + 1);
  });

  /**
   * Computed CSS class for header style. Poeng has no gradient header, so both
   * classes render the same flat title row; the input stays for existing callers.
   */
  protected headerClass = computed(() => {
    return this.showGradient() ? 'page-header--gradient' : 'page-header--plain';
  });
}
