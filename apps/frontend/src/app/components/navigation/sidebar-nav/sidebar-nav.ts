import '@angular/localize/init';
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
   * Norwegian is the source language - translations handled via @angular/localize
   */
  readonly navItems: NavItem[] = [
    { id: 'home', icon: '🏠', label: $localize`:@@nav.home:Hjem` },
    { id: 'tasks', icon: '✓', label: $localize`:@@nav.tasks:Oppgaver` },
    { id: 'family', icon: '👥', label: $localize`:@@nav.family:Familie` },
    { id: 'progress', icon: '🏆', label: $localize`:@@nav.progress:Fremgang` },
    { id: 'rewards', icon: '🎁', label: $localize`:@@nav.rewards:Belønninger` },
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
