import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  computed,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { HouseholdListItem } from '../../services/household.service';

/**
 * «Bytt husstand» (ST-1065): the bottom sheet behind the caret in the home title.
 *
 * One row per household with its member count, «Valgt nå» on the chosen one, and
 * «Administrer husstander» under the list. It blocks like a popup: the veil, Escape and a
 * tap on the veil close it; picking a row emits `pick`.
 */
@Component({
  selector: 'app-household-sheet',
  templateUrl: './household-sheet.html',
  styleUrl: './household-sheet.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseholdSheet {
  open = input<boolean>(false);
  households = input<HouseholdListItem[]>([]);
  activeId = input<string | null>(null);
  /** The chosen household's day, «3 av 7 gjort i dag»; the app has it for that one only */
  activeDay = input<string | null>(null);

  pick = output<string>();
  manage = output<void>();
  closed = output<void>();

  private readonly sheet = viewChild<ElementRef<HTMLElement>>('sheet');

  /** «Du er med i to husstander.» */
  protected readonly lead = computed(() => {
    const count = this.households().length;
    return count === 2
      ? $localize`:@@householdSheet.leadTwo:Du er med i to husstander.`
      : $localize`:@@householdSheet.lead:Du er med i ${count}:count: husstander.`;
  });

  constructor() {
    // Focus moves into the sheet when it opens, so Escape and Tab work from the start
    effect(() => {
      if (this.open()) {
        queueMicrotask(() => this.sheet()?.nativeElement.focus());
      }
    });
  }

  /** «5 medlemmer – 3 av 7 gjort i dag» */
  protected detail(household: HouseholdListItem): string {
    const count = household.memberCount ?? 0;
    const members =
      count === 1
        ? $localize`:@@householdSheet.oneMember:1 medlem`
        : $localize`:@@householdSheet.members:${count}:count: medlemmer`;
    const day = household.id === this.activeId() ? this.activeDay() : null;
    return day ? `${members} – ${day}` : members;
  }

  protected choose(household: HouseholdListItem): void {
    if (household.id === this.activeId()) {
      this.closed.emit();
      return;
    }
    this.pick.emit(household.id);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.closed.emit();
    }
  }
}
