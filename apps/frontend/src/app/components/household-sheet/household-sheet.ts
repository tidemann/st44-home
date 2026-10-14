import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  HostListener,
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

  /** Where focus was when the sheet opened (the title button); it goes back there on close */
  private returnFocus: HTMLElement | null = null;

  constructor() {
    // Focus moves into the sheet when it opens, and back to where it came from when it closes
    effect(() => {
      if (this.open()) {
        this.returnFocus = document.activeElement as HTMLElement | null;
        queueMicrotask(() => this.sheet()?.nativeElement.focus());
      } else if (this.returnFocus) {
        const target = this.returnFocus;
        this.returnFocus = null;
        queueMicrotask(() => target.isConnected && target.focus());
      }
    });
  }

  /** Escape closes the sheet wherever focus is, as the blocking popups do */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.closed.emit();
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

  /** Tab stays inside the sheet while it is open: past the last button it wraps to the first */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const buttons = Array.from(
      this.sheet()?.nativeElement.querySelectorAll<HTMLElement>('button') ?? [],
    );
    if (buttons.length === 0) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === this.sheet()?.nativeElement)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
