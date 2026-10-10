import '@angular/localize/init';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { NavIcon, type NavIconName } from '../nav-icon';

/**
 * Screen identifier type for navigation
 * 'none' is used when no main nav item should be active (e.g., Settings page)
 */
export type NavScreen = 'home' | 'tasks' | 'family' | 'progress' | 'rewards' | 'none';

/**
 * Navigation item configuration
 */
export interface NavItem {
  id: NavScreen;
  icon: NavIconName;
  label: string;
}

@Component({
  selector: 'app-bottom-nav',
  imports: [NavIcon],
  templateUrl: './bottom-nav.html',
  styleUrl: '../nav.css',
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
   * Norwegian is the source language - translations handled via @angular/localize
   */
  readonly navItems: NavItem[] = [
    { id: 'home', icon: 'home', label: $localize`:@@nav.home:Hjem` },
    { id: 'tasks', icon: 'tasks', label: $localize`:@@nav.tasks:Oppgaver` },
    { id: 'rewards', icon: 'rewards', label: $localize`:@@nav.rewards:Belønninger` },
    { id: 'family', icon: 'family', label: $localize`:@@nav.family:Familie` },
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
