/**
 * Small formatters for the Poeng screens, in the Norwegian the pictures use:
 * "tirsdag 6. oktober", "16.48", "i går".
 */

const LONG_DATE = new Intl.DateTimeFormat('nb-NO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const WEEKDAY = new Intl.DateTimeFormat('nb-NO', { weekday: 'long' });

/** "tirsdag 6. oktober" */
export function longDate(date: Date = new Date()): string {
  return LONG_DATE.format(date);
}

/** "16.48" — Norwegian clock time with a dot, as drawn */
export function clockTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}.${mm}`;
}

/**
 * The assignment day as YYYY-MM-DD, `offset` days from today. Uses the same
 * UTC day the API defaults to, so "today" here and on the server agree.
 */
export function isoDay(offset = 0, now: Date = new Date()): string {
  const day = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
  return day.toISOString().split('T')[0];
}

/**
 * "i dag", "i går", or the weekday ("lørdag") for an older YYYY-MM-DD.
 *
 * Also takes a full ISO timestamp (a DATE column sent without `::text` arrives as
 * "2026-10-10T00:00:00.000Z") and never throws: it runs inside template bindings,
 * and a throw there stops change detection, which left every chore row with only
 * its projected «Hak av» (ST-808).
 */
export function dayWord(day: string, today: string = isoDay()): string {
  const key = String(day ?? '').slice(0, 10);
  if (key === today) return $localize`:@@poeng.today:i dag`;
  if (key === isoDay(-1, new Date(`${today}T12:00:00Z`))) {
    return $localize`:@@poeng.yesterday:i går`;
  }
  const date = new Date(`${key}T12:00:00Z`);
  return isNaN(date.getTime()) ? '' : WEEKDAY.format(date);
}

/** Upper-case the first letter: "i går" → "I går" */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
