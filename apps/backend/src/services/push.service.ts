import webpush from 'web-push';
import { db } from '../database.js';
import { ASSIGNMENT_TIME_ZONE, todayInTimeZone } from './assignment-scheduler.js';

/**
 * Web push (ST-623): stores browser subscriptions and sends the two messages
 * Diddit has today -- "due" to a child, "done" to the parents.
 *
 * VAPID keys come from the environment (GitHub secrets via the deploy). Without
 * them push is off: the config endpoint says so and nothing is sent.
 */

export interface PushPayload {
  title: string;
  body: string;
  /** Where a tap on the notification opens the app (path under /no/) */
  url: string;
  /** Same tag replaces an earlier notification instead of stacking */
  tag?: string;
}

export interface StoredSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

/** Sends one push message; throws with `statusCode` like web-push does */
export type PushSender = (
  subscription: StoredSubscription,
  payload: string,
  options: { TTL: number },
) => Promise<unknown>;

interface Queryable {
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

interface PushLogger {
  info(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
}

/** "Due" reminders go out from this Oslo time (30 min before the 17:00 default deadline) */
export const REMINDER_FROM = { hour: 16, minute: 30 };
/** ...and never from this Oslo time on (quiet hours 20:00-07:00) */
export const QUIET_FROM = { hour: 20, minute: 0 };

/** How long a push service keeps trying to deliver */
const DUE_TTL_SECONDS = 3 * 60 * 60;
const DONE_TTL_SECONDS = 12 * 60 * 60;

/** How often the reminder job looks for due chores */
const REMINDER_CHECK_MS = 5 * 60 * 1000;

const DEFAULT_SUBJECT = 'https://home.st44.no';

export function readPushConfig(env: NodeJS.ProcessEnv = process.env): PushConfig | null {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: env.VAPID_SUBJECT?.trim() || DEFAULT_SUBJECT };
}

function webPushSender(config: PushConfig): PushSender {
  return (subscription, payload, options) =>
    webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload,
      {
        TTL: options.TTL,
        vapidDetails: {
          subject: config.subject,
          publicKey: config.publicKey,
          privateKey: config.privateKey,
        },
      },
    );
}

export class PushService {
  private readonly sender: PushSender | null;

  constructor(
    private readonly config: PushConfig | null = readPushConfig(),
    private readonly database: Queryable = db,
    sender?: PushSender,
  ) {
    this.sender = sender ?? (config ? webPushSender(config) : null);
  }

  get enabled(): boolean {
    return this.config !== null && this.sender !== null;
  }

  get publicKey(): string | null {
    return this.config?.publicKey ?? null;
  }

  /** Saves (or moves to this user) the subscription of one browser */
  async saveSubscription(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent: string | null,
  ): Promise<void> {
    await this.database.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             p256dh = EXCLUDED.p256dh,
             auth = EXCLUDED.auth,
             user_agent = EXCLUDED.user_agent`,
      [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userAgent],
    );
  }

  /** Removes one browser's subscription; only the owner can remove it */
  async deleteSubscription(userId: string, endpoint: string): Promise<void> {
    await this.database.query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [userId, endpoint],
    );
  }

  /**
   * Sends to every browser of the given users. Subscriptions the push service
   * says are gone (404/410) are deleted; other failures skip that browser. Returns
   * how many messages were accepted, and throws only when none got through.
   */
  async sendToUsers(userIds: string[], payload: PushPayload, ttl: number): Promise<number> {
    if (!this.sender || userIds.length === 0) return 0;

    const { rows } = await this.database.query<StoredSubscription>(
      `SELECT id, endpoint, p256dh, auth
       FROM push_subscriptions
       WHERE user_id = ANY($1::uuid[])`,
      [userIds],
    );

    const body = JSON.stringify(payload);
    let sent = 0;
    let failure: unknown = null;
    for (const subscription of rows) {
      try {
        await this.sender(subscription, body, { TTL: ttl });
        sent++;
        await this.database.query(
          'UPDATE push_subscriptions SET last_success_at = NOW() WHERE id = $1',
          [subscription.id],
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await this.database.query('DELETE FROM push_subscriptions WHERE id = $1', [
            subscription.id,
          ]);
        } else {
          // One phone failing (push service down, bad key) must not stop the others
          failure = error;
        }
      }
    }
    // Report it when nothing got through, so the caller logs it
    if (sent === 0 && failure !== null) throw failure;
    return sent;
  }

  /** "Emma er ferdig" to the household's parents (not to whoever ticked it off) */
  async notifyAssignmentDone(assignmentId: string, completedByUserId?: string): Promise<number> {
    if (!this.enabled) return 0;

    const { rows } = await this.database.query<{
      child_name: string | null;
      task_name: string;
      points: number | null;
      parent_ids: string[] | null;
    }>(
      `SELECT c.name AS child_name,
              t.name AS task_name,
              t.points,
              ARRAY(
                SELECT hm.user_id FROM household_members hm
                WHERE hm.household_id = ta.household_id AND hm.role IN ('admin', 'parent')
              ) AS parent_ids
       FROM task_assignments ta
       JOIN tasks t ON t.id = ta.task_id
       LEFT JOIN children c ON c.id = ta.child_id
       WHERE ta.id = $1`,
      [assignmentId],
    );
    const row = rows[0];
    if (!row) return 0;

    const recipients = (row.parent_ids ?? []).filter((id) => id !== completedByUserId);
    const points = row.points ?? 0;
    const who = row.child_name ?? 'Noen';
    return this.sendToUsers(
      recipients,
      {
        title: `${who} er ferdig`,
        body: points > 0 ? `${row.task_name}, ${points} poeng` : row.task_name,
        url: 'home',
        tag: `done-${assignmentId}`,
      },
      DONE_TTL_SECONDS,
    );
  }

  /**
   * "Due" reminders for today's open chores, once per chore, sent between 16:30
   * and 20:00 Oslo time. Each child gets one message listing their open chores.
   * Only children who have a phone with notifications on are claimed, so a child
   * who turns them on at 17:00 still gets today's reminder.
   */
  async sendDueReminders(now: Date = new Date()): Promise<{ children: number; sent: number }> {
    if (!this.enabled || !isReminderTime(now)) return { children: 0, sent: 0 };

    const today = todayInTimeZone(now).toISOString().slice(0, 10);
    // Claim first, then send: a crash between the two loses a reminder rather
    // than sending it twice
    const { rows } = await this.database.query<{
      user_id: string;
      task_name: string;
      points: number | null;
    }>(
      `UPDATE task_assignments ta
       SET reminder_sent_at = NOW()
       FROM children c, tasks t
       WHERE c.id = ta.child_id
         AND t.id = ta.task_id
         AND ta.date = $1::date
         AND ta.status = 'pending'
         AND ta.reminder_sent_at IS NULL
         AND c.user_id IS NOT NULL
         AND EXISTS (SELECT 1 FROM push_subscriptions ps WHERE ps.user_id = c.user_id)
       RETURNING c.user_id, t.name AS task_name, t.points`,
      [today],
    );

    const byChild = new Map<string, string[]>();
    for (const row of rows) {
      const tasks = byChild.get(row.user_id) ?? [];
      tasks.push(row.task_name);
      byChild.set(row.user_id, tasks);
    }

    let sent = 0;
    let failure: unknown = null;
    for (const [userId, tasks] of byChild) {
      try {
        sent += await this.sendToUsers([userId], dueMessage(tasks, today), DUE_TTL_SECONDS);
      } catch (error) {
        failure = error;
      }
    }
    if (sent === 0 && failure !== null) throw failure;
    return { children: byChild.size, sent };
  }

  /** A test message to the user's own browsers (settings screen) */
  async sendTest(userId: string): Promise<number> {
    return this.sendToUsers(
      [userId],
      {
        title: 'Diddit',
        body: 'Varsler er på. Slik ser en påminnelse ut.',
        url: 'settings',
        tag: 'test',
      },
      60 * 60,
    );
  }
}

/** "Husk: Tøm oppvaskmaskinen" / "Du har 3 oppgaver igjen i dag: A, B og C" */
export function dueMessage(tasks: string[], date: string): PushPayload {
  const body =
    tasks.length === 1
      ? `Husk: ${tasks[0]}`
      : `Du har ${tasks.length} oppgaver igjen i dag: ${joinNorwegian(tasks)}`;
  return { title: 'Påminnelse', body, url: 'my-tasks', tag: `due-${date}` };
}

function joinNorwegian(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} og ${items[items.length - 1]}`;
}

/** Hours and minutes of `now` in Oslo */
export function osloClock(now: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ASSIGNMENT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { hour: get('hour'), minute: get('minute') };
}

export function isReminderTime(now: Date): boolean {
  const { hour, minute } = osloClock(now);
  const minutes = hour * 60 + minute;
  return (
    minutes >= REMINDER_FROM.hour * 60 + REMINDER_FROM.minute &&
    minutes < QUIET_FROM.hour * 60 + QUIET_FROM.minute
  );
}

/** Shared instance for the routes and the reminder job */
export const pushService = new PushService();

/**
 * Checks for due reminders every 5 minutes. The work is cheap outside 16:30-20:00
 * (no query at all).
 */
export function startReminderScheduler(
  logger: PushLogger,
  service: PushService = pushService,
  intervalMs: number = REMINDER_CHECK_MS,
): { stop: () => void; tick: () => Promise<void> } {
  let running = false;
  const tick = async () => {
    if (running || !service.enabled) return;
    running = true;
    try {
      const result = await service.sendDueReminders();
      if (result.children > 0) {
        logger.info({ dueReminders: result }, 'Due reminders sent');
      }
    } catch (err) {
      logger.error({ err }, 'Due reminders failed');
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  return { stop: () => clearInterval(timer), tick };
}
