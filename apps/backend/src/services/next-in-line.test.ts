import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  nextInLine,
  generateScanCode,
  normalizeScanCode,
  SCAN_CODE_ALPHABET,
} from './next-in-line.js';

describe('next in line (ST-2075)', () => {
  test('advances to the next child and wraps round', () => {
    assert.strictEqual(nextInLine(['emma', 'jonas', 'mathea'], 'emma'), 'jonas');
    assert.strictEqual(nextInLine(['emma', 'jonas', 'mathea'], 'mathea'), 'emma');
  });

  test('starts at the top when there is no current child in the order', () => {
    assert.strictEqual(nextInLine(['emma', 'jonas'], null), 'emma');
    assert.strictEqual(nextInLine(['emma', 'jonas'], 'gone'), 'emma');
  });

  test('handles empty and single-child orders', () => {
    assert.strictEqual(nextInLine([], 'emma'), null);
    assert.strictEqual(nextInLine(['emma'], 'emma'), 'emma');
  });

  test('scan alphabet excludes ambiguous characters', () => {
    assert.strictEqual(SCAN_CODE_ALPHABET, '23456789ABCDEFGHJKLMNPQRSTUVWXYZ');
    assert.strictEqual(SCAN_CODE_ALPHABET.length, 32);
  });

  test('maps injected random bytes modulo 32 to six characters', () => {
    assert.strictEqual(
      generateScanCode(() => Uint8Array.from([0, 1, 31, 32, 255, 100])),
      '23Z2Z6',
    );
  });

  test('generates a six-character scan code with default randomness', () => {
    assert.match(generateScanCode(), /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  });

  test('normalizes valid codes and rejects invalid ones', () => {
    assert.strictEqual(normalizeScanCode(' 4kq7mf '), '4KQ7MF');
    for (const invalid of ['4KQ7M', '4KQ7MF1', 'O0O0O0', '']) {
      assert.strictEqual(normalizeScanCode(invalid), null);
    }
  });
});
