import { Injectable, inject } from '@angular/core';
import type { Assignment } from '@st44/types';
import { ApiService } from './api.service';
import { isoDay } from '../utils/poeng-format';

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
    const [today, past] = await Promise.all([
      this.api.get<{ assignments: Assignment[] }>(`${base}?date=${isoDay()}&days=1`),
      this.api.get<{ assignments: Assignment[] }>(
        `${base}?date=${isoDay(-OVERDUE_DAYS)}&days=${OVERDUE_DAYS}&status=pending`,
      ),
    ]);
    const todayKey = isoDay();
    return {
      today: today.assignments.filter((a) => a.date === todayKey),
      overdue: past.assignments
        .filter((a) => a.status === 'pending' && a.date < todayKey)
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
}
