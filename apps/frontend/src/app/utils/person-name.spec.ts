import { describe, it, expect } from 'vitest';
import { personInitial, personName } from './person-name';

describe('personInitial', () => {
  it('takes the first letter of the name', () => {
    expect(personInitial('Prøvebarn', 'st808-livecheck-child@example.com')).toBe('P');
    expect(personInitial('øyvind (deg)')).toBe('Ø');
    expect(personInitial('  Kari Nordmann')).toBe('K');
  });

  it('never uses the e-mail when there is a name', () => {
    expect(personInitial('Jonas', 'sara@example.com')).toBe('J');
  });

  it('falls back to the first e-mail letter, letters only, upper case', () => {
    expect(personInitial(null, 'st808-livecheck@example.com')).toBe('S');
    expect(personInitial('', '(s)ara@example.com')).toBe('S');
    expect(personInitial(undefined, '808kari@example.com')).toBe('K');
  });

  it('is empty when neither gives a letter', () => {
    expect(personInitial(null, '1234@example.com')).toBe('');
    expect(personInitial(null, null)).toBe('');
  });
});

describe('personName', () => {
  it('trims the name and gives null for none', () => {
    expect(personName('  Kari ')).toBe('Kari');
    expect(personName('   ')).toBeNull();
    expect(personName(null)).toBeNull();
  });
});
