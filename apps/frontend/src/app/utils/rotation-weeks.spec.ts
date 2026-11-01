import { describe, expect, it } from 'vitest';
import { mondayOf, weekNumbers } from './rotation-weeks';

describe('weekNumbers', () => {
  it('lists consecutive ISO weeks in November 2026', () => {
    expect(weekNumbers(new Date(2026, 10, 2), 3)).toEqual([45, 46, 47]);
  });

  it('crosses from ISO week 53 of 2026 into 2027', () => {
    expect(weekNumbers(new Date(2026, 11, 21), 4)).toEqual([52, 53, 1, 2]);
  });

  it('crosses from a 52-week year into 2028', () => {
    expect(weekNumbers(new Date(2027, 11, 20), 3)).toEqual([51, 52, 1]);
  });

  it('returns no weeks when count is zero', () => {
    expect(weekNumbers(new Date(2026, 10, 2), 0)).toEqual([]);
  });
});

describe('mondayOf', () => {
  it('returns the local Monday for a Sunday in the same week', () => {
    const monday = mondayOf(new Date(2026, 10, 8));
    const expected = new Date(2026, 10, 2);
    expect([monday.getFullYear(), monday.getMonth(), monday.getDate()]).toEqual([
      expected.getFullYear(), expected.getMonth(), expected.getDate(),
    ]);
  });

  it('returns the previous year\'s Monday for January 1, 2027', () => {
    const monday = mondayOf(new Date(2027, 0, 1));
    expect([monday.getFullYear(), monday.getMonth(), monday.getDate()]).toEqual([2026, 11, 28]);
  });

  it('resets the time to local midnight', () => {
    const monday = mondayOf(new Date(2026, 10, 2, 15, 30));
    expect([monday.getFullYear(), monday.getMonth(), monday.getDate(), monday.getHours()]).toEqual([
      2026, 10, 2, 0,
    ]);
  });
});
