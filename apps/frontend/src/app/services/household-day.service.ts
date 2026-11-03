import { Injectable, inject } from '@angular/core';
import type { Assignment } from '@st44/types';
import { ApiService } from './api.service';
import { format } from 'date-fns';
import { daysToSunday, isoDay } from '../utils/poeng-format';
import { mondayOf } from '../utils/rotation-weeks';

/** How far back an open chore still shows under "Forfalt" */
export const OVERDUE_DAYS = 7;

/** A parent's view of the household's day: today's chores and the ones left over */
export interface HouseholdDay {
  /** Every chore for today, open and done */
  today: Assignment[];
  /** Open chores from the last week, oldest first */
  overdue: Assignment[];
}

/**
 * Loads one household day for the Poeng home and task screens (ST-777).
 *
 * Talks to the API directly instead of through TaskService, so it does not
 * overwrite the shared assignments signal other screens read.
 */
@Injectable({ providedIn: 'root' })
export class HouseholdDayService {
  private readonly api = inject(ApiService);

  async load(householdId: string): Promise<HouseholdDay> {
    const base = `/households/${householdId}/assignments`;
    const todayKey = isoDay();
    // A weekly chore is on today's list from Monday to its «Frist» day (ST-2143)
    const [today, past] = await Promise.all([
      this.api.get<{ assignments: Assignment[] }>(
        `${base}?date=${todayKey}&days=${daysToSunday(todayKey) + 1}`,
      ),
      this.api.get<{ assignments: Assignment[] }>(
        `${base}?date=${isoDay(-OVERDUE_DAYS)}&days=${OVERDUE_DAYS}&status=pending`,
      ),
    ]);
    const yesterday = isoDay(-1);
    return {
      today: today.assignments.filter(
        (a) => a.date === todayKey || (a.ruleType === 'weekly_rotation' && a.date > todayKey),
      ),
      // A forgotten week is «Forfalt» for one day, the day after its «Frist»
      overdue: past.assignments
        .filter((a) => a.status === 'pending' && a.date < todayKey)
        .filter((a) => a.ruleType !== 'weekly_rotation' || a.date === yesterday)
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /**
   * The child who has a task's chore this week, from the chores the server made. After a
   * changed rotation the server keeps this week's chores, so only they say who has the
   * week (ST-2030, rules 1 and 2). Null when the task has no chore this week.
   */
  async thisWeekChildId(
    householdId: string,
    taskId: string,
    now: Date = new Date(),
  ): Promise<string | null> {
    const monday = format(mondayOf(now), 'yyyy-MM-dd');
    const { assignments } = await this.api.get<{ assignments: Assignment[] }>(
      `/households/${householdId}/assignments?date=${monday}&days=7`,
    );
    return assignments.find((a) => a.taskId === taskId && a.childId)?.childId ?? null;
  }
}
