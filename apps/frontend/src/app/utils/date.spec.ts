import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseDate,
  startOfDay,
  isSameDay,
  isToday,
  isTomorrow,
  isYesterday,
  isPast,
  isFuture,
  isThisWeek,
  formatDate,
  formatDateShort,
  formatDateWithYear,
  formatRelativeDate,
  toISODateString,
  daysBetween,
  daysFromToday,
  addDays,
  getToday,
  getTomorrow,
  getYesterday,
} from './date';

describe('Date utilities', () => {
  // Fixed date for consistent testing: Wednesday, January 15, 2025
  const fixedDate = new Date(2025, 0, 15, 12, 0, 0);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('parseDate', () => {
    it('should return the same Date object if passed a Date', () => {
      const date = new Date(2024, 5, 15);
      const result = parseDate(date);
      expect(result).toBe(date);
    });

    it('should parse ISO date string', () => {
      const result = parseDate('2024-06-15');
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(5); // June is month 5
      expect(result.getDate()).toBe(15);
    });

    it('should parse ISO datetime string', () => {
      const result = parseDate('2024-06-15T10:30:00Z');
      expect(result.getFullYear()).toBe(2024);
    });
  });

  describe('startOfDay', () => {
    it('should set time to midnight', () => {
      const date = new Date(2024, 5, 15, 14, 30, 45);
      const result = startOfDay(date);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it('should work with date strings', () => {
      const result = startOfDay('2024-06-15T14:30:45');

      expect(result.getHours()).toBe(0);
      expect(result.getDate()).toBe(15);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day with different times', () => {
      const date1 = new Date(2024, 5, 15, 10, 0, 0);
      const date2 = new Date(2024, 5, 15, 22, 30, 0);

      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date(2024, 5, 15);
      const date2 = new Date(2024, 5, 16);

      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should work with strings', () => {
      expect(isSameDay('2024-06-15', '2024-06-15')).toBe(true);
      expect(isSameDay('2024-06-15', '2024-06-16')).toBe(false);
    });

    it('should handle mixed Date and string', () => {
      const date = new Date(2024, 5, 15);
      expect(isSameDay(date, '2024-06-15')).toBe(true);
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      expect(isToday(fixedDate)).toBe(true);
      expect(isToday('2025-01-15')).toBe(true);
    });

    it('should return false for other days', () => {
      expect(isToday('2025-01-14')).toBe(false);
      expect(isToday('2025-01-16')).toBe(false);
    });
  });

  describe('isTomorrow', () => {
    it('should return true for tomorrow', () => {
      expect(isTomorrow('2025-01-16')).toBe(true);
    });

    it('should return false for today', () => {
      expect(isTomorrow('2025-01-15')).toBe(false);
    });

    it('should return false for other days', () => {
      expect(isTomorrow('2025-01-17')).toBe(false);
      expect(isTomorrow('2025-01-14')).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('should return true for yesterday', () => {
      expect(isYesterday('2025-01-14')).toBe(true);
    });

    it('should return false for today', () => {
      expect(isYesterday('2025-01-15')).toBe(false);
    });

    it('should return false for other days', () => {
      expect(isYesterday('2025-01-13')).toBe(false);
      expect(isYesterday('2025-01-16')).toBe(false);
    });
  });

  describe('isPast', () => {
    it('should return true for past dates', () => {
      expect(isPast('2025-01-14')).toBe(true);
      expect(isPast('2025-01-01')).toBe(true);
      expect(isPast('2024-12-31')).toBe(true);
    });

    it('should return false for today', () => {
      expect(isPast('2025-01-15')).toBe(false);
    });

    it('should return false for future dates', () => {
      expect(isPast('2025-01-16')).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should return true for future dates', () => {
      expect(isFuture('2025-01-16')).toBe(true);
      expect(isFuture('2025-02-01')).toBe(true);
    });

    it('should return false for today', () => {
      expect(isFuture('2025-01-15')).toBe(false);
    });

    it('should return false for past dates', () => {
      expect(isFuture('2025-01-14')).toBe(false);
    });
  });

  describe('isThisWeek', () => {
    // Fixed date is Wednesday, January 15, 2025
    // Week is Sunday Jan 12 to Saturday Jan 18

    it('should return true for dates within current week', () => {
      expect(isThisWeek('2025-01-12')).toBe(true); // Sunday
      expect(isThisWeek('2025-01-15')).toBe(true); // Wednesday (today)
      expect(isThisWeek('2025-01-18')).toBe(true); // Saturday
    });

    it('should return false for dates outside current week', () => {
      expect(isThisWeek('2025-01-11')).toBe(false); // Previous Saturday
      expect(isThisWeek('2025-01-19')).toBe(false); // Next Sunday
    });
  });

  describe('formatDate', () => {
    it('should format date with default options (long)', () => {
      const result = formatDate('2025-01-15', { dateStyle: 'long' }, 'en-US');
      expect(result).toContain('January');
      expect(result).toContain('15');
      expect(result).toContain('2025');
    });

    it('should format date with short style', () => {
      const result = formatDate('2025-01-15', { dateStyle: 'short' }, 'en-US');
      expect(result).toMatch(/1\/15\/25/);
    });

    it('should format with custom options', () => {
      const result = formatDate('2025-01-15', { weekday: 'long', year: 'numeric' }, 'en-US');
      expect(result).toContain('Wednesday');
      expect(result).toContain('2025');
    });
  });

  describe('formatDateShort', () => {
    it('should format date as short (month day)', () => {
      const result = formatDateShort('2025-01-15', 'en-US');
      expect(result).toBe('Jan 15');
    });
  });

  describe('formatDateWithYear', () => {
    it('should format date with year', () => {
      const result = formatDateWithYear('2025-01-15', 'en-US');
      expect(result).toBe('Jan 15, 2025');
    });
  });

  describe('formatRelativeDate', () => {
    it('should return "Today" for today', () => {
      expect(formatRelativeDate('2025-01-15')).toBe('Today');
    });

    it('should return "Tomorrow" for tomorrow', () => {
      expect(formatRelativeDate('2025-01-16')).toBe('Tomorrow');
    });

    it('should return "Yesterday" for yesterday', () => {
      expect(formatRelativeDate('2025-01-14')).toBe('Yesterday');
    });

    it('should return short date for other days in same year', () => {
      const result = formatRelativeDate('2025-02-20', 'en-US');
      expect(result).toBe('Feb 20');
    });

    it('should include year for different year', () => {
      const result = formatRelativeDate('2024-06-15', 'en-US');
      expect(result).toBe('Jun 15, 2024');
    });
  });

  describe('toISODateString', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      expect(toISODateString(date)).toBe('2025-01-15');
    });

    it('should pad single digit months and days', () => {
      const date = new Date(2025, 0, 5); // January 5, 2025
      expect(toISODateString(date)).toBe('2025-01-05');
    });

    it('should work with string input', () => {
      expect(toISODateString('2025-01-15T12:00:00')).toBe('2025-01-15');
    });
  });

  describe('daysBetween', () => {
    it('should return 0 for same day', () => {
      expect(daysBetween('2025-01-15', '2025-01-15')).toBe(0);
    });

    it('should return positive for future date', () => {
      expect(daysBetween('2025-01-15', '2025-01-20')).toBe(5);
    });

    it('should return negative for past date', () => {
      expect(daysBetween('2025-01-15', '2025-01-10')).toBe(-5);
    });

    it('should handle month boundaries', () => {
      expect(daysBetween('2025-01-30', '2025-02-02')).toBe(3);
    });

    it('should handle year boundaries', () => {
      expect(daysBetween('2024-12-30', '2025-01-02')).toBe(3);
    });
  });

  describe('daysFromToday', () => {
    it('should return 0 for today', () => {
      expect(daysFromToday('2025-01-15')).toBe(0);
    });

    it('should return positive for future dates', () => {
      expect(daysFromToday('2025-01-20')).toBe(5);
    });

    it('should return negative for past dates', () => {
      expect(daysFromToday('2025-01-10')).toBe(-5);
    });
  });

  describe('addDays', () => {
    it('should add positive days', () => {
      const result = addDays('2025-01-15', 5);
      expect(toISODateString(result)).toBe('2025-01-20');
    });

    it('should add negative days (subtract)', () => {
      const result = addDays('2025-01-15', -5);
      expect(toISODateString(result)).toBe('2025-01-10');
    });

    it('should handle month boundaries', () => {
      const result = addDays('2025-01-30', 5);
      expect(toISODateString(result)).toBe('2025-02-04');
    });

    it('should handle year boundaries', () => {
      const result = addDays('2024-12-30', 5);
      expect(toISODateString(result)).toBe('2025-01-04');
    });

    it('should not modify original date', () => {
      const original = new Date(2025, 0, 15);
      addDays(original, 5);
      expect(original.getDate()).toBe(15);
    });
  });

  describe('getToday', () => {
    it('should return today at midnight', () => {
      const result = getToday();

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe('getTomorrow', () => {
    it('should return tomorrow at midnight', () => {
      const result = getTomorrow();

      expect(result.getDate()).toBe(16);
      expect(result.getHours()).toBe(0);
    });
  });

  describe('getYesterday', () => {
    it('should return yesterday at midnight', () => {
      const result = getYesterday();

      expect(result.getDate()).toBe(14);
      expect(result.getHours()).toBe(0);
    });
  });
});
