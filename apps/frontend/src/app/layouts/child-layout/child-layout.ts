import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ChildNav, type ChildNavScreen } from '../../components/navigation/child-nav/child-nav';
import { AuthService } from '../../services/auth.service';

/**
 * Child Layout Component
 *
 * Layout wrapper for child user pages with:
 * - Header with greeting and logout
 * - Bottom navigation (Tasks / Rewards)
 * - Child-friendly interface
 */
@Component({
  selector: 'app-child-layout',
  imports: [RouterOutlet, ChildNav],
  templateUrl: './child-layout.html',
  styleUrl: './child-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildLayout implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private routerSubscription: Subscription | null = null;

  // State
  protected readonly activeScreen = signal<ChildNavScreen>('tasks');

  ngOnInit(): void {
    this.updateActiveScreenFromUrl(this.router.url);

    // Listen for route changes
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateActiveScreenFromUrl(event.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  /**
   * Update active screen based on URL
   */
  private updateActiveScreenFromUrl(url: string): void {
    if (url.includes('/my-rewards')) {
      this.activeScreen.set('rewards');
    } else {
      this.activeScreen.set('tasks');
    }
  }

  /**
   * Handle navigation
   */
  protected onNavigate(screen: ChildNavScreen): void {
    const routes: Record<ChildNavScreen, string> = {
      tasks: '/my-tasks',
      rewards: '/my-rewards',
    };

    const route = routes[screen];
    if (route) {
      void this.router.navigate([route]);
    }
  }

  /**
   * Handle logout
   */
  protected onLogout(): void {
    this.authService.logout();
    void this.router.navigate(['/child-login']);
  }
}
