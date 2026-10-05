/**
 * Push Schema - Web push notifications (ST-623)
 */
import { z } from '../generators/openapi.generator.js';

/**
 * Push config: whether the server can send push, and the VAPID public key the
 * browser needs to subscribe
 */
export const PushConfigResponseSchema = z.object({
  enabled: z.boolean(),
  publicKey: z.string().nullable(),
});

export type PushConfigResponse = z.infer<typeof PushConfigResponseSchema>;

/**
 * A browser's PushSubscription as returned by PushSubscription.toJSON()
 */
export const PushSubscriptionRequestSchema = z.object({
  endpoint: z
    .string()
    .url()
    .max(2048)
    .refine((value) => value.startsWith('https://'), 'Push endpoint must use https'),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export type PushSubscriptionRequest = z.infer<typeof PushSubscriptionRequestSchema>;

/**
 * Turn push off for one browser
 */
export const PushUnsubscribeRequestSchema = z.object({
  endpoint: z.string().url().max(2048),
});

export type PushUnsubscribeRequest = z.infer<typeof PushUnsubscribeRequestSchema>;

/**
 * Result of a test notification
 */
export const PushTestResponseSchema = z.object({
  sent: z.number().int().min(0),
});

export type PushTestResponse = z.infer<typeof PushTestResponseSchema>;
