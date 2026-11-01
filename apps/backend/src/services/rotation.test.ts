import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  alternatingChild,
  isoWeekOf,
  mondayOf,
  oddEvenChild,
  parseIsoDate,
  toIsoDate,
  weeksBetween,
} from './rotation.js';

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const children2 = ['emma', 'jonas'];
const children3 = ['emma', 'jonas', 'mathea'];

describe('rotation (ST-2030)', () => {
  test('mondayOf: every day of a week gives the same Monday, Sunday included', () => {
    // 2026-11-02 is the Monday of ISO week 45
    for (const d of ['2026-11-02', '2026-11-04', '2026-11-08']) {
      assert.strictEqual(toIsoDate(mondayOf(day(d))), '2026-11-02');
    }
    assert.strictEqual(toIsoDate(mondayOf(day('2026-11-09'))), '2026-11-09');
  });

  test('weeksBetween counts whole weeks both ways', () => {
    assert.strictEqual(weeksBetween(day('2026-11-02'), day('2026-11-08')), 0);
    assert.strictEqual(weeksBetween(day('2026-11-02'), day('2026-11-09')), 1);
    assert.strictEqual(weeksBetween(day('2026-11-09'), day('2026-11-02')), -1);
  });

  test('alternating, 2 children: the first child has the start week, then they swap', () => {
    const start = day('2026-11-02');
    assert.strictEqual(alternatingChild(children2, start, day('2026-11-05')), 'emma');
    assert.strictEqual(alternatingChild(children2, start, day('2026-11-10')), 'jonas');
    assert.strictEqual(alternatingChild(children2, start, day('2026-11-16')), 'emma');
  });

  test('alternating, 3 children: the dragged order is the order of the weeks', () => {
    const start = day('2026-11-02');
    const weeks = [0, 1, 2, 3, 4].map((w) =>
      alternatingChild(children3, start, new Date(start.getTime() + w * 7 * 86400000)),
    );
    assert.deepStrictEqual(weeks, ['emma', 'jonas', 'mathea', 'emma', 'jonas']);
  });

  test('alternating: weeks before the start count backwards round the list', () => {
    const start = day('2026-11-09');
    assert.strictEqual(alternatingChild(children3, start, day('2026-11-02')), 'mathea');
    assert.strictEqual(alternatingChild(children3, start, day('2026-10-26')), 'jonas');
  });

  test('alternating over the year end keeps one step per week (53-week year 2026)', () => {
    // 2026 has ISO week 53 (Mon 2026-12-28); week 1 of 2027 starts Mon 2027-01-04
    assert.strictEqual(isoWeekOf(day('2026-12-28')), 53);
    assert.strictEqual(isoWeekOf(day('2027-01-04')), 1);
    const start = day('2026-12-21'); // week 52
    assert.strictEqual(alternatingChild(children2, start, day('2026-12-21')), 'emma');
    assert.strictEqual(alternatingChild(children2, start, day('2026-12-31')), 'jonas');
    assert.strictEqual(alternatingChild(children2, start, day('2027-01-04')), 'emma');
    assert.strictEqual(alternatingChild(children2, start, day('2027-01-11')), 'jonas');
  });

  test('rule 1: a new order from next Monday leaves this week with the same child', () => {
    // Old: Emma, Jonas, Mathea from week 45. In week 46 (Jonas's week) the parent drags
    // Mathea first; the form sends the order from next week and the server starts it then.
    const oldStart = day('2026-11-02');
    const thisWeek = day('2026-11-11');
    const newStart = day('2026-11-16');
    const newOrder = ['mathea', 'emma', 'jonas'];
    assert.strictEqual(alternatingChild(children3, oldStart, thisWeek), 'jonas');
    // the server keeps the generated rows of this week; only weeks from newStart are new
    assert.strictEqual(alternatingChild(newOrder, newStart, day('2026-11-16')), 'mathea');
    assert.strictEqual(alternatingChild(newOrder, newStart, day('2026-11-23')), 'emma');
  });

  test('rule 2: a child taken out finishes this week, the rest go on from next week', () => {
    const oldStart = day('2026-11-02');
    assert.strictEqual(alternatingChild(children3, oldStart, day('2026-11-18')), 'mathea');
    const after = ['emma', 'jonas'];
    const newStart = day('2026-11-23');
    assert.strictEqual(alternatingChild(after, newStart, day('2026-11-23')), 'emma');
    assert.strictEqual(alternatingChild(after, newStart, day('2026-11-30')), 'jonas');
  });

  test('odd/even: the top child has odd weeks, the other even weeks', () => {
    assert.strictEqual(oddEvenChild(children2, day('2026-11-02')), 'emma'); // week 45
    assert.strictEqual(oddEvenChild(children2, day('2026-11-09')), 'jonas'); // week 46
  });

  test('odd/even over the year end: week 53 and week 1 are both odd', () => {
    assert.strictEqual(oddEvenChild(children2, day('2026-12-21')), 'jonas'); // week 52
    assert.strictEqual(oddEvenChild(children2, day('2026-12-28')), 'emma'); // week 53
    assert.strictEqual(oddEvenChild(children2, day('2027-01-04')), 'emma'); // week 1
    assert.strictEqual(oddEvenChild(children2, day('2027-01-11')), 'jonas'); // week 2
  });

  test('parseIsoDate accepts a calendar day and nothing else', () => {
    assert.strictEqual(toIsoDate(parseIsoDate('2026-11-02')!), '2026-11-02');
    assert.strictEqual(parseIsoDate(undefined), null);
    assert.strictEqual(parseIsoDate('2026-11-02T10:00:00Z'), null);
    assert.strictEqual(parseIsoDate('not a date'), null);
  });
});
