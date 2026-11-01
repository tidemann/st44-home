import { getISOWeek } from 'date-fns';

/**
 * Weekly rotation as the parent sets it in the form (ST-2030): the ticked children in
 * their dragged order, and the Monday of the week the first of them has the chore.
 * Dates are calendar days at UTC midnight, as the assignment generator uses them.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday of the week the date is in (ISO weeks start on Monday) */
export function mondayOf(date: Date): Date {
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const isoWeekday = (date.getUTCDay() + 6) % 7; // Monday=0 ... Sunday=6
  return new Date(midnight - isoWeekday * DAY_MS);
}

export function addWeeks(date: Date, weeks: number): Date {
  return new Date(date.getTime() + weeks * 7 * DAY_MS);
}

/** Whole weeks from the Monday of `from` to the Monday of `to` (negative when `to` is earlier) */
export function weeksBetween(from: Date, to: Date): number {
  return Math.round((mondayOf(to).getTime() - mondayOf(from).getTime()) / (7 * DAY_MS));
}

/** ISO week number of a calendar day (UTC midnight), 1-53 */
export function isoWeekOf(date: Date): number {
  return getISOWeek(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** YYYY-MM-DD of a calendar day at UTC midnight */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Reads a stored YYYY-MM-DD as a calendar day, or null when it is not one */
export function parseIsoDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Alternating: children[0] has the week of `rotationStart`, the next child the week after,
 * and so on round the list. Weeks before the start count backwards round the list.
 */
export function alternatingChild(children: string[], rotationStart: Date, date: Date): string {
  const n = children.length;
  return children[((weeksBetween(rotationStart, date) % n) + n) % n];
}

/**
 * Odd/even: children[0] has the odd ISO weeks, children[1] the even ones. Week 53 is odd, so
 * the first child has week 53 and week 1 of the next year back to back. More than two children
 * (only from before ST-2030; the form offers odd/even with exactly two) cycle by week number.
 */
export function oddEvenChild(children: string[], date: Date): string {
  return children[(isoWeekOf(date) - 1) % children.length];
}
