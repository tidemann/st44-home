import '@angular/localize/init';
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
import { TopTabs, type TopTab } from '../../components/navigation/top-tabs/top-tabs';

/**
 * Child Layout Component
 *
 * Layout wrapper for child user pages with:
 * - Screens draw their own title row (log out is behind the initial badge)
 * - Bottom navigation (Tasks / Rewards) under 1024 px, the same two as tabs in the yellow top above
 * - Child-friendly interface
 */
@Component({
  selector: 'app-child-layout',
  imports: [RouterOutlet, ChildNav, TopTabs],
  templateUrl: './child-layout.html',
  styleUrl: './child-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildLayout implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private routerSubscription: Subscription | null = null;

  /** The child's own two screens, as tabs from 1024 px */
  protected readonly desktopTabs: TopTab<ChildNavScreen>[] = [
    { id: 'tasks', icon: 'home', label: $localize`:@@childNav.home:Hjem` },
    { id: 'rewards', icon: 'rewards', label: $localize`:@@nav.rewards:Belønninger` },
  ];

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
}
