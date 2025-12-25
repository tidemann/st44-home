import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';

/**
 * Extended member data for display purposes
 * Combines HouseholdMember with user details and stats
 */
export interface MemberCardData {
  id: string;
  name: string;
  email?: string;
  role: 'parent' | 'child';
  tasksCompleted?: number;
  totalTasks?: number;
  points?: number;
}

@Component({
  selector: 'app-member-card',
  imports: [],
  templateUrl: './member-card.html',
  styleUrl: './member-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberCard {
  /**
   * Member data to display
   */
  member = input.required<MemberCardData>();

  /**
   * Whether to show task/points statistics
   */
  showStats = input(true);

  /**
   * Whether the card is clickable
   */
  clickable = input(false);

  /**
   * Emitted when card is clicked (if clickable)
   */
  cardClick = output<string>();

  /**
   * Get initials from member name
   */
  initials = computed(() => {
    const name = this.member().name;
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  });

  /**
   * Get role badge color class
   */
  roleClass = computed(() => {
    const role = this.member().role;
    return role === 'parent' ? 'role-parent' : 'role-child';
  });

  /**
   * Handle card click
   */
  handleClick() {
    if (this.clickable()) {
      this.cardClick.emit(this.member().id);
    }
  }
}
