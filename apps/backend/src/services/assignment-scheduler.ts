import { db } from '../database.js';
import { generateAssignments, type AssignmentGenerationResult } from './assignment-generator.js';

/** Households live in Norway: "today" and "Monday" follow Oslo time, not the server's */
export const ASSIGNMENT_TIME_ZONE = 'Europe/Oslo';

/** Generate today plus the next 6 days, so the whole week is there on Monday morning */
export const DAYS_AHEAD = 7;

/** How often the scheduler checks whether a new Oslo day has started */
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export interface DailyGenerationSummary {
  date: string;
  households: number;
  created: number;
  skipped: number;
  failedHouseholds: string[];
  errors: string[];
}

interface SchedulerLogger {
  info(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
}

interface RunOptions {
  now?: Date;
  days?: number;
  listHouseholds?: () => Promise<string[]>;
  generate?: (
    householdId: string,
    startDate: Date,
    days: number,
  ) => Promise<AssignmentGenerationResult>;
}

/**
 * Returns the calendar date in the given time zone as a Date at UTC midnight,
 * which is the form generateAssignments expects.
 */
export function todayInTimeZone(now: Date, timeZone: string = ASSIGNMENT_TIME_ZONE): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
}

/**
 * Households that have at least one active recurring task
 */
async function listHouseholdsWithRecurringTasks(): Promise<string[]> {
  const result = await db.query<{ household_id: string }>(
    `SELECT DISTINCT household_id
     FROM tasks
     WHERE active = true AND rule_type IN ('daily', 'repeating', 'weekly_rotation')`,
  );
  return result.rows.map((row) => row.household_id);
}

/**
 * Generates assignments from today (Oslo) for every household. Safe to rerun:
 * the generator skips task/date pairs that already exist.
 */
export async function runDailyAssignmentGeneration(
  options: RunOptions = {},
): Promise<DailyGenerationSummary> {
  const {
    now = new Date(),
    days = DAYS_AHEAD,
    listHouseholds = listHouseholdsWithRecurringTasks,
    generate = generateAssignments,
  } = options;

  const today = todayInTimeZone(now);
  const summary: DailyGenerationSummary = {
    date: today.toISOString().slice(0, 10),
    households: 0,
    created: 0,
    skipped: 0,
    failedHouseholds: [],
    errors: [],
  };

  const householdIds = await listHouseholds();
  summary.households = householdIds.length;

  // One household at a time: each runs in its own transaction, and one failing
  // household must not stop the others
  for (const householdId of householdIds) {
    try {
      const result = await generate(householdId, today, days);
      summary.created += result.created;
      summary.skipped += result.skipped;
      for (const error of result.errors) {
        summary.errors.push(`${householdId}: ${error}`);
      }
      if (result.errors.some((error) => error.startsWith('Transaction failed'))) {
        summary.failedHouseholds.push(householdId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      summary.errors.push(`${householdId}: ${message}`);
      summary.failedHouseholds.push(householdId);
    }
  }

  return summary;
}

/**
 * Runs the daily generation at startup and then once per Oslo day (checked every
 * 15 minutes, so a new day is picked up shortly after midnight). If a run fails
 * it is retried at the next check.
 */
export function startAssignmentScheduler(
  logger: SchedulerLogger,
  options: {
    intervalMs?: number;
    now?: () => Date;
    run?: (now: Date) => Promise<DailyGenerationSummary>;
  } = {},
): { stop: () => void; tick: () => Promise<void>; firstRun: Promise<void> } {
  const {
    intervalMs = CHECK_INTERVAL_MS,
    now = () => new Date(),
    run = (date) => runDailyAssignmentGeneration({ now: date }),
  } = options;

  let lastCompletedDate: string | null = null;
  let running = false;

  const tick = async () => {
    if (running) return;
    const current = now();
    const today = todayInTimeZone(current).toISOString().slice(0, 10);
    if (today === lastCompletedDate) return;

    running = true;
    try {
      const summary = await run(current);
      if (summary.failedHouseholds.length === 0) {
        lastCompletedDate = today;
      }
      const log = summary.errors.length > 0 ? logger.error : logger.info;
      log.call(logger, { assignmentGeneration: summary }, 'Daily assignment generation finished');
    } catch (err) {
      logger.error({ err }, 'Daily assignment generation failed');
    } finally {
      running = false;
    }
  };

  const firstRun = tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();

  return { stop: () => clearInterval(timer), tick, firstRun };
}
