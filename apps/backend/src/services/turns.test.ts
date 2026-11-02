import { test, describe } from 'node:test';
import assert from 'node:assert';
import { withNewScanCode } from './turns.ts';

/** Two chores saved at the same moment can draw the same free code (ST-2114) */
describe('withNewScanCode', () => {
  // newScanCode's "is it taken?" check always says free, as in the race
  const client = { query: async () => ({ rows: [] }) } as unknown as Parameters<
    typeof withNewScanCode
  >[0];
  const clash = Object.assign(new Error('duplicate key'), {
    code: '23505',
    constraint: 'idx_tasks_scan_code',
  });

  test('a clash on the scan code is saved again with another code', async () => {
    const codes: string[] = [];
    const saved = await withNewScanCode(client, async (code) => {
      codes.push(code);
      if (codes.length === 1) throw clash;
      return code;
    });
    assert.strictEqual(codes.length, 2);
    assert.strictEqual(saved, codes[1]);
  });

  test('other errors, and a clash that keeps coming, still fail', async () => {
    const other = Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint: 'tasks_pkey',
    });
    await assert.rejects(
      withNewScanCode(client, async () => {
        throw other;
      }),
      other,
    );
    let tries = 0;
    await assert.rejects(
      withNewScanCode(client, async () => {
        tries++;
        throw clash;
      }),
      clash,
    );
    assert.strictEqual(tries, 3);
  });
});
