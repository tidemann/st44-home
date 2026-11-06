import { describe, expect, it } from 'vitest';
import { maskEmail } from './mask-email';

describe('maskEmail', () => {
  it('keeps the first two characters for a longer local part', () => {
    expect(maskEmail('jonas.nordmann@gmail.com')).toBe('jo•••@gmail.com');
  });

  it('keeps only the first character for local parts of one or two characters', () => {
    expect(maskEmail('ab@x.no')).toBe('a•••@x.no');
    expect(maskEmail('a@x.no')).toBe('a•••@x.no');
  });

  it('trims whitespace without changing domain case', () => {
    expect(maskEmail('  Kari@Example.COM ')).toBe('Ka•••@Example.COM');
  });

  it('returns only bullets when the address has no local part or domain', () => {
    expect(maskEmail('noat')).toBe('•••');
    expect(maskEmail('@x.no')).toBe('•••');
    expect(maskEmail('a@')).toBe('•••');
  });

  it('splits at the last at-sign', () => {
    expect(maskEmail('a"b@c"@d.no')).toBe('a"•••@d.no');
  });
});
