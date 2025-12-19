import { Pool } from 'pg';

/**
 * Reset the test database by truncating all tables
 * Uses CASCADE to handle foreign key constraints
 */
export async function resetTestDatabase(): Promise<void> {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'), // Local E2E: 5433, GitHub Actions: 55432
    database: process.env.DB_NAME || 'st44_test_local', // Local E2E: st44_test_local, GitHub Actions: st44_test
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    // Truncate all tables with CASCADE to handle foreign keys
    await pool.query(`
      TRUNCATE TABLE
        users,
        households,
        household_members,
        children,
        tasks,
        task_assignments,
        task_completions
      RESTART IDENTITY CASCADE
    `);
  } finally {
    await pool.end();
  }
}

/**
 * Create a test user via the API
 * Returns the response with user data and tokens
 */
export async function createTestUser(
  email: string,
  password: string,
): Promise<{ id: number; email: string; accessToken: string; refreshToken: string }> {
  // Use environment variable or default to GitHub Actions port (3000) or local port (3001)
  const apiPort = process.env.BACKEND_PORT || '3000';
  const apiHost = process.env.BACKEND_HOST || 'localhost';
  const response = await fetch(`http://${apiHost}:${apiPort}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create test user: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/**
 * Generate a unique test email address
 * Format: test-{timestamp}-{random}@example.com
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${timestamp}-${random}@example.com`;
}

/**
 * Generate a secure test password
 * Meets validation requirements (length, complexity)
 */
export function generateTestPassword(): string {
  return 'SecureTestPass123!';
}

/**
 * Wait for a condition to be true with timeout
 * Useful for waiting on async operations
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 100,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
}
