import '@angular/localize/init';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { NavIcon, type NavIconName } from '../nav-icon';

/**
 * Child navigation screen type
 */
export type ChildNavScreen = 'tasks' | 'rewards';

/**
 * Child navigation item configuration
 */
export interface ChildNavItem {
  id: ChildNavScreen;
  icon: NavIconName;
  label: string;
}

/**
 * Child Navigation Component
 *
 * Simple bottom navigation for child users with two options:
 * - My Tasks
 * - My Rewards
 *
 * Designed to be playful and easy for children to use.
 */
@Component({
  selector: 'app-child-nav',
  imports: [NavIcon],
  templateUrl: './child-nav.html',
  styleUrl: '../nav.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildNav {
  /**
   * Currently active screen
   */
  activeScreen = input.required<ChildNavScreen>();

  /**
   * Emitted when user navigates to a different screen
   */
  navigate = output<ChildNavScreen>();

  /**
   * Navigation items configuration
   * Norwegian is the source language - translations handled via @angular/localize
   */
  readonly navItems: ChildNavItem[] = [
    { id: 'tasks', icon: 'home', label: $localize`:@@childNav.home:Hjem` },
    { id: 'rewards', icon: 'rewards', label: $localize`:@@nav.rewards:Belønninger` },
  ];

  /**
   * Handle navigation item click
   */
  handleNavClick(screen: ChildNavScreen) {
    this.navigate.emit(screen);
  }

  /**
   * Check if a screen is active
   */
  isActive(screen: ChildNavScreen): boolean {
    return this.activeScreen() === screen;
  }
}
