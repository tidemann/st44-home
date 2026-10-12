import '@angular/localize/init';
import { Component, ChangeDetectionStrategy, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { personInitial } from '../../utils/person-name';

/**
 * The person's initial in a 38 px circle (guide: Initial badge), 44 px pressed.
 * A parent's goes to settings; a child's opens a one-item menu (log out).
 * `onYellow` gives it the Yellow Inset fill it takes in the yellow top.
 */
@Component({
  selector: 'app-initial-badge',
  template: `@if (initial(); as letter) {
    <div class="badge-wrap">
      <button
        type="button"
        class="initial-badge"
        [class.on-yellow]="onYellow()"
        (click)="onBadgeClick()"
        [attr.aria-label]="badgeLabel()"
        [attr.aria-expanded]="isChild() ? menuOpen() : null"
      >
        {{ letter }}
      </button>
      @if (menuOpen()) {
        <div class="badge-menu">
          <button type="button" class="badge-menu-item" (click)="onLogout()">
            <ng-container i18n="@@page.logout">Logg ut</ng-container>
          </button>
        </div>
      }
    </div>
  }`,
  styleUrl: './initial-badge.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InitialBadge {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  /** On the yellow band: Yellow Inset fill, ink initial */
  onYellow = input<boolean>(false);

  protected readonly isChild = computed(() => this.authService.currentUser()?.role === 'child');
  protected readonly menuOpen = signal(false);

  /** The person's single initial */
  protected readonly initial = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return null;
    return personInitial(user.firstName, user.email) || null;
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
