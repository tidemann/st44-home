import { addWeeks, getISOWeek, startOfISOWeek } from 'date-fns';

/** Monday 00:00 (local time) of the ISO week the date is in */
export function mondayOf(date: Date): Date {
  return startOfISOWeek(date);
}

/** ISO week numbers of `count` weeks in a row, starting with the week of `firstMonday` */
export function weekNumbers(firstMonday: Date, count: number): number[] {
  return Array.from({ length: count }, (_, i) => getISOWeek(addWeeks(firstMonday, i)));
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Edit, weekly rotation (ST-2030): the saved order turned so row 1 is next week's child,
 * since a changed order starts next week, and the child who has this week. This reads the
 * rotation the way the server's generator does. A rotation with no start week (from
 * before ST-2030) keeps its order, and this week's child is not known.
 */
export function rotationFromNextWeek(
  order: string[],
  rotationType: 'alternating' | 'odd_even_week',
  rotationStart: string | undefined,
  today: Date,
): { order: string[]; thisWeekChildId: string | null } {
  const n = order.length;
  if (n === 0) return { order, thisWeekChildId: null };
  const thisMonday = mondayOf(today);

  if (rotationType === 'odd_even_week') {
    return { order, thisWeekChildId: order[(getISOWeek(thisMonday) - 1) % n] };
  }

  const match = rotationStart ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(rotationStart) : null;
  if (!match) return { order, thisWeekChildId: null };
  const start = mondayOf(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  // Round: a week across a daylight saving change is an hour short or long
  const weeks = Math.round((thisMonday.getTime() - start.getTime()) / WEEK_MS);
  const mod = (k: number) => ((k % n) + n) % n;
  const next = mod(weeks + 1);
  return {
    order: [...order.slice(next), ...order.slice(0, next)],
    thisWeekChildId: order[mod(weeks)],
  };
}
