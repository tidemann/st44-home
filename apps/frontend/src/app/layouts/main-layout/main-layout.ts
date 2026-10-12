import '@angular/localize/init';
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { BottomNav } from '../../components/navigation/bottom-nav/bottom-nav';
import { TopTabs, type TopTab } from '../../components/navigation/top-tabs/top-tabs';
import { HouseholdSwitcherComponent } from '../../components/household-switcher/household-switcher';
import { UserButton, type UserButtonData } from '../../components/user-button/user-button';
import { AuthService } from '../../services/auth.service';
import { HouseholdStore } from '../../stores/household.store';
import { isDesktopSignal } from '../../utils/desktop-query';
import type { NavScreen } from '../../components/navigation/bottom-nav/bottom-nav';

/**
 * Main Layout Component
 *
 * Wraps authenticated parent/admin pages with:
 * - The yellow top's tab row (1024 px and wider)
 * - Bottom navigation (under 1024 px)
 * - Router outlet for page content
 *
 * This layout handles navigation state and routing,
 * allowing page components to focus on their content.
 */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, BottomNav, TopTabs, HouseholdSwitcherComponent, UserButton],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly householdStore = inject(HouseholdStore);

  private routerSubscription: Subscription | null = null;

  /**
   * The desktop tab row, in the order drawn in the approved desktop A pictures:
   * five tabs, Fremgang included (it has no place on the phone's four-item bar)
   */
  protected readonly desktopTabs: TopTab<NavScreen>[] = [
    { id: 'home', icon: 'home', label: $localize`:@@nav.home:Hjem` },
    { id: 'tasks', icon: 'tasks', label: $localize`:@@nav.tasks:Oppgaver` },
    { id: 'family', icon: 'family', label: $localize`:@@nav.family:Familie` },
    { id: 'progress', icon: 'progress', label: $localize`:@@nav.progress:Fremgang` },
    { id: 'rewards', icon: 'rewards', label: $localize`:@@nav.rewards:Belønninger` },
  ];

  /** 1024 px and wider: the tab row (only created there, so the switcher exists once) */
  protected readonly desktop = isDesktopSignal();

  // State signals
  protected readonly activeScreen = signal<NavScreen>('home');
  /** The screen draws its own Poeng title row, so the logo bar steps aside (route data ownHead) */
  protected readonly ownHead = signal(false);

  // Computed values
  protected readonly userData = computed<UserButtonData>(() => {
    const user = this.authService.currentUser();
    const firstName = user?.firstName || null;
    const lastName = user?.lastName || null;
    // Use first name if available, otherwise fall back to email prefix
    const displayName = firstName || user?.email?.split('@')[0] || 'User';
    return {
      name: displayName,
      firstName,
      lastName,
      email: user?.email || null,
    };
  });

  ngOnInit(): void {
    // Keep a valid active household for every page (the switcher and the pages read it)
    this.householdStore.autoActivateHousehold().catch((err) => {
      console.error('Failed to activate a household:', err);
    });
    this.updateActiveScreenFromUrl(this.router.url);
    this.updateOwnHead();

    // Listen for route changes to update active screen
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateActiveScreenFromUrl(event.urlAfterRedirects);
        this.updateOwnHead();
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  /**
   * Read ownHead from the deepest active route
   */
  private updateOwnHead(): void {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    this.ownHead.set(route.data['ownHead'] === true);
  }

  /**
   * Update active screen based on current URL
   */
  private updateActiveScreenFromUrl(url: string): void {
    if (url.includes('/home') || url === '/') {
      this.activeScreen.set('home');
    } else if (url.includes('/tasks') || url.includes('/all-tasks')) {
      this.activeScreen.set('tasks');
    } else if (url.includes('/family')) {
      this.activeScreen.set('family');
    } else if (url.includes('/progress')) {
      this.activeScreen.set('progress');
    } else if (url.includes('/rewards')) {
      this.activeScreen.set('rewards');
    } else {
      // Settings, household-settings, or other pages - no main nav item active
      this.activeScreen.set('none');
    }
  }

  /**
   * Handle navigation between screens
   */
  protected onNavigate(screen: NavScreen): void {
    // 'none' is not a navigable screen, it just means no nav item is active
    if (screen === 'none') return;

    const routes: Record<Exclude<NavScreen, 'none'>, string> = {
      home: '/home',
      tasks: '/tasks',
      family: '/family',
      progress: '/progress',
      rewards: '/rewards',
    };

    const route = routes[screen];
    if (route) {
      this.router.navigate([route]);
    }
  }

  /**
   * Navigate to settings page
   */
  protected onSettings(): void {
    void this.router.navigate(['/settings']);
  }
}
