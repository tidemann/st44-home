import { randomBytes } from 'node:crypto';

/**
 * «Etter tur» chores (ST-2075): one child has the turn at a time, and the turn goes
 * round the parent's ordered list of children.
 */

/** The child after `current` in `order`, round the list; the first child when `current` is not in it */
export function nextInLine(order: string[], current: string | null): string | null {
  if (order.length === 0) return null;
  return order[(order.indexOf(current ?? '') + 1) % order.length];
}

/** Letters and digits that cannot be misread (no 0/O, 1/I); 32 of them, so a byte % 32 is unbiased */
export const SCAN_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const SCAN_CODE_LENGTH = 6;

/** A new code for the chore's link https://home.st44.no/s/<code> */
export function generateScanCode(bytes: (n: number) => Uint8Array = randomBytes): string {
  return Array.from(bytes(SCAN_CODE_LENGTH), (byte) => SCAN_CODE_ALPHABET[byte % 32]).join('');
}

/** The code in upper case, or null when it cannot be one of ours (so we never query the DB with junk) */
export function normalizeScanCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return code.length === SCAN_CODE_LENGTH && [...code].every((char) => SCAN_CODE_ALPHABET.includes(char))
    ? code
    : null;
}
