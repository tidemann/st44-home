import { describe, it, expect } from 'vitest';
import {
  formatPoints,
  formatPercentage,
  truncateText,
  formatNumber,
  formatBytes,
  capitalize,
  toTitleCase,
  formatDuration,
  pluralize,
  formatCount,
} from './format';

describe('Format utilities', () => {
  describe('formatPoints', () => {
    it('should format single point with singular suffix', () => {
      expect(formatPoints(1)).toBe('1 pt');
    });

    it('should format multiple points with plural suffix', () => {
      expect(formatPoints(100)).toBe('100 pts');
      expect(formatPoints(0)).toBe('0 pts');
      expect(formatPoints(2)).toBe('2 pts');
    });

    it('should abbreviate thousands with K', () => {
      expect(formatPoints(1000)).toBe('1K pts');
      expect(formatPoints(1500)).toBe('1.5K pts');
      expect(formatPoints(2500)).toBe('2.5K pts');
      expect(formatPoints(10000)).toBe('10K pts');
    });

    it('should abbreviate millions with M', () => {
      expect(formatPoints(1000000)).toBe('1M pts');
      expect(formatPoints(1500000)).toBe('1.5M pts');
      expect(formatPoints(2500000)).toBe('2.5M pts');
    });

    it('should hide suffix when showSuffix is false', () => {
      expect(formatPoints(100, { showSuffix: false })).toBe('100');
      expect(formatPoints(1500, { showSuffix: false })).toBe('1.5K');
    });

    it('should not abbreviate when abbreviate is false', () => {
      expect(formatPoints(1500, { abbreviate: false })).toBe('1,500 pts');
      expect(formatPoints(1000000, { abbreviate: false })).toBe('1,000,000 pts');
    });

    it('should respect decimals option', () => {
      expect(formatPoints(1234, { decimals: 2 })).toBe('1.23K pts');
      expect(formatPoints(1500, { decimals: 0 })).toBe('2K pts');
    });

    it('should remove trailing zeros in decimals', () => {
      expect(formatPoints(2000)).toBe('2K pts');
      expect(formatPoints(1000000)).toBe('1M pts');
    });
  });

  describe('formatPercentage', () => {
    it('should format decimal to percentage', () => {
      expect(formatPercentage(0.75)).toBe('75%');
      expect(formatPercentage(0.5)).toBe('50%');
      expect(formatPercentage(1)).toBe('100%');
      expect(formatPercentage(0)).toBe('0%');
    });

    it('should round by default', () => {
      expect(formatPercentage(0.756)).toBe('76%');
      expect(formatPercentage(0.754)).toBe('75%');
    });

    it('should respect decimals option', () => {
      expect(formatPercentage(0.756, { decimals: 1 })).toBe('75.6%');
      expect(formatPercentage(0.7567, { decimals: 2 })).toBe('75.67%');
    });

    it('should handle raw percentage values', () => {
      expect(formatPercentage(75, { isRaw: true })).toBe('75%');
      expect(formatPercentage(75.5, { isRaw: true, decimals: 1 })).toBe('75.5%');
    });

    it('should handle values over 100%', () => {
      expect(formatPercentage(1.5)).toBe('150%');
      expect(formatPercentage(150, { isRaw: true })).toBe('150%');
    });
  });

  describe('truncateText', () => {
    it('should not truncate text shorter than maxLength', () => {
      expect(truncateText('Short', 10)).toBe('Short');
      expect(truncateText('Exact', 5)).toBe('Exact');
    });

    it('should truncate text with ellipsis', () => {
      expect(truncateText('Hello World', 8)).toBe('Hello...');
      expect(truncateText('Hello World', 10)).toBe('Hello W...');
    });

    it('should use custom ellipsis', () => {
      expect(truncateText('Hello World', 8, { ellipsis: '>' })).toBe('Hello W>');
      expect(truncateText('Hello World', 8, { ellipsis: '..' })).toBe('Hello..');
    });

    it('should handle edge cases', () => {
      expect(truncateText('Hello', 3)).toBe('...');
      expect(truncateText('Hello', 2)).toBe('..');
      expect(truncateText('', 10)).toBe('');
    });

    it('should break at word boundaries when wordBreak is true', () => {
      expect(truncateText('Hello World Test', 12, { wordBreak: true })).toBe('Hello...');
      expect(truncateText('One Two Three Four', 14, { wordBreak: true })).toBe('One Two...');
    });

    it('should not word break if no space found', () => {
      expect(truncateText('HelloWorld', 8, { wordBreak: true })).toBe('Hello...');
    });

    it('should trim trailing whitespace', () => {
      expect(truncateText('Hello  World', 9)).toBe('Hello...');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with thousands separators', () => {
      const result = formatNumber(1234567);
      // Result depends on locale, but should contain separators
      expect(result).toMatch(/1.?234.?567/);
    });

    it('should handle small numbers', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(999)).toBe('999');
    });

    it('should handle negative numbers', () => {
      const result = formatNumber(-1234567);
      expect(result).toContain('1');
      expect(result).toContain('234');
    });

    it('should handle decimals', () => {
      const result = formatNumber(1234.56);
      expect(result).toContain('1');
    });
  });

  describe('formatBytes', () => {
    it('should format zero bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes', () => {
      expect(formatBytes(500)).toBe('500 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1572864)).toBe('1.5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should respect decimals option', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB');
      expect(formatBytes(1536, 2)).toBe('1.5 KB');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('world')).toBe('World');
    });

    it('should preserve rest of string', () => {
      expect(capitalize('hELLO')).toBe('HELLO');
      expect(capitalize('hello world')).toBe('Hello world');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
    });

    it('should handle already capitalized', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });
  });

  describe('toTitleCase', () => {
    it('should convert to title case', () => {
      expect(toTitleCase('hello world')).toBe('Hello World');
      expect(toTitleCase('the quick brown fox')).toBe('The Quick Brown Fox');
    });

    it('should handle all uppercase', () => {
      expect(toTitleCase('HELLO WORLD')).toBe('Hello World');
    });

    it('should handle mixed case', () => {
      expect(toTitleCase('hElLo WoRlD')).toBe('Hello World');
    });

    it('should handle single word', () => {
      expect(toTitleCase('hello')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(toTitleCase('')).toBe('');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds', () => {
      expect(formatDuration(5000)).toBe('5s');
      expect(formatDuration(30000)).toBe('30s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(65000)).toBe('1m 5s');
      expect(formatDuration(125000)).toBe('2m 5s');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(3660000)).toBe('1h 1m');
      expect(formatDuration(7320000)).toBe('2h 2m');
    });

    it('should not include seconds when hours present by default', () => {
      expect(formatDuration(3665000)).toBe('1h 1m');
    });

    it('should include seconds when includeSeconds is true', () => {
      expect(formatDuration(3665000, { includeSeconds: true })).toBe('1h 1m 5s');
    });

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('should handle hours without minutes', () => {
      expect(formatDuration(3600000)).toBe('1h');
    });

    it('should handle minutes without seconds', () => {
      expect(formatDuration(60000)).toBe('1m');
    });
  });

  describe('pluralize', () => {
    it('should return singular for count of 1', () => {
      expect(pluralize(1, 'task')).toBe('task');
      expect(pluralize(1, 'item')).toBe('item');
    });

    it('should return plural for count other than 1', () => {
      expect(pluralize(0, 'task')).toBe('tasks');
      expect(pluralize(2, 'task')).toBe('tasks');
      expect(pluralize(100, 'task')).toBe('tasks');
    });

    it('should use custom plural form', () => {
      expect(pluralize(1, 'child', 'children')).toBe('child');
      expect(pluralize(2, 'child', 'children')).toBe('children');
      expect(pluralize(1, 'person', 'people')).toBe('person');
      expect(pluralize(5, 'person', 'people')).toBe('people');
    });
  });

  describe('formatCount', () => {
    it('should format count with singular label', () => {
      expect(formatCount(1, 'task')).toBe('1 task');
      expect(formatCount(1, 'item')).toBe('1 item');
    });

    it('should format count with plural label', () => {
      expect(formatCount(0, 'task')).toBe('0 tasks');
      expect(formatCount(5, 'task')).toBe('5 tasks');
    });

    it('should use custom plural form', () => {
      expect(formatCount(1, 'child', 'children')).toBe('1 child');
      expect(formatCount(3, 'child', 'children')).toBe('3 children');
    });
  });
});
