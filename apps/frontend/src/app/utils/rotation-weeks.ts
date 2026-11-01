import { addWeeks, getISOWeek, startOfISOWeek } from 'date-fns';

/** Monday 00:00 (local time) of the ISO week the date is in */
export function mondayOf(date: Date): Date {
  return startOfISOWeek(date);
}

/** ISO week numbers of `count` weeks in a row, starting with the week of `firstMonday` */
export function weekNumbers(firstMonday: Date, count: number): number[] {
  return Array.from({ length: count }, (_, i) => getISOWeek(addWeeks(firstMonday, i)));
}
