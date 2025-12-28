import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import type { NavScreen, NavItem } from '../bottom-nav/bottom-nav';
import { HouseholdSwitcherComponent } from '../../household-switcher/household-switcher';

/**
 * User information for sidebar display
 */
export interface SidebarUser {
  name: string;
  avatar: string;
  household: string;
}

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
   * User information for profile section
   */
  user = input.required<SidebarUser>();

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
  ];

  /**
   * Compute initials from user name
   */
  userInitials = computed(() => {
    const name = this.user().name;
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  });

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
