import '@angular/localize/init';
import {
  capitalize,
  clockTime,
  dayWord,
  daysToSunday,
  doneWhen,
  isoDay,
  longDate,
} from './poeng-format';

describe('weekly «Frist» words (ST-2143)', () => {
  it('names the deadline day, «i dag» on the day itself', () => {
    expect(dayWord('2026-11-08', '2026-11-04')).toBe('søndag');
    expect(dayWord('2026-11-08', '2026-11-08')).toBe('i dag');
    // Not «i morgen»: the row reads «Frist lørdag» on Friday
    expect(dayWord('2026-11-07', '2026-11-06')).toBe('lørdag');
  });

  it('counts the days to Sunday, the end of the week', () => {
    expect(daysToSunday('2026-11-02')).toBe(6); // Monday
    expect(daysToSunday('2026-11-04')).toBe(4); // Wednesday
    expect(daysToSunday('2026-11-08')).toBe(0); // Sunday
  });

  it('says when a chore was done: the clock today, the day and date before', () => {
    const now = new Date(2026, 10, 9, 16, 48);
    expect(doneWhen(new Date(2026, 10, 9, 15, 30).toISOString(), now)).toBe('15.30');
    expect(doneWhen(new Date(2026, 10, 7, 11, 0).toISOString(), now)).toBe('lørdag 7.11');
    expect(doneWhen('not a date', now)).toBe('');
  });
});

describe('poeng-format', () => {
  it('writes the long date the way the pictures do', () => {
    expect(longDate(new Date(2026, 9, 6, 12))).toBe('tirsdag 6. oktober');
  });

  it('writes clock time with a dot', () => {
    expect(clockTime(new Date(2026, 9, 6, 16, 8))).toBe('16.08');
  });

  it('counts days in UTC like the API', () => {
    const now = new Date('2026-10-06T10:00:00Z');
    expect(isoDay(0, now)).toBe('2026-10-06');
    expect(isoDay(-1, now)).toBe('2026-10-05');
  });

  it('names today, yesterday and older days', () => {
    expect(dayWord('2026-10-06', '2026-10-06')).toBe('i dag');
    expect(dayWord('2026-10-05', '2026-10-06')).toBe('i går');
    expect(dayWord('2026-10-03', '2026-10-06')).toBe('lørdag');
  });

  it('reads a full ISO timestamp as its day and never throws (ST-808)', () => {
    expect(dayWord('2026-10-06T00:00:00.000Z', '2026-10-06')).toBe('i dag');
    expect(dayWord('2026-10-05T00:00:00.000Z', '2026-10-06')).toBe('i går');
    expect(dayWord('2026-10-03T00:00:00.000Z', '2026-10-06')).toBe('lørdag');
    expect(() => dayWord('not a date', '2026-10-06')).not.toThrow();
  });

  it('capitalizes the first letter only', () => {
    expect(capitalize('i går')).toBe('I går');
  });
});
