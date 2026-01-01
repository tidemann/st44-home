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
import { SidebarNav } from '../../components/navigation/sidebar-nav/sidebar-nav';
import { HouseholdSwitcherComponent } from '../../components/household-switcher/household-switcher';
import { CreateTaskModal } from '../../components/modals/create-task-modal/create-task-modal';
import { AuthService } from '../../services/auth.service';
import { HouseholdService } from '../../services/household.service';
import { ChildrenService } from '../../services/children.service';
import type { SidebarUser } from '../../components/navigation/sidebar-nav/sidebar-nav';
import type { NavScreen } from '../../components/navigation/bottom-nav/bottom-nav';
import type { Child } from '@st44/types';

/**
 * Main Layout Component
 *
 * Wraps authenticated parent/admin pages with:
 * - Sidebar navigation (desktop)
 * - Bottom navigation (mobile)
 * - Router outlet for page content
 * - Create task modal (full-featured)
 *
 * This layout handles navigation state and routing,
 * allowing page components to focus on their content.
 */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, BottomNav, SidebarNav, HouseholdSwitcherComponent, CreateTaskModal],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly householdService = inject(HouseholdService);
  private readonly childrenService = inject(ChildrenService);

  private routerSubscription: Subscription | null = null;

  // State signals
  protected readonly activeScreen = signal<NavScreen>('home');
  protected readonly householdId = signal<string | null>(null);
  protected readonly householdName = signal<string>('My Family');
  protected readonly children = signal<Child[]>([]);

  // Modal state
  protected readonly createTaskOpen = signal(false);

  // Computed values
  protected readonly sidebarUser = computed<SidebarUser>(() => {
    const user = this.authService.currentUser();
    return {
      name: user?.email?.split('@')[0] || 'User',
      avatar: '',
      household: this.householdName(),
    };
  });

  ngOnInit(): void {
    this.loadHouseholdData();
    this.updateActiveScreenFromUrl(this.router.url);

    // Listen for route changes to update active screen
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
   * Load household data for sidebar and create task modal
   */
  private async loadHouseholdData(): Promise<void> {
    try {
      const households = await this.householdService.listHouseholds();
      if (households.length > 0) {
        const household = households[0];
        this.householdId.set(household.id);
        this.householdName.set(household.name);

        // Pre-load children for quick-add modal
        await this.loadChildren();
      }
    } catch (err) {
      console.error('Failed to load household data:', err);
    }
  }

  /**
   * Load children for create task modal
   */
  private async loadChildren(): Promise<void> {
    const household = this.householdId();
    if (!household) return;

    try {
      const childrenData = await this.childrenService.listChildren(household);
      this.children.set(childrenData);
    } catch (err) {
      console.error('Failed to load children:', err);
    }
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
   * Open create task modal
   */
  protected async openCreateTask(): Promise<void> {
    // Ensure children are loaded before opening modal
    if (this.children().length === 0) {
      await this.loadChildren();
    }
    this.createTaskOpen.set(true);
  }

  /**
   * Close create task modal
   */
  protected closeCreateTask(): void {
    this.createTaskOpen.set(false);
  }

  /**
   * Handle task creation success
   */
  protected onTaskCreated(): void {
    this.createTaskOpen.set(false);
  }

  /**
   * Navigate to settings page
   */
  protected onSettings(): void {
    void this.router.navigate(['/settings']);
  }
}
