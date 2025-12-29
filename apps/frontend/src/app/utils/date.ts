/**
 * Date utility functions for common date operations.
 * All functions handle both Date objects and ISO date strings.
 */

/**
 * Parses a date input into a Date object.
 * Handles Date objects, ISO strings, and YYYY-MM-DD format strings.
 *
 * @param date - Date object or date string
 * @returns Parsed Date object
 */
export function parseDate(date: Date | string): Date {
  if (date instanceof Date) {
    return date;
  }
  return new Date(date);
}

/**
 * Gets the start of day (midnight) for a given date.
 *
 * @param date - Date object or date string
 * @returns New Date object set to midnight
 */
export function startOfDay(date: Date | string): Date {
  const d = parseDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Checks if two dates are on the same day.
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are on the same calendar day
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Checks if a date is today.
 *
 * @param date - Date to check
 * @returns True if the date is today
 */
export function isToday(date: Date | string): boolean {
  return isSameDay(date, new Date());
}

/**
 * Checks if a date is tomorrow.
 *
 * @param date - Date to check
 * @returns True if the date is tomorrow
 */
export function isTomorrow(date: Date | string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
}

/**
 * Checks if a date is yesterday.
 *
 * @param date - Date to check
 * @returns True if the date is yesterday
 */
export function isYesterday(date: Date | string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

/**
 * Checks if a date is in the past (before today).
 * Only compares dates, not times.
 *
 * @param date - Date to check
 * @returns True if the date is before today
 */
export function isPast(date: Date | string): boolean {
  const d = startOfDay(date);
  const today = startOfDay(new Date());
  return d.getTime() < today.getTime();
}

/**
 * Checks if a date is in the future (after today).
 * Only compares dates, not times.
 *
 * @param date - Date to check
 * @returns True if the date is after today
 */
export function isFuture(date: Date | string): boolean {
  const d = startOfDay(date);
  const today = startOfDay(new Date());
  return d.getTime() > today.getTime();
}

/**
 * Checks if a date is within the current week.
 *
 * @param date - Date to check
 * @returns True if the date is within the current week (Sunday to Saturday)
 */
export function isThisWeek(date: Date | string): boolean {
  const d = parseDate(date);
  const today = new Date();

  // Get start of week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Get end of week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return d >= startOfWeek && d <= endOfWeek;
}

/**
 * Formats a date to a localized date string.
 *
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 * @param locale - Locale string (defaults to user's locale)
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * formatDate('2024-01-15'); // "January 15, 2024"
 * formatDate('2024-01-15', { dateStyle: 'short' }); // "1/15/24"
 * ```
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'long' },
  locale?: string,
): string {
  const d = parseDate(date);
  return d.toLocaleDateString(locale, options);
}

/**
 * Formats a date to a short date string (e.g., "Jan 15").
 *
 * @param date - Date to format
 * @param locale - Locale string (defaults to user's locale)
 * @returns Short formatted date string
 */
export function formatDateShort(date: Date | string, locale?: string): string {
  return formatDate(date, { month: 'short', day: 'numeric' }, locale);
}

/**
 * Formats a date to include the year (e.g., "Jan 15, 2024").
 *
 * @param date - Date to format
 * @param locale - Locale string (defaults to user's locale)
 * @returns Formatted date string with year
 */
export function formatDateWithYear(date: Date | string, locale?: string): string {
  return formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' }, locale);
}

/**
 * Formats a date to a relative string (Today, Tomorrow, Yesterday, or date).
 *
 * @param date - Date to format
 * @param locale - Locale string for date formatting fallback
 * @returns Relative date string
 *
 * @example
 * ```typescript
 * formatRelativeDate(new Date()); // "Today"
 * formatRelativeDate(tomorrow); // "Tomorrow"
 * formatRelativeDate('2024-01-15'); // "Jan 15"
 * ```
 */
export function formatRelativeDate(date: Date | string, locale?: string): string {
  if (isToday(date)) {
    return 'Today';
  }
  if (isTomorrow(date)) {
    return 'Tomorrow';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }

  const d = parseDate(date);
  const today = new Date();

  // Include year if not the current year
  if (d.getFullYear() !== today.getFullYear()) {
    return formatDateWithYear(date, locale);
  }

  return formatDateShort(date, locale);
}

/**
 * Formats a date to ISO date string (YYYY-MM-DD).
 * Useful for API calls and form values.
 *
 * @param date - Date to format
 * @returns ISO date string in YYYY-MM-DD format
 *
 * @example
 * ```typescript
 * toISODateString(new Date(2024, 0, 15)); // "2024-01-15"
 * ```
 */
export function toISODateString(date: Date | string): string {
  const d = parseDate(date);
  return d.toISOString().split('T')[0];
}

/**
 * Gets the number of days between two dates.
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days between the dates (can be negative)
 */
export function daysBetween(date1: Date | string, date2: Date | string): number {
  const d1 = startOfDay(date1);
  const d2 = startOfDay(date2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Gets the number of days from today to the given date.
 * Positive for future dates, negative for past dates.
 *
 * @param date - Target date
 * @returns Number of days from today
 */
export function daysFromToday(date: Date | string): number {
  return daysBetween(new Date(), date);
}

/**
 * Adds days to a date.
 *
 * @param date - Starting date
 * @param days - Number of days to add (can be negative)
 * @returns New Date object with days added
 */
export function addDays(date: Date | string, days: number): Date {
  const d = parseDate(date);
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Gets today's date at midnight.
 *
 * @returns Today's date at 00:00:00
 */
export function getToday(): Date {
  return startOfDay(new Date());
}

/**
 * Gets tomorrow's date at midnight.
 *
 * @returns Tomorrow's date at 00:00:00
 */
export function getTomorrow(): Date {
  return addDays(getToday(), 1);
}

/**
 * Gets yesterday's date at midnight.
 *
 * @returns Yesterday's date at 00:00:00
 */
export function getYesterday(): Date {
  return addDays(getToday(), -1);
}
