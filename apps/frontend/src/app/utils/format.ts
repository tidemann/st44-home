/**
 * Format utility functions for common formatting operations.
 * Provides consistent formatting across the application.
 */

/**
 * Formats a number as points with appropriate suffix.
 * Handles large numbers with K/M suffixes.
 *
 * @param points - Number of points
 * @param options - Formatting options
 * @returns Formatted points string
 *
 * @example
 * ```typescript
 * formatPoints(100);        // "100 pts"
 * formatPoints(1);          // "1 pt"
 * formatPoints(1500);       // "1.5K pts"
 * formatPoints(1000000);    // "1M pts"
 * formatPoints(100, { showSuffix: false }); // "100"
 * ```
 */
export function formatPoints(
  points: number,
  options: {
    /** Whether to show the pts/pt suffix */
    showSuffix?: boolean;
    /** Whether to abbreviate large numbers */
    abbreviate?: boolean;
    /** Number of decimal places for abbreviated numbers */
    decimals?: number;
  } = {},
): string {
  const { showSuffix = true, abbreviate = true, decimals = 1 } = options;

  let formattedNumber: string;

  if (abbreviate) {
    if (points >= 1_000_000) {
      formattedNumber = formatDecimal(points / 1_000_000, decimals) + 'M';
    } else if (points >= 1_000) {
      formattedNumber = formatDecimal(points / 1_000, decimals) + 'K';
    } else {
      formattedNumber = String(points);
    }
  } else {
    formattedNumber = points.toLocaleString();
  }

  if (showSuffix) {
    const suffix = points === 1 ? 'pt' : 'pts';
    return `${formattedNumber} ${suffix}`;
  }

  return formattedNumber;
}

/**
 * Formats a number as a percentage.
 *
 * @param value - The value to format (0-1 for decimals, or raw percentage)
 * @param options - Formatting options
 * @returns Formatted percentage string
 *
 * @example
 * ```typescript
 * formatPercentage(0.75);                    // "75%"
 * formatPercentage(0.756);                   // "76%"
 * formatPercentage(0.756, { decimals: 1 }); // "75.6%"
 * formatPercentage(75, { isRaw: true });    // "75%"
 * ```
 */
export function formatPercentage(
  value: number,
  options: {
    /** Number of decimal places */
    decimals?: number;
    /** Whether the value is already a percentage (not 0-1) */
    isRaw?: boolean;
  } = {},
): string {
  const { decimals = 0, isRaw = false } = options;

  const percentage = isRaw ? value : value * 100;
  const formatted = decimals === 0 ? Math.round(percentage) : formatDecimal(percentage, decimals);

  return `${formatted}%`;
}

/**
 * Truncates text to a specified length with an ellipsis.
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length (including ellipsis)
 * @param options - Truncation options
 * @returns Truncated text
 *
 * @example
 * ```typescript
 * truncateText('Hello World', 8);                    // "Hello..."
 * truncateText('Hello World', 8, { ellipsis: '>' }); // "Hello W>"
 * truncateText('Short', 10);                         // "Short"
 * truncateText('Word break test', 10, { wordBreak: true }); // "Word..."
 * ```
 */
export function truncateText(
  text: string,
  maxLength: number,
  options: {
    /** Custom ellipsis character(s) */
    ellipsis?: string;
    /** Whether to break at word boundaries */
    wordBreak?: boolean;
  } = {},
): string {
  const { ellipsis = '...', wordBreak = false } = options;

  if (text.length <= maxLength) {
    return text;
  }

  const maxTextLength = maxLength - ellipsis.length;

  if (maxTextLength <= 0) {
    return ellipsis.substring(0, maxLength);
  }

  let truncated = text.substring(0, maxTextLength);

  if (wordBreak) {
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      truncated = truncated.substring(0, lastSpace);
    }
  }

  return truncated.trimEnd() + ellipsis;
}

/**
 * Formats a number with a specified number of decimal places.
 * Removes trailing zeros.
 *
 * @param value - Number to format
 * @param decimals - Number of decimal places
 * @returns Formatted number string
 */
function formatDecimal(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  // Remove trailing zeros and unnecessary decimal point
  return parseFloat(fixed).toString();
}

/**
 * Formats a number with thousands separators.
 *
 * @param value - Number to format
 * @param locale - Locale for formatting (defaults to user's locale)
 * @returns Formatted number string
 *
 * @example
 * ```typescript
 * formatNumber(1234567);           // "1,234,567"
 * formatNumber(1234567, 'de-DE');  // "1.234.567"
 * ```
 */
export function formatNumber(value: number, locale?: string): string {
  return value.toLocaleString(locale);
}

/**
 * Formats bytes to a human-readable string.
 *
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places
 * @returns Formatted string (e.g., "1.5 KB", "2.3 MB")
 *
 * @example
 * ```typescript
 * formatBytes(1024);      // "1 KB"
 * formatBytes(1536);      // "1.5 KB"
 * formatBytes(1048576);   // "1 MB"
 * ```
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const value = bytes / Math.pow(k, i);
  const formatted = i === 0 ? value.toString() : formatDecimal(value, decimals);

  return `${formatted} ${sizes[i]}`;
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param text - Text to capitalize
 * @returns Text with first letter capitalized
 *
 * @example
 * ```typescript
 * capitalize('hello');  // "Hello"
 * capitalize('HELLO');  // "HELLO"
 * capitalize('');       // ""
 * ```
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Converts a string to title case.
 *
 * @param text - Text to convert
 * @returns Text in title case
 *
 * @example
 * ```typescript
 * toTitleCase('hello world');  // "Hello World"
 * toTitleCase('HELLO WORLD');  // "Hello World"
 * ```
 */
export function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 *
 * @param ms - Duration in milliseconds
 * @param options - Formatting options
 * @returns Formatted duration string
 *
 * @example
 * ```typescript
 * formatDuration(5000);        // "5s"
 * formatDuration(65000);       // "1m 5s"
 * formatDuration(3665000);     // "1h 1m"
 * formatDuration(3665000, { includeSeconds: true }); // "1h 1m 5s"
 * ```
 */
export function formatDuration(
  ms: number,
  options: {
    /** Whether to include seconds when hours are present */
    includeSeconds?: boolean;
  } = {},
): string {
  const { includeSeconds = false } = options;

  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (seconds > 0 && (hours === 0 || includeSeconds)) {
    parts.push(`${seconds}s`);
  }

  return parts.join(' ') || '0s';
}

/**
 * Pluralizes a word based on count.
 *
 * @param count - The count
 * @param singular - Singular form of the word
 * @param plural - Plural form of the word (defaults to singular + 's')
 * @returns The appropriate form
 *
 * @example
 * ```typescript
 * pluralize(1, 'task');           // "task"
 * pluralize(5, 'task');           // "tasks"
 * pluralize(1, 'child', 'children'); // "child"
 * pluralize(5, 'child', 'children'); // "children"
 * ```
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? singular + 's');
}

/**
 * Formats a count with its label, properly pluralized.
 *
 * @param count - The count
 * @param singular - Singular form of the label
 * @param plural - Plural form of the label (defaults to singular + 's')
 * @returns Formatted string with count and label
 *
 * @example
 * ```typescript
 * formatCount(1, 'task');           // "1 task"
 * formatCount(5, 'task');           // "5 tasks"
 * formatCount(0, 'item');           // "0 items"
 * formatCount(1, 'child', 'children'); // "1 child"
 * ```
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}
