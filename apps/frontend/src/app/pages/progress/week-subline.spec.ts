import '@angular/localize/init';
import { describe, expect, it } from 'vitest';
import { weekSubline } from './week-subline';

describe('weekSubline', () => {
  it('shows the ISO week and the Monday-to-Sunday range for a Wednesday', () => {
    expect(weekSubline(new Date(2026, 9, 14))).toBe('uke 42 – 12. til 18. oktober');
  });

  it('shows the same range on Monday', () => {
    expect(weekSubline(new Date(2026, 9, 12))).toBe('uke 42 – 12. til 18. oktober');
  });

  it('shows the same range on Sunday', () => {
    expect(weekSubline(new Date(2026, 9, 18))).toBe('uke 42 – 12. til 18. oktober');
  });

  it('names both months when a week crosses a month boundary', () => {
    expect(weekSubline(new Date(2026, 8, 30))).toBe('uke 40 – 28. september til 4. oktober');
  });

  it('uses the previous ISO year for a January date in week 53', () => {
    expect(weekSubline(new Date(2027, 0, 1))).toBe('uke 53 – 28. desember til 3. januar');
  });
});
