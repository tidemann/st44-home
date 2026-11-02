import { test, describe, before, after, mock } from 'node:test';
import assert from 'node:assert';
import type { FastifyInstance } from 'fastify';
import { build } from '../server.ts';
import { redis } from '../core/redis.ts';

/**
 * The per-IP limits (scan 120/h, register 5/h, qr-login 20/h) count per visitor. nginx puts
 * the visitor's address in X-Forwarded-For; the backend trusts it from private-network peers
 * only, so two visitors are two buckets and not one shared by everyone behind nginx (ST-2114).
 */

/** Just enough of an ioredis pipeline (get, ttl, incr, expire) over a Map */
function fakePipeline(store: Map<string, number>) {
  const ops: Array<() => [null, unknown]> = [];
  const pipeline = {
    get(key: string) {
      ops.push(() => [null, store.has(key) ? String(store.get(key)) : null]);
      return pipeline;
    },
    ttl(key: string) {
      ops.push(() => [null, store.has(key) ? 3600 : -2]);
      return pipeline;
    },
    incr(key: string) {
      ops.push(() => {
        store.set(key, (store.get(key) ?? 0) + 1);
        return [null, store.get(key)];
      });
      return pipeline;
    },
    expire() {
      ops.push(() => [null, 1]);
      return pipeline;
    },
    async exec() {
      return ops.map((op) => op());
    },
  };
  return pipeline;
}

describe('per-IP rate limits see the visitor, not the proxy (ST-2114)', () => {
  let app: FastifyInstance;
  const store = new Map<string, number>();
  const status = redis.status;

  before(async () => {
    Object.defineProperty(redis, 'status', { value: 'ready', configurable: true });
    mock.method(redis, 'pipeline', () => fakePipeline(store));
    app = await build();
    await app.ready();
  });

  after(async () => {
    mock.restoreAll();
    Object.defineProperty(redis, 'status', { value: status, configurable: true, writable: true });
    await app.close();
  });

  const scan = (forwardedFor: string) =>
    app.inject({
      method: 'GET',
      url: '/api/scan/ZZZZZZ',
      // inject comes from 127.0.0.1, as nginx does from the docker network
      headers: { 'x-forwarded-for': forwardedFor },
    });

  test('two visitors behind nginx get separate buckets', async () => {
    store.set('ratelimit:scan:203.0.113.7', 120);

    const full = await scan('203.0.113.7');
    assert.strictEqual(full.statusCode, 429, full.body);

    const other = await scan('198.51.100.20');
    assert.strictEqual(other.statusCode, 404, other.body);
    assert.strictEqual(store.get('ratelimit:scan:198.51.100.20'), 1);
    assert.strictEqual(store.has('ratelimit:scan:127.0.0.1'), false);
  });

  test('an address a client put in front of the list is not trusted', async () => {
    // Only the right-most public address counts: a made-up one before it changes nothing
    const spoofed = await scan('10.9.9.9, 192.0.2.1, 203.0.113.7');
    assert.strictEqual(spoofed.statusCode, 429, spoofed.body);
  });
});
