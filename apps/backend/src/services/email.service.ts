import sgMail from '@sendgrid/mail';
import { FastifyBaseLogger } from 'fastify';

// Email service configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@diddit.com';
const APP_URL = process.env.APP_URL || 'http://localhost:4200';

// Initialize SendGrid
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Email templates
 */

interface InvitationEmailData {
  householdName: string;
  inviterEmail: string;
  token: string;
  expiresAt: Date;
}

interface PasswordResetEmailData {
  token: string;
  expiresAt: Date;
}

/**
 * Generate HTML email template for invitation
 */
function getInvitationHtmlTemplate(data: InvitationEmailData): string {
  const acceptUrl = `${APP_URL}/invitations/accept/${data.token}`;
  const declineUrl = `${APP_URL}/invitations/decline/${data.token}`;
  const expirationDate = new Date(data.expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to ${data.householdName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2563eb;
      font-size: 24px;
      margin-top: 0;
    }
    p {
      margin: 16px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      margin: 8px 8px 8px 0;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
    }
    .button-primary {
      background-color: #2563eb;
      color: white;
    }
    .button-secondary {
      background-color: #e5e7eb;
      color: #374151;
    }
    .expiration {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>You've been invited to join a household!</h1>

    <p><strong>${data.inviterEmail}</strong> has invited you to join the <strong>${data.householdName}</strong> household on Diddit.</p>

    <p>Diddit helps families manage chores and tasks together. By accepting this invitation, you'll be able to:</p>
    <ul>
      <li>View and manage household tasks</li>
      <li>Assign chores to family members</li>
      <li>Track completed tasks</li>
      <li>Collaborate with your household</li>
    </ul>

    <div class="expiration">
      <strong>Note:</strong> This invitation expires on ${expirationDate}.
    </div>

    <p>
      <a href="${acceptUrl}" class="button button-primary">Accept Invitation</a>
      <a href="${declineUrl}" class="button button-secondary">Decline</a>
    </p>

    <div class="footer">
      <p>This invitation was sent to you because ${data.inviterEmail} invited you to join their household on Diddit.</p>
      <p>If you didn't expect this invitation, you can safely ignore this email or click the decline button.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email template for invitation
 */
function getInvitationPlainTextTemplate(data: InvitationEmailData): string {
  const acceptUrl = `${APP_URL}/invitations/accept/${data.token}`;
  const declineUrl = `${APP_URL}/invitations/decline/${data.token}`;
  const expirationDate = new Date(data.expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
You've been invited to join a household!

${data.inviterEmail} has invited you to join the ${data.householdName} household on Diddit.

Diddit helps families manage chores and tasks together. By accepting this invitation, you'll be able to:
- View and manage household tasks
- Assign chores to family members
- Track completed tasks
- Collaborate with your household

IMPORTANT: This invitation expires on ${expirationDate}.

To accept this invitation, visit:
${acceptUrl}

To decline this invitation, visit:
${declineUrl}

---

This invitation was sent to you because ${data.inviterEmail} invited you to join their household on Diddit.

If you didn't expect this invitation, you can safely ignore this email or click the decline link above.
  `.trim();
}

/**
 * Generate HTML email template for password reset
 */
function getPasswordResetHtmlTemplate(data: PasswordResetEmailData): string {
  const resetUrl = `${APP_URL}/reset-password?token=${data.token}`;
  const expirationMinutes = Math.round((data.expiresAt.getTime() - Date.now()) / (1000 * 60));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2563eb;
      font-size: 24px;
      margin-top: 0;
    }
    p {
      margin: 16px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      margin: 16px 0;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      background-color: #2563eb;
      color: white;
    }
    .expiration {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Reset Your Password</h1>

    <p>You requested to reset your password for your Diddit account.</p>

    <p>Click the button below to reset your password:</p>

    <p>
      <a href="${resetUrl}" class="button">Reset Password</a>
    </p>

    <div class="expiration">
      <strong>Important:</strong> This link will expire in ${expirationMinutes} minutes.
    </div>

    <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>

    <div class="footer">
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email template for password reset
 */
function getPasswordResetPlainTextTemplate(data: PasswordResetEmailData): string {
  const resetUrl = `${APP_URL}/reset-password?token=${data.token}`;
  const expirationMinutes = Math.round((data.expiresAt.getTime() - Date.now()) / (1000 * 60));

  return `
Reset Your Password

You requested to reset your password for your Diddit account.

To reset your password, visit the following link:
${resetUrl}

IMPORTANT: This link will expire in ${expirationMinutes} minutes.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
  `.trim();
}

/**
 * Email service class
 */
export class EmailService {
  private logger: FastifyBaseLogger | undefined;

  constructor(logger?: FastifyBaseLogger) {
    this.logger = logger;
  }

  /**
   * Check if email service is configured
   */
  isConfigured(): boolean {
    return Boolean(SENDGRID_API_KEY);
  }

  /**
   * Send invitation email
   *
   * @param to - Recipient email address
   * @param data - Invitation data for template
   * @returns Promise that resolves when email is sent (or rejects on failure)
   */
  async sendInvitationEmail(to: string, data: InvitationEmailData): Promise<void> {
    // Check if email service is configured
    if (!this.isConfigured()) {
      const message = 'Email service not configured - SENDGRID_API_KEY missing';
      this.logger?.warn(message);
      throw new Error(message);
    }

    try {
      const msg = {
        to: to.toLowerCase(),
        from: FROM_EMAIL,
        subject: `You've been invited to join ${data.householdName} on Diddit`,
        html: getInvitationHtmlTemplate(data),
        text: getInvitationPlainTextTemplate(data),
      };

      await sgMail.send(msg);

      this.logger?.info(
        { to, householdName: data.householdName },
        'Invitation email sent successfully',
      );
    } catch (error) {
      // Log the error details
      this.logger?.error(
        { error, to, householdName: data.householdName },
        'Failed to send invitation email',
      );

      // Re-throw so caller can handle appropriately
      throw new Error(
        `Failed to send invitation email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Send invitation email with graceful failure handling
   * Logs errors but doesn't throw - suitable for non-critical email sending
   *
   * @param to - Recipient email address
   * @param data - Invitation data for template
   * @returns Promise<boolean> - true if sent successfully, false if failed
   */
  async sendInvitationEmailSafe(to: string, data: InvitationEmailData): Promise<boolean> {
    try {
      await this.sendInvitationEmail(to, data);
      return true;
    } catch (error) {
      // Error already logged by sendInvitationEmail
      // Don't throw - just return failure status
      return false;
    }
  }

  /**
   * Send password reset email
   *
   * @param to - Recipient email address
   * @param data - Password reset data for template
   * @returns Promise that resolves when email is sent (or rejects on failure)
   */
  async sendPasswordResetEmail(to: string, data: PasswordResetEmailData): Promise<void> {
    // In development/test without SendGrid, log email to console instead
    if (!this.isConfigured()) {
      const resetUrl = `${APP_URL}/reset-password?token=${data.token}`;
      const message = {
        to: to.toLowerCase(),
        subject: 'Reset Your Diddit Password',
        resetUrl,
        expiresAt: data.expiresAt,
      };

      this.logger?.info(
        { email: message },
        '[EMAIL SIMULATION] Password reset email (SendGrid not configured)',
      );

      // In development, we can still function without actually sending emails
      console.log('\n=== PASSWORD RESET EMAIL (SIMULATION) ===');
      console.log(`To: ${message.to}`);
      console.log(`Subject: ${message.subject}`);
      console.log(`Reset URL: ${message.resetUrl}`);
      console.log(`Expires: ${message.expiresAt.toISOString()}`);
      console.log('=========================================\n');

      return; // Success - email "sent" via console
    }

    try {
      const msg = {
        to: to.toLowerCase(),
        from: FROM_EMAIL,
        subject: 'Reset Your Diddit Password',
        html: getPasswordResetHtmlTemplate(data),
        text: getPasswordResetPlainTextTemplate(data),
      };

      await sgMail.send(msg);

      this.logger?.info({ to }, 'Password reset email sent successfully');
    } catch (error) {
      // Log the error details
      this.logger?.error({ error, to }, 'Failed to send password reset email');

      // Re-throw so caller can handle appropriately
      throw new Error(
        `Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Send password reset email with graceful failure handling
   * Logs errors but doesn't throw - suitable for non-critical email sending
   *
   * @param to - Recipient email address
   * @param data - Password reset data for template
   * @returns Promise<boolean> - true if sent successfully, false if failed
   */
  async sendPasswordResetEmailSafe(to: string, data: PasswordResetEmailData): Promise<boolean> {
    try {
      await this.sendPasswordResetEmail(to, data);
      return true;
    } catch (error) {
      // Error already logged by sendPasswordResetEmail
      // Don't throw - just return failure status
      return false;
    }
  }
}

/**
 * Singleton email service instance
 */
let emailServiceInstance: EmailService | undefined;

/**
 * Get or create email service instance
 */
export function getEmailService(logger?: FastifyBaseLogger): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService(logger);
  }
  return emailServiceInstance;
}
