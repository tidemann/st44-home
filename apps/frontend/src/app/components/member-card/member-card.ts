import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { personInitial } from '../../utils/person-name';

/**
 * Extended member data for display purposes
 * Combines HouseholdMember with user details and stats
 */
export interface MemberCardData {
  id: string;
  name: string;
  /** The badge letter, when the shown name is a fallback («Ukjent», «Barn») */
  initial?: string;
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
   * The person's single initial (guide: Initial badge) – the first letter or digit of the
   * name, so a suffix like «(deg)» or a leading symbol never ends up in the badge.
   */
  initials = computed(() => {
    const member = this.member();
    return member.initial ?? personInitial(member.name, member.email);
  });

  /**
   * Screen reader label when the card is clickable
   */
  ariaLabel = computed(
    () => $localize`:@@memberCard.viewDetails:Vis detaljer for ${this.member().name}:name:`,
  );

  /**
   * Handle card click
   */
  handleClick() {
    if (this.clickable()) {
      this.cardClick.emit(this.member().id);
    }
  }
}
