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
import { z } from 'zod';
import type { Child } from '@st44/types';
import { HouseholdService } from '../../services/household.service';
import { ChildrenService } from '../../services/children.service';
import { TaskService } from '../../services/task.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { StorageService } from '../../services/storage.service';
import { STORAGE_KEYS } from '../../services/storage-keys';
import { QrCodeDisplayComponent } from '../../components/qr-code-display/qr-code-display';

/** A setup left halfway can be picked up again for a day */
const SETUP_RESUME_MS = 24 * 60 * 60 * 1000;

const SetupInProgressSchema = z.object({ householdId: z.string(), name: z.string() });

/** 1 family name, 2 children, 3 first chores, 4 reminders (4a ask, 4b summary) */
export type SetupStep = 1 | 2 | 3 | 4 | 5;

export interface ChoreChoice {
  name: string;
  points: number;
  chosen: boolean;
  /** Saved as a task; a retry or a return to step 3 does not send it again */
  created?: boolean;
}

/** The text of the input an event came from */
export function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
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
  private readonly storage = inject(StorageService);

  /** Start on a given step (Storybook only; the app always starts on 1) */
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
  readonly createdChores = computed(() => this.chores().filter((c) => c.created));

  // Step 4
  readonly pushState = this.push.state;
  readonly remindersOn = computed(() => this.pushState() === 'on');
  /** Reminders cannot be turned on from here: the parent gets a sentence, not a button */
  readonly pushUnavailable = computed(() =>
    ['unsupported', 'needs-install', 'server-off', 'blocked', 'error'].includes(this.pushState()),
  );

  /** The progress line counts 4a and 4b as step 4 */
  readonly progressStep = computed(() => Math.min(this.step(), 4));
  /** Chores the step 3 button will make now (not the ones already made) */
  readonly chosenCount = computed(() => this.chores().filter((c) => c.chosen && !c.created).length);

  protected readonly inputValue = inputValue;

  ngOnInit(): void {
    this.step.set(this.startStep());
    if (this.startStep() === 1) void this.resume();
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
          // Set first, so a retry renames this household instead of making a second
          this.householdId.set(household.id);
          this.storage.setWithTTL(
            STORAGE_KEYS.SETUP_IN_PROGRESS,
            { householdId: household.id, name },
            SETUP_RESUME_MS,
          );
          this.householdService.setActiveHousehold(household.id);
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

  /** A name typed but not added yet is added before going on */
  async childrenDone(): Promise<void> {
    if (this.busy()) return;
    if (this.childName().trim()) {
      await this.addChild();
      if (this.error()) return;
    }
    this.step.set(3);
  }

  // ===== Step 3: first chores =====

  toggleChore(index: number): void {
    this.chores.update((list) =>
      list.map((chore, i) =>
        i === index && !chore.created ? { ...chore, chosen: !chore.chosen } : chore,
      ),
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
    const todo = this.chores()
      .map((chore, index) => ({ chore, index }))
      .filter(({ chore }) => chore.chosen && !chore.created);

    await this.run(
      async () => {
        for (const { chore, index } of todo) {
          await firstValueFrom(
            this.taskService.createTask(householdId, {
              name: chore.name,
              points: chore.points,
              ruleType: 'daily',
              ruleConfig: childIds.length > 0 ? { assignedChildren: childIds } : null,
            }),
          );
          this.chores.update((list) =>
            list.map((c, i) => (i === index ? { ...c, created: true } : c)),
          );
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
    try {
      await this.push.enable();
    } catch {
      // The summary says reminders are off; Innstillinger can turn them on later
    } finally {
      this.busy.set(false);
      this.step.set(5);
    }
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
    this.storage.remove(STORAGE_KEYS.SETUP_IN_PROGRESS);
    await this.router.navigate(['/home']);
  }

  /** After a reload mid-setup: go on with the household already made, on step 2 */
  private async resume(): Promise<void> {
    const saved = this.storage.get(STORAGE_KEYS.SETUP_IN_PROGRESS, SetupInProgressSchema);
    if (!saved) return;
    // No save on step 1 until we know whether the household is still ours
    this.busy.set(true);
    try {
      this.children.set(await this.childrenService.listChildren(saved.householdId));
      this.householdId.set(saved.householdId);
      this.familyName.set(saved.name);
      this.step.set(2);
    } catch {
      // Deleted, or another parent signed in on this browser: start fresh
      this.storage.remove(STORAGE_KEYS.SETUP_IN_PROGRESS);
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Run one save; on failure show the message and stay on the step.
   * A 401 is sent to the login page by the error interceptor.
   */
  private async run(work: () => Promise<void>, failure: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await work();
    } catch {
      this.error.set(
        navigator.onLine
          ? failure
          : $localize`:@@setupWizard.offline:Du er ikke på nett. Sjekk forbindelsen og prøv igjen.`,
      );
    } finally {
      this.busy.set(false);
    }
  }
}
