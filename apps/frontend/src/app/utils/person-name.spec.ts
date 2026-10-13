import { describe, it, expect } from 'vitest';
import { personInitial, personName, settingsSubline } from './person-name';

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

describe('settingsSubline', () => {
  it('shows full name and parent role', () => {
    expect(settingsSubline('Kari', 'Dahl', 'parent')).toBe('Kari Dahl – forelder');
  });

  it('shows only the first name when last name is empty', () => {
    expect(settingsSubline('Kari', '', 'parent')).toBe('Kari – forelder');
  });

  it('trims names and presents admin as parent', () => {
    expect(settingsSubline('  Kari ', '  Dahl ', 'admin')).toBe('Kari Dahl – forelder');
  });

  it('shows child role without a last name', () => {
    expect(settingsSubline('Ola', null, 'child')).toBe('Ola – barn');
  });

  it('shows only the role when there is no name', () => {
    expect(settingsSubline('', '  ', 'parent')).toBe('forelder');
  });

  it('shows only the name when there is no role', () => {
    expect(settingsSubline('Kari', 'Dahl', null)).toBe('Kari Dahl');
  });

  it('is empty when there is neither name nor role', () => {
    expect(settingsSubline(null, undefined, undefined)).toBe('');
  });
});
