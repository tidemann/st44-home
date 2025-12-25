import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

/**
 * Screen identifier type for navigation
 */
export type NavScreen = 'home' | 'tasks' | 'family' | 'progress';

/**
 * Navigation item configuration
 */
export interface NavItem {
  id: NavScreen;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-bottom-nav',
  imports: [],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNav {
  /**
   * Currently active screen
   */
  activeScreen = input.required<NavScreen>();

  /**
   * Emitted when user navigates to a different screen
   */
  navigate = output<NavScreen>();

  /**
   * Navigation items configuration
   */
  readonly navItems: NavItem[] = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'tasks', icon: '✓', label: 'Tasks' },
    { id: 'family', icon: '👥', label: 'Family' },
    { id: 'progress', icon: '🏆', label: 'Progress' },
  ];

  /**
   * Handle navigation item click
   */
  handleNavClick(screen: NavScreen) {
    this.navigate.emit(screen);
  }

  /**
   * Check if a screen is active
   */
  isActive(screen: NavScreen): boolean {
    return this.activeScreen() === screen;
  }
}
