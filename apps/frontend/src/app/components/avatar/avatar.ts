import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-avatar',
  imports: [CommonModule],
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
  /** First name of the user */
  firstName = input<string | null>(null);

  /** Last name of the user */
  lastName = input<string | null>(null);

  /** Full name (alternative to firstName/lastName) */
  name = input<string | null>(null);

  /** Email (fallback if no name provided) */
  email = input<string | null>(null);

  /** URL to avatar image (if available) */
  imageUrl = input<string | null>(null);

  /** Size of the avatar */
  size = input<AvatarSize>('md');

  /** Computed initials from name fields */
  protected initials = computed(() => {
    const first = this.firstName();
    const last = this.lastName();

    // Use firstName/lastName if available
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }

    // Fall back to full name
    const fullName = this.name();
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      }
      return parts[0].charAt(0).toUpperCase();
    }

    // Fall back to email
    const emailVal = this.email();
    if (emailVal) {
      return emailVal.charAt(0).toUpperCase();
    }

    return '?';
  });

  /** CSS class for avatar size */
  protected sizeClass = computed(() => `avatar-${this.size()}`);

  /**
   * Background color for the initials badge.
   * Poeng: the initial badge is a quiet neutral (--track with --text),
   * never a colour per person and never the yellow.
   */
  protected backgroundColor = computed(() => 'var(--track)');
}
