import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import type { NavScreen, NavItem } from '../bottom-nav/bottom-nav';
import { HouseholdSwitcherComponent } from '../../household-switcher/household-switcher';

@Component({
  selector: 'app-sidebar-nav',
  imports: [HouseholdSwitcherComponent],
  templateUrl: './sidebar-nav.html',
  styleUrl: './sidebar-nav.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarNav {
  /**
   * Currently active screen
   */
  activeScreen = input.required<NavScreen>();

  /**
   * Emitted when user navigates to a different screen
   */
  navigate = output<NavScreen>();

  /**
   * Emitted when user clicks "Add Task" button
   */
  addTask = output<void>();

  /**
   * Navigation items configuration
   */
  readonly navItems: NavItem[] = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'tasks', icon: '✓', label: 'Tasks' },
    { id: 'family', icon: '👥', label: 'Family' },
    { id: 'progress', icon: '🏆', label: 'Progress' },
    { id: 'rewards', icon: '🎁', label: 'Rewards' },
  ];

  /**
   * Handle navigation item click
   */
  handleNavClick(screen: NavScreen) {
    this.navigate.emit(screen);
  }

  /**
   * Handle add task button click
   */
  handleAddTask() {
    this.addTask.emit();
  }

  /**
   * Check if a screen is active
   */
  isActive(screen: NavScreen): boolean {
    return this.activeScreen() === screen;
  }
}
