import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { Child } from '@st44/types';
import { HouseholdService } from '../../services/household.service';
import { ChildrenService } from '../../services/children.service';
import { TaskService } from '../../services/task.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { QrCodeDisplayComponent } from '../../components/qr-code-display/qr-code-display';

/** 1 family name, 2 children, 3 first chores, 4 reminders (4a ask, 4b summary) */
export type SetupStep = 1 | 2 | 3 | 4 | 5;

export interface ChoreChoice {
  name: string;
  points: number;
  chosen: boolean;
}

/** Five suggestions, three already ticked (sketch 07) */
export function choreSuggestions(): ChoreChoice[] {
  return [
    { name: $localize`:@@setupWizard.choreBed:Re opp sengen`, points: 5, chosen: true },
    { name: $localize`:@@setupWizard.choreTable:Dekke på bordet`, points: 10, chosen: true },
    { name: $localize`:@@setupWizard.choreRoom:Rydde rommet`, points: 10, chosen: true },
    {
      name: $localize`:@@setupWizard.choreDishwasher:Tømme oppvaskmaskinen`,
      points: 10,
      chosen: false,
    },
    { name: $localize`:@@setupWizard.choreTrash:Ta ut søppelet`, points: 10, chosen: false },
  ];
}

/**
 * First-time setup (sketch 07 v2): a parent sets up the family alone, in four
 * steps with a progress line. Each step asks for one thing and has one large
 * button. Reminders come last, because a browser asks for notification
 * permission only once, so we ask when the parent knows what it is for.
 */
@Component({
  selector: 'app-setup-wizard',
  imports: [QrCodeDisplayComponent],
  templateUrl: './setup-wizard.html',
  styleUrl: './setup-wizard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupWizard implements OnInit {
  private readonly router = inject(Router);
  private readonly householdService = inject(HouseholdService);
  private readonly childrenService = inject(ChildrenService);
  private readonly taskService = inject(TaskService);
  private readonly push = inject(PushNotificationService);

  /** Start on a given step (Storybook) */
  readonly startStep = input<SetupStep>(1);

  readonly step = signal<SetupStep>(1);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  // Step 1
  readonly familyName = signal('');
  readonly householdId = signal<string | null>(null);

  // Step 2
  readonly childName = signal('');
  readonly childAge = signal('');
  readonly children = signal<Child[]>([]);

  // Step 3
  readonly chores = signal<ChoreChoice[]>(choreSuggestions());
  readonly ownChore = signal('');
  readonly createdChores = signal<string[]>([]);

  // Step 4
  readonly pushState = this.push.state;
  readonly remindersOn = computed(() => this.pushState() === 'on');
  /** Reminders cannot be turned on from here: the parent gets a sentence, not a button */
  readonly pushUnavailable = computed(() =>
    ['unsupported', 'needs-install', 'server-off', 'blocked', 'error'].includes(this.pushState()),
  );

  /** The progress line counts 4a and 4b as step 4 */
  readonly progressStep = computed(() => Math.min(this.step(), 4));
  readonly chosenCount = computed(() => this.chores().filter((c) => c.chosen).length);

  ngOnInit(): void {
    this.step.set(this.startStep());
  }

  // ===== Step 1: family name =====

  async saveFamily(): Promise<void> {
    const name = this.familyName().trim();
    if (!name || this.busy()) return;

    await this.run(
      async () => {
        const existing = this.householdId();
        if (existing) {
          await this.householdService.updateHousehold(existing, name);
        } else {
          const household = await this.householdService.createHousehold(name);
          this.householdService.setActiveHousehold(household.id);
          this.householdId.set(household.id);
        }
        this.step.set(2);
      },
      $localize`:@@setupWizard.familyFailed:Vi fikk ikke lagret familien. Prøv igjen.`,
    );
  }

  // ===== Step 2: children =====

  async addChild(): Promise<void> {
    const householdId = this.householdId();
    const name = this.childName().trim();
    if (!householdId || !name || this.busy()) return;

    const age = Number.parseInt(this.childAge(), 10);
    const birthYear =
      Number.isInteger(age) && age >= 0 && age <= 25 ? new Date().getFullYear() - age : undefined;

    await this.run(
      async () => {
        const child = await this.childrenService.createChild(householdId, { name, birthYear });
        this.children.update((list) => [...list, child]);
        this.childName.set('');
        this.childAge.set('');
      },
      $localize`:@@setupWizard.childFailed:Vi fikk ikke lagt til barnet. Prøv igjen.`,
    );
  }

  // ===== Step 3: first chores =====

  toggleChore(index: number): void {
    this.chores.update((list) =>
      list.map((chore, i) => (i === index ? { ...chore, chosen: !chore.chosen } : chore)),
    );
  }

  addOwnChore(): void {
    const name = this.ownChore().trim();
    if (!name) return;
    this.chores.update((list) => [...list, { name, points: 10, chosen: true }]);
    this.ownChore.set('');
  }

  async saveChores(): Promise<void> {
    const householdId = this.householdId();
    if (!householdId || this.busy()) return;

    const childIds = this.children().map((c) => c.id);
    // Chores saved before a failed try are not sent twice
    const todo = this.chores().filter((c) => c.chosen && !this.createdChores().includes(c.name));

    await this.run(
      async () => {
        for (const chore of todo) {
          await firstValueFrom(
            this.taskService.createTask(householdId, {
              name: chore.name,
              points: chore.points,
              ruleType: 'daily',
              ruleConfig: childIds.length > 0 ? { assignedChildren: childIds } : null,
            }),
          );
          this.createdChores.update((list) => [...list, chore.name]);
        }
        void this.push.refresh();
        this.step.set(4);
      },
      $localize`:@@setupWizard.choresFailed:Vi fikk ikke lagret alle oppgavene. Prøv igjen.`,
    );
  }

  // ===== Step 4: reminders, then the summary =====

  async turnOnReminders(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    await this.push.enable();
    this.busy.set(false);
    this.step.set(5);
  }

  skipReminders(): void {
    this.step.set(5);
  }

  back(): void {
    if (this.busy()) return;
    this.error.set(null);
    this.step.update((s) => (s > 1 ? ((s - 1) as SetupStep) : s));
  }

  async finish(): Promise<void> {
    await this.router.navigate(['/home']);
  }

  /** Run one save; on failure show the message and stay on the step */
  private async run(work: () => Promise<void>, failure: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await work();
    } catch {
      this.error.set(failure);
    } finally {
      this.busy.set(false);
    }
  }
}
