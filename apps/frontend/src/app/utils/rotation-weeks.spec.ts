import { describe, expect, it } from 'vitest';
import { mondayOf, rotationFromNextWeek, weekNumbers } from './rotation-weeks';

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
      expected.getFullYear(),
      expected.getMonth(),
      expected.getDate(),
    ]);
  });

  it("returns the previous year's Monday for January 1, 2027", () => {
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

describe('rotationFromNextWeek (ST-2030)', () => {
  const kids = ['emma', 'jonas', 'mathea'];

  it('turns the order so row 1 is next week, and names this week', () => {
    // Started week 45 (Mon 2026-11-02); today is in week 46, Jonas's week
    const result = rotationFromNextWeek(kids, 'alternating', '2026-11-02', new Date(2026, 10, 11));
    expect(result.thisWeekChildId).toBe('jonas');
    expect(result.order).toEqual(['mathea', 'emma', 'jonas']);
  });

  it('a rotation changed this week (starts next week) is shown as saved, this week unknown', () => {
    // The server kept this week's chores; the new order cannot say who has them
    const result = rotationFromNextWeek(kids, 'alternating', '2026-11-09', new Date(2026, 10, 4));
    expect(result.order).toEqual(kids);
    expect(result.thisWeekChildId).toBeNull();
  });

  it('counts over the year end and across daylight saving', () => {
    // Start Mon 2026-10-19 (summer time), today Wed 2027-01-06: 11 weeks later
    const result = rotationFromNextWeek(
      ['emma', 'jonas'],
      'alternating',
      '2026-10-19',
      new Date(2027, 0, 6),
    );
    expect(result.thisWeekChildId).toBe('jonas');
    expect(result.order).toEqual(['emma', 'jonas']);
  });

  it('odd/even keeps the order (top row = odd weeks) and reads this week by parity', () => {
    expect(
      rotationFromNextWeek(['emma', 'jonas'], 'odd_even_week', undefined, new Date(2026, 10, 4)),
    ).toEqual({ order: ['emma', 'jonas'], thisWeekChildId: 'emma' });
    expect(
      rotationFromNextWeek(['emma', 'jonas'], 'odd_even_week', undefined, new Date(2026, 10, 9)),
    ).toEqual({ order: ['emma', 'jonas'], thisWeekChildId: 'jonas' });
  });

  it('a rotation from before ST-2030 (no start week) keeps its order', () => {
    expect(rotationFromNextWeek(kids, 'alternating', undefined, new Date(2026, 10, 4))).toEqual({
      order: kids,
      thisWeekChildId: null,
    });
  });
});
