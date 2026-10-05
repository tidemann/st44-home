import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  todayInTimeZone,
  runDailyAssignmentGeneration,
  startAssignmentScheduler,
  type DailyGenerationSummary,
} from './assignment-scheduler.js';
import type { AssignmentGenerationResult } from './assignment-generator.js';

/**
 * Assignment Scheduler Unit Tests (no database)
 */

const ymd = (date: Date) => date.toISOString().slice(0, 10);

function okSummary(date = '2026-10-05'): DailyGenerationSummary {
  return { date, households: 0, created: 0, skipped: 0, failedHouseholds: [], errors: [] };
}

function silentLogger() {
  const lines: { level: string; msg: string }[] = [];
  return {
    lines,
    info: (_obj: object, msg: string) => lines.push({ level: 'info', msg }),
    error: (_obj: object, msg: string) => lines.push({ level: 'error', msg }),
  };
}

describe('Assignment Scheduler', () => {
  describe('todayInTimeZone (Europe/Oslo)', () => {
    test('Sunday 22:30 UTC in summer is already Monday in Oslo (CEST, UTC+2)', () => {
      assert.strictEqual(ymd(todayInTimeZone(new Date('2026-10-04T22:30:00Z'))), '2026-10-05');
    });

    test('Sunday 21:30 UTC in summer is still Sunday in Oslo', () => {
      assert.strictEqual(ymd(todayInTimeZone(new Date('2026-10-04T21:30:00Z'))), '2026-10-04');
    });

    test('Sunday 23:30 UTC in winter is Monday in Oslo (CET, UTC+1)', () => {
      assert.strictEqual(ymd(todayInTimeZone(new Date('2026-01-04T23:30:00Z'))), '2026-01-05');
    });

    test('Sunday 22:30 UTC in winter is still Sunday in Oslo', () => {
      assert.strictEqual(ymd(todayInTimeZone(new Date('2026-01-04T22:30:00Z'))), '2026-01-04');
    });

    test('returns UTC midnight, independent of the server time zone', () => {
      const today = todayInTimeZone(new Date('2026-10-05T10:00:00Z'));
      assert.strictEqual(today.toISOString(), '2026-10-05T00:00:00.000Z');
    });
  });

  describe('runDailyAssignmentGeneration', () => {
    test('generates 7 days from Oslo today for every household', async () => {
      const calls: { householdId: string; start: string; days: number }[] = [];
      const summary = await runDailyAssignmentGeneration({
        // Monday 00:05 in Oslo, still Sunday in UTC
        now: new Date('2026-10-04T22:05:00Z'),
        listHouseholds: async () => ['h1', 'h2'],
        generate: async (householdId, start, days): Promise<AssignmentGenerationResult> => {
          calls.push({ householdId, start: ymd(start), days });
          return { created: 3, skipped: 1, errors: [] };
        },
      });

      assert.deepStrictEqual(calls, [
        { householdId: 'h1', start: '2026-10-05', days: 7 },
        { householdId: 'h2', start: '2026-10-05', days: 7 },
      ]);
      assert.strictEqual(summary.date, '2026-10-05');
      assert.strictEqual(summary.households, 2);
      assert.strictEqual(summary.created, 6);
      assert.strictEqual(summary.skipped, 2);
      assert.deepStrictEqual(summary.failedHouseholds, []);
    });

    test('one failing household does not stop the others', async () => {
      const done: string[] = [];
      const summary = await runDailyAssignmentGeneration({
        now: new Date('2026-10-05T06:00:00Z'),
        listHouseholds: async () => ['h1', 'h2', 'h3'],
        generate: async (householdId): Promise<AssignmentGenerationResult> => {
          if (householdId === 'h1') throw new Error('boom');
          if (householdId === 'h2') {
            return { created: 0, skipped: 0, errors: ['Transaction failed: deadlock'] };
          }
          done.push(householdId);
          return { created: 2, skipped: 0, errors: [] };
        },
      });

      assert.deepStrictEqual(done, ['h3']);
      assert.strictEqual(summary.created, 2);
      assert.deepStrictEqual(summary.failedHouseholds, ['h1', 'h2']);
      assert.strictEqual(summary.errors.length, 2);
    });

    test('task-level errors are reported but do not mark the household failed', async () => {
      const summary = await runDailyAssignmentGeneration({
        now: new Date('2026-10-05T06:00:00Z'),
        listHouseholds: async () => ['h1'],
        generate: async () => ({ created: 1, skipped: 0, errors: ['Task X: bad config'] }),
      });

      assert.deepStrictEqual(summary.failedHouseholds, []);
      assert.deepStrictEqual(summary.errors, ['h1: Task X: bad config']);
    });
  });

  describe('startAssignmentScheduler', () => {
    test('runs at startup, then once per Oslo day', async () => {
      let now = new Date('2026-10-05T06:00:00Z');
      const runs: string[] = [];
      const scheduler = startAssignmentScheduler(silentLogger(), {
        intervalMs: 60 * 60 * 1000,
        now: () => now,
        run: async (date) => {
          runs.push(date.toISOString());
          return okSummary();
        },
      });

      try {
        await scheduler.firstRun;
        assert.strictEqual(runs.length, 1, 'runs once at startup');

        // Later the same Oslo day: nothing to do
        now = new Date('2026-10-05T21:59:00Z');
        await scheduler.tick();
        assert.strictEqual(runs.length, 1);

        // 00:00 Tuesday in Oslo (22:00 UTC): runs again
        now = new Date('2026-10-05T22:00:00Z');
        await scheduler.tick();
        assert.strictEqual(runs.length, 2);

        await scheduler.tick();
        assert.strictEqual(runs.length, 2);
      } finally {
        scheduler.stop();
      }
    });

    test('retries at the next check when a run fails', async () => {
      let attempt = 0;
      const logger = silentLogger();
      const scheduler = startAssignmentScheduler(logger, {
        intervalMs: 60 * 60 * 1000,
        now: () => new Date('2026-10-05T06:00:00Z'),
        run: async () => {
          attempt++;
          if (attempt === 1) throw new Error('database down');
          if (attempt === 2) return { ...okSummary(), failedHouseholds: ['h1'], errors: ['x'] };
          return okSummary();
        },
      });

      try {
        await scheduler.firstRun;
        await scheduler.tick();
        await scheduler.tick();
        await scheduler.tick();
        assert.strictEqual(attempt, 3, 'stops retrying once a run succeeds');
        assert.deepStrictEqual(
          logger.lines.map((l) => l.level),
          ['error', 'error', 'info'],
        );
      } finally {
        scheduler.stop();
      }
    });

    test('does not start a second run while one is in progress', async () => {
      let release: () => void = () => {};
      let runs = 0;
      const scheduler = startAssignmentScheduler(silentLogger(), {
        intervalMs: 60 * 60 * 1000,
        now: () => new Date('2026-10-05T06:00:00Z'),
        run: async () => {
          runs++;
          await new Promise<void>((resolve) => (release = resolve));
          return okSummary();
        },
      });

      try {
        await scheduler.tick();
        assert.strictEqual(runs, 1);
        release();
        await scheduler.firstRun;
      } finally {
        scheduler.stop();
      }
    });
  });
});
