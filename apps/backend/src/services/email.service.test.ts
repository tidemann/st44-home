import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyBaseLogger } from 'fastify';

test('invitation is logged with acceptance link when SendGrid is off', async () => {
  const previousKey = process.env.SENDGRID_API_KEY;
  delete process.env.SENDGRID_API_KEY;
  try {
    assert.equal(process.env.SENDGRID_API_KEY, undefined);
    const { EmailService } = await import('./email.service.ts');
    const calls: [obj: { email: { acceptUrl: string; to: string } }, msg: string][] = [];
    const logger = {
      info: (obj: { email: { acceptUrl: string; to: string } }, msg: string) => {
        calls.push([obj, msg]);
      },
      warn: () => {},
      error: () => {},
    } as unknown as FastifyBaseLogger;

    const service = new EmailService(logger);
    await service.sendInvitationEmail('Kid@Example.com', {
      householdName: 'Hjem',
      inviterEmail: 'p@example.com',
      token: 'abc123',
      expiresAt: new Date(),
    });

    assert.equal(calls.length, 1);
    const [obj, msg] = calls[0];
    assert.match(msg, /\[EMAIL SIMULATION\] Invitation email/);
    assert.ok(obj.email.acceptUrl.endsWith('/invitations/accept/abc123'));
    assert.equal(obj.email.to, 'kid@example.com');
  } finally {
    if (previousKey === undefined) delete process.env.SENDGRID_API_KEY;
    else process.env.SENDGRID_API_KEY = previousKey;
  }
});
