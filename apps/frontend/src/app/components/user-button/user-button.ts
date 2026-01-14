import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';

/**
 * User information for the button display
 */
export interface UserButtonData {
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

/**
 * User Button Component
 *
 * Displays a compact user profile button in the page header with:
 * - User avatar (initials)
 * - User name
 * - Settings icon
 *
 * Designed for header placement on desktop and mobile.
 *
 * @example
 * ```html
 * <app-user-button
 *   [user]="currentUser"
 *   (click)="handleSettingsClick()"
 * />
 * ```
 */
@Component({
  selector: 'app-user-button',
  imports: [],
  templateUrl: './user-button.html',
  styleUrl: './user-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserButton {
  /**
   * User data for display
   */
  user = input.required<UserButtonData>();

  /**
   * Emitted when user clicks the button
   */
  clicked = output<void>();

  /**
   * Compute initials from user name fields
   */
  userInitials = computed(() => {
    const user = this.user();
    const firstName = user.firstName;
    const lastName = user.lastName;

    // Use firstName/lastName if available
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }

    // Fall back to splitting the name (for display name)
    const name = user.name;
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }

    // Fall back to first letter of email if available
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }

    return name.substring(0, 2).toUpperCase();
  });

  /**
   * Handle button click
   */
  handleClick() {
    this.clicked.emit();
  }
}
