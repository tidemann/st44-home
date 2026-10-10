import '@angular/localize/init';
import { capitalize, clockTime, dayWord, isoDay, longDate } from './poeng-format';

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

  it('capitalizes the first letter only', () => {
    expect(capitalize('i går')).toBe('I går');
  });
});
