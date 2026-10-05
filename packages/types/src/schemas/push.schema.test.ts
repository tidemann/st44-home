import { describe, it, expect } from 'vitest';
import { PushSubscriptionRequestSchema, PushUnsubscribeRequestSchema } from './push.schema.js';

describe('PushSubscriptionRequestSchema', () => {
  const valid = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    keys: { p256dh: 'BOr8kL', auth: 'k3y' },
  };

  it('accepts a browser subscription', () => {
    expect(PushSubscriptionRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a non-https endpoint', () => {
    const result = PushSubscriptionRequestSchema.safeParse({
      ...valid,
      endpoint: 'http://push.example.com/x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing keys', () => {
    expect(
      PushSubscriptionRequestSchema.safeParse({ endpoint: valid.endpoint, keys: { p256dh: 'x' } })
        .success,
    ).toBe(false);
  });
});

describe('PushUnsubscribeRequestSchema', () => {
  it('needs an endpoint URL', () => {
    expect(PushUnsubscribeRequestSchema.safeParse({ endpoint: 'nope' }).success).toBe(false);
    expect(
      PushUnsubscribeRequestSchema.safeParse({ endpoint: 'https://push.example.com/x' }).success,
    ).toBe(true);
  });
});
