import '@angular/localize/init';
import { Component, ChangeDetectionStrategy, input, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
  imports: [],
  templateUrl: './page.html',
  styleUrl: './page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

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
   * Computed CSS class for header style. Poeng has no gradient header, so both
   * classes render the same flat title row; the input stays for existing callers.
   */
  protected headerClass = computed(() => {
    return this.showGradient() ? 'page-header--gradient' : 'page-header--plain';
  });

  /** The child's badge opens a one-item menu (log out); a parent's goes to settings */
  protected readonly isChild = computed(() => this.authService.currentUser()?.role === 'child');
  protected readonly menuOpen = signal(false);

  /** The person's single initial, drawn in the 38 px badge */
  protected readonly initial = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return null;
    const name = user.firstName || user.email?.split('@')[0] || '';
    return name.charAt(0).toUpperCase() || null;
  });

  protected readonly badgeLabel = computed(() =>
    this.isChild()
      ? $localize`:@@page.badge.childMenu:Meny`
      : $localize`:@@page.badge.settings:Innstillinger`,
  );

  protected onBadgeClick(): void {
    if (this.isChild()) {
      this.menuOpen.update((open) => !open);
      return;
    }
    void this.router.navigate(['/settings']);
  }

  protected onLogout(): void {
    this.menuOpen.set(false);
    this.authService.logout();
    void this.router.navigate(['/child-login']);
  }
}
