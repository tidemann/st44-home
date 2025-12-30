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
import {
  QuickAddModal,
  type QuickAddTaskData,
} from '../../components/modals/quick-add-modal/quick-add-modal';
import { AuthService } from '../../services/auth.service';
import { HouseholdService } from '../../services/household.service';
import { TaskService } from '../../services/task.service';
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
 * - Quick-add task modal
 *
 * This layout handles navigation state and routing,
 * allowing page components to focus on their content.
 */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, BottomNav, SidebarNav, QuickAddModal],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly householdService = inject(HouseholdService);
  private readonly taskService = inject(TaskService);
  private readonly childrenService = inject(ChildrenService);

  private routerSubscription: Subscription | null = null;

  // State signals
  protected readonly activeScreen = signal<NavScreen>('home');
  protected readonly householdId = signal<string | null>(null);
  protected readonly householdName = signal<string>('My Family');
  protected readonly children = signal<Child[]>([]);

  // Modal state
  protected readonly quickAddOpen = signal(false);

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
   * Load household data for sidebar and quick-add modal
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
   * Load children for quick-add modal
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
    }
  }

  /**
   * Handle navigation between screens
   */
  protected onNavigate(screen: NavScreen): void {
    const routes: Record<NavScreen, string> = {
      home: '/home',
      tasks: '/tasks',
      family: '/family',
      progress: '/progress',
    };

    const route = routes[screen];
    if (route) {
      this.router.navigate([route]);
    }
  }

  /**
   * Open quick-add modal
   */
  protected async openQuickAdd(): Promise<void> {
    // Ensure children are loaded before opening modal
    if (this.children().length === 0) {
      await this.loadChildren();
    }
    this.quickAddOpen.set(true);
  }

  /**
   * Close quick-add modal
   */
  protected closeQuickAdd(): void {
    this.quickAddOpen.set(false);
  }

  /**
   * Handle quick-add task creation
   */
  protected onTaskCreated(data: QuickAddTaskData): void {
    const household = this.householdId();
    if (!household) return;

    this.taskService
      .createTask(household, {
        name: data.name,
        points: data.points,
        ruleType: 'daily',
      })
      .subscribe({
        next: () => {
          this.quickAddOpen.set(false);
        },
        error: (err) => {
          console.error('Failed to create task:', err);
        },
      });
  }

  /**
   * Navigate to settings page
   */
  protected onSettings(): void {
    void this.router.navigate(['/settings']);
  }
}
