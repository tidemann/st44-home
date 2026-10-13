/**
 * Names and initial badges for people (ST-841).
 *
 * A person is shown by their own name: a parent's first/last name, a child's name.
 * The e-mail local part is never a name: «st808-livecheck» is not a person, and
 * «s(ara)@…» must not put «S(» in a badge.
 */

/** Upper case for Norwegian letters (ø → Ø) */
function upper(letter: string): string {
  return letter.toLocaleUpperCase('nb-NO');
}

/**
 * The one letter in a person's initial badge.
 * From the name: its first letter or digit («Prøvebarn» → «P», «øyvind (deg)» → «Ø»).
 * Only when there is no name: the first letter of the e-mail (letters only, upper case).
 * Empty when neither gives a letter.
 */
export function personInitial(name: string | null | undefined, email?: string | null): string {
  const fromName = name?.match(/[\p{L}\p{N}]/u)?.[0];
  if (fromName) return upper(fromName);
  const fromEmail = email?.split('@')[0].match(/\p{L}/u)?.[0];
  return fromEmail ? upper(fromEmail) : '';
}

/** The person's name, trimmed; null when there is none (never the e-mail) */
export function personName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  return trimmed ? trimmed : null;
}

/** The line under the Innstillinger title: «Kari Dahl – forelder» (ST-951) */
export function settingsSubline(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  role: 'admin' | 'parent' | 'child' | null | undefined,
): string {
  const name = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ');
  const roleWord =
    role === 'child' ? 'barn' : role === 'admin' || role === 'parent' ? 'forelder' : '';
  return [name, roleWord].filter(Boolean).join(' – ');
}
