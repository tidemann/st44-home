import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  PushService,
  dueMessage,
  isReminderTime,
  readPushConfig,
  startReminderScheduler,
  type PushConfig,
  type PushSender,
  type StoredSubscription,
} from './push.service.js';

/**
 * Push Service Unit Tests (no database, no push service)
 */

const CONFIG: PushConfig = { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:x@y.no' };

type Row = Record<string, unknown>;

/** Answers queries by the first matching SQL fragment and records every call */
function fakeDb(answers: Array<[string, Row[]]> = []) {
  const calls: { text: string; values?: unknown[] }[] = [];
  return {
    calls,
    async query<T>(text: string, values?: unknown[]): Promise<{ rows: T[] }> {
      calls.push({ text, values });
      const match = answers.find(([fragment]) => text.includes(fragment));
      return { rows: (match ? match[1] : []) as T[] };
    },
  };
}

function fakeSender(fail: Record<string, number> = {}) {
  const sent: { endpoint: string; payload: Row; ttl: number }[] = [];
  const sender: PushSender = async (subscription: StoredSubscription, payload, options) => {
    const status = fail[subscription.endpoint];
    if (status) throw Object.assign(new Error('push failed'), { statusCode: status });
    sent.push({ endpoint: subscription.endpoint, payload: JSON.parse(payload), ttl: options.TTL });
  };
  return { sent, sender };
}

const sub = (id: string): StoredSubscription => ({
  id,
  endpoint: `https://push.example/${id}`,
  p256dh: 'k',
  auth: 'a',
});

// 2026-10-05 is CEST (UTC+2)
const at = (osloTime: string) => new Date(`2026-10-05T${osloTime}:00+02:00`);

describe('Push Service', () => {
  describe('readPushConfig', () => {
    test('is off without both VAPID keys', () => {
      assert.strictEqual(readPushConfig({}), null);
      assert.strictEqual(readPushConfig({ VAPID_PUBLIC_KEY: 'p' }), null);
      assert.strictEqual(readPushConfig({ VAPID_PUBLIC_KEY: ' ', VAPID_PRIVATE_KEY: 'x' }), null);
    });

    test('reads the keys and defaults the subject to the site', () => {
      assert.deepStrictEqual(readPushConfig({ VAPID_PUBLIC_KEY: 'p', VAPID_PRIVATE_KEY: 's' }), {
        publicKey: 'p',
        privateKey: 's',
        subject: 'https://home.st44.no',
      });
    });
  });

  describe('enabled', () => {
    test('a service without config sends nothing', async () => {
      const db = fakeDb();
      const service = new PushService(null, db);
      assert.strictEqual(service.enabled, false);
      assert.strictEqual(service.publicKey, null);
      assert.strictEqual(await service.notifyAssignmentDone('a1'), 0);
      assert.deepStrictEqual(await service.sendDueReminders(at('17:00')), { children: 0, sent: 0 });
      assert.strictEqual(db.calls.length, 0);
    });
  });

  describe('saveSubscription / deleteSubscription', () => {
    test('upserts on the endpoint, so a phone moves to the user who turned push on', async () => {
      const db = fakeDb();
      const service = new PushService(CONFIG, db, fakeSender().sender);
      await service.saveSubscription(
        'u1',
        { endpoint: 'https://push.example/1', keys: { p256dh: 'k', auth: 'a' } },
        'Safari',
      );
      assert.match(db.calls[0].text, /ON CONFLICT \(endpoint\) DO UPDATE/);
      assert.deepStrictEqual(db.calls[0].values, [
        'u1',
        'https://push.example/1',
        'k',
        'a',
        'Safari',
      ]);
    });

    test('only deletes the caller’s own subscription', async () => {
      const db = fakeDb();
      await new PushService(CONFIG, db).deleteSubscription('u1', 'https://push.example/1');
      assert.match(db.calls[0].text, /WHERE user_id = \$1 AND endpoint = \$2/);
    });
  });

  describe('sendToUsers', () => {
    test('sends to every browser and drops subscriptions that are gone', async () => {
      const db = fakeDb([['FROM push_subscriptions', [sub('a'), sub('b'), sub('c')]]]);
      const { sent, sender } = fakeSender({ 'https://push.example/b': 410 });
      const service = new PushService(CONFIG, db, sender);

      const count = await service.sendToUsers(['u1'], { title: 't', body: 'b', url: 'home' }, 60);

      assert.strictEqual(count, 2);
      assert.deepStrictEqual(
        sent.map((s) => s.endpoint),
        ['https://push.example/a', 'https://push.example/c'],
      );
      const deleted = db.calls.find((c) => c.text.startsWith('DELETE FROM push_subscriptions'));
      assert.deepStrictEqual(deleted?.values, ['b']);
    });

    test('one failing phone does not stop the others, and is kept', async () => {
      const db = fakeDb([['FROM push_subscriptions', [sub('a'), sub('b')]]]);
      const { sent, sender } = fakeSender({ 'https://push.example/a': 500 });
      const service = new PushService(CONFIG, db, sender);

      const count = await service.sendToUsers(['u1'], { title: 't', body: 'b', url: 'home' }, 60);

      assert.strictEqual(count, 1);
      assert.deepStrictEqual(
        sent.map((s) => s.endpoint),
        ['https://push.example/b'],
      );
      assert.ok(!db.calls.some((c) => c.text.startsWith('DELETE')));
    });

    test('throws when nothing got through, so the caller logs it', async () => {
      const db = fakeDb([['FROM push_subscriptions', [sub('a')]]]);
      const service = new PushService(
        CONFIG,
        db,
        fakeSender({ 'https://push.example/a': 500 }).sender,
      );
      await assert.rejects(service.sendToUsers(['u1'], { title: 't', body: 'b', url: 'home' }, 60));
    });
  });

  describe('notifyAssignmentDone', () => {
    test('tells the parents, but not the parent who ticked it off', async () => {
      const db = fakeDb([
        [
          'FROM task_assignments ta',
          [
            {
              child_name: 'Emma',
              task_name: 'Tøm oppvaskmaskinen',
              points: 10,
              parent_ids: ['mum', 'dad'],
            },
          ],
        ],
        ['FROM push_subscriptions', [sub('mum-phone')]],
      ]);
      const { sent, sender } = fakeSender();
      const service = new PushService(CONFIG, db, sender);

      await service.notifyAssignmentDone('a1', 'dad');

      const lookup = db.calls.find((c) => c.text.includes('FROM push_subscriptions'));
      assert.deepStrictEqual(lookup?.values, [['mum']]);
      assert.deepStrictEqual(sent[0].payload, {
        title: 'Emma er ferdig',
        body: 'Tøm oppvaskmaskinen, 10 poeng',
        url: 'home',
        tag: 'done-a1',
      });
    });

    test('does nothing for an unknown assignment', async () => {
      const { sent, sender } = fakeSender();
      assert.strictEqual(
        await new PushService(CONFIG, fakeDb(), sender).notifyAssignmentDone('x'),
        0,
      );
      assert.strictEqual(sent.length, 0);
    });
  });

  describe('due reminders', () => {
    test('reminder window is 16:30 to 20:00 Oslo time', () => {
      assert.strictEqual(isReminderTime(at('16:29')), false);
      assert.strictEqual(isReminderTime(at('16:30')), true);
      assert.strictEqual(isReminderTime(at('19:59')), true);
      assert.strictEqual(isReminderTime(at('20:00')), false);
      assert.strictEqual(isReminderTime(at('07:30')), false);
    });

    test('follows Oslo winter time too (CET, UTC+1)', () => {
      // 2026-12-01 15:45 UTC = 16:45 in Oslo
      assert.strictEqual(isReminderTime(new Date('2026-12-01T15:45:00Z')), true);
      assert.strictEqual(isReminderTime(new Date('2026-12-01T15:15:00Z')), false);
    });

    test('outside the window nothing is claimed', async () => {
      const db = fakeDb();
      await new PushService(CONFIG, db, fakeSender().sender).sendDueReminders(at('12:00'));
      assert.strictEqual(db.calls.length, 0);
    });

    test('claims today’s open chores once and sends one message per child', async () => {
      const db = fakeDb([
        [
          'UPDATE task_assignments',
          [
            { user_id: 'emma', task_name: 'Tøm oppvaskmaskinen', points: 10 },
            { user_id: 'emma', task_name: 'Re opp sengen', points: 5 },
            { user_id: 'ola', task_name: 'Mat katten', points: 5 },
          ],
        ],
        ['FROM push_subscriptions', [sub('phone')]],
      ]);
      const { sent, sender } = fakeSender();
      const service = new PushService(CONFIG, db, sender);

      const result = await service.sendDueReminders(at('16:35'));

      const claim = db.calls[0];
      assert.match(claim.text, /reminder_sent_at IS NULL/);
      assert.match(claim.text, /ta.status = 'pending'/);
      assert.deepStrictEqual(claim.values, ['2026-10-05']);
      assert.deepStrictEqual(result, { children: 2, sent: 2 });
      assert.deepStrictEqual(sent[0].payload, {
        title: 'Påminnelse',
        body: 'Du har 2 oppgaver igjen i dag: Tøm oppvaskmaskinen og Re opp sengen',
        url: 'my-tasks',
        tag: 'due-2026-10-05',
      });
      assert.strictEqual(sent[1].payload.body, 'Husk: Mat katten');
    });

    test('Norwegian list joining', () => {
      assert.strictEqual(
        dueMessage(['A', 'B', 'C'], '2026-10-05').body,
        'Du har 3 oppgaver igjen i dag: A, B og C',
      );
    });
  });

  describe('remindAssignment ("Påminn nå")', () => {
    const open = {
      status: 'pending',
      child_user_id: 'emma',
      task_name: 'Gå på do',
      is_parent: true,
    };

    test('sends the due reminder for one chore to the child now', async () => {
      const db = fakeDb([
        ['FROM task_assignments ta', [open]],
        ['FROM push_subscriptions', [sub('emma-phone')]],
      ]);
      const { sent, sender } = fakeSender();
      const service = new PushService(CONFIG, db, sender);

      assert.strictEqual(await service.remindAssignment('a1', 'dad', at('12:15')), 1);

      assert.deepStrictEqual(db.calls[0].values, ['a1', 'dad']);
      const lookup = db.calls.find((c) => c.text.includes('FROM push_subscriptions'));
      assert.deepStrictEqual(lookup?.values, [['emma']]);
      assert.deepStrictEqual(sent[0].payload, {
        title: 'Påminnelse',
        body: 'Husk: Gå på do',
        url: 'my-tasks',
        tag: 'due-2026-10-05',
      });
      // The 16:30 job still runs for this chore
      assert.ok(!db.calls.some((c) => c.text.includes('reminder_sent_at')));
    });

    test('returns 0 when the child has no login to send to', async () => {
      const db = fakeDb([['FROM task_assignments ta', [{ ...open, child_user_id: null }]]]);
      const { sent, sender } = fakeSender();
      assert.strictEqual(
        await new PushService(CONFIG, db, sender).remindAssignment('a1', 'dad', at('12:15')),
        0,
      );
      assert.strictEqual(sent.length, 0);
    });

    const remind = (row: Row | null, time = '12:15', fail: Record<string, number> = {}) =>
      new PushService(
        CONFIG,
        fakeDb([
          ['FROM task_assignments ta', row ? [row] : []],
          ['FROM push_subscriptions', [sub('phone'), sub('tablet')]],
        ]),
        fakeSender(fail).sender,
      ).remindAssignment('a1', 'u1', at(time));

    test('refuses unknown chores, non-parents and done chores', async () => {
      await assert.rejects(remind(null), { statusCode: 404 });
      await assert.rejects(remind({ ...open, is_parent: false }), { statusCode: 403 });
      await assert.rejects(remind({ ...open, status: 'completed' }), { statusCode: 409 });
    });

    // ST-691: Stig tapped it at 20:30 and nothing went out
    test('reaches every phone at any hour, quiet hours included', async () => {
      for (const time of ['20:00', '20:30', '23:59', '03:00', '06:59', '07:00', '12:15']) {
        assert.strictEqual(await remind(open, time), 2, time);
      }
    });

    test('reports a push service failure as its own 500, not the push status', async () => {
      // 403 is what a VAPID key mismatch looks like; it must not become this route's 403
      await assert.rejects(
        remind(open, '12:15', {
          'https://push.example/phone': 403,
          'https://push.example/tablet': 403,
        }),
        (error: { statusCode: number; details: Row }) => {
          assert.strictEqual(error.statusCode, 500);
          assert.deepStrictEqual(error.details, { reason: 'pushFailed', pushStatus: 403 });
          return true;
        },
      );
    });

    test('one phone failing still counts the other', async () => {
      assert.strictEqual(await remind(open, '12:15', { 'https://push.example/phone': 500 }), 1);
    });

    test('phones that unsubscribed (404/410) mean nothing was sent, not an error', async () => {
      assert.strictEqual(
        await remind(open, '12:15', {
          'https://push.example/phone': 410,
          'https://push.example/tablet': 404,
        }),
        0,
      );
    });
  });

  describe('startReminderScheduler', () => {
    test('logs failures and keeps going', async () => {
      const lines: string[] = [];
      const logger = {
        info: (_o: object, msg: string) => lines.push(`info ${msg}`),
        error: (_o: object, msg: string) => lines.push(`error ${msg}`),
      };
      const service = new PushService(CONFIG, fakeDb(), fakeSender().sender);
      service.sendDueReminders = async () => {
        throw new Error('db down');
      };
      const scheduler = startReminderScheduler(logger, service, 60_000);
      await scheduler.tick();
      scheduler.stop();
      assert.deepStrictEqual(lines, ['error Due reminders failed']);
    });
  });
});
