/**
 * ST-2227: one account can be child in one household and admin in another. These words
 * make the role in each household plain on the child home, in «Bytt husstand» and on the
 * child-invitation pages.
 */
export type HouseholdRole = 'admin' | 'parent' | 'child';

/** «Barn», «Forelder», «Admin»: the chip */
export function roleChip(role: HouseholdRole): string {
  switch (role) {
    case 'admin':
      return $localize`:@@householdRole.chip.admin:Admin`;
    case 'parent':
      return $localize`:@@householdRole.chip.parent:Forelder`;
    default:
      return $localize`:@@householdRole.chip.child:Barn`;
  }
}

/** «Du er barn», «Du er forelder», «Du er administrator»: the sentence */
export function roleSentence(role: HouseholdRole): string {
  switch (role) {
    case 'admin':
      return $localize`:@@householdRole.sentence.admin:Du er administrator`;
    case 'parent':
      return $localize`:@@householdRole.sentence.parent:Du er forelder`;
    default:
      return $localize`:@@householdRole.sentence.child:Du er barn`;
  }
}

/** «forelder», «administrator», «barn»: inside a sentence */
export function roleWord(role: HouseholdRole): string {
  switch (role) {
    case 'admin':
      return $localize`:@@householdRole.word.admin:administrator`;
    case 'parent':
      return $localize`:@@householdRole.word.parent:forelder`;
    default:
      return $localize`:@@householdRole.word.child:barn`;
  }
}

/** The household sub-line on the child home: «Familien Nordmann · Barn» */
export function householdSubline(name: string, role: HouseholdRole): string {
  return `${name} · ${roleChip(role)}`;
}

/** Navigation state the child home reads once, after an account was linked to a profile */
export interface LinkedChildState {
  linkedHousehold: string;
}
