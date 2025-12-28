/**
 * API Interaction Helpers for E2E Tests
 *
 * Direct API calls to set up test data or verify backend state
 */

import { Pool } from 'pg';

/**
 * Get API base URL from environment
 */
export function getApiBaseUrl(): string {
  const apiPort = process.env.BACKEND_PORT || '3001';
  const apiHost = process.env.BACKEND_HOST || 'localhost';
  return `http://${apiHost}:${apiPort}`;
}

/**
 * Make authenticated API request
 */
export interface ApiRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Register and login a user, returning auth tokens
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export async function createAuthenticatedUser(
  email: string,
  password: string,
): Promise<AuthenticatedUser> {
  // Register
  await apiRequest('/api/auth/register', {
    method: 'POST',
    body: { email, password },
  });

  // Login
  const loginResponse = await apiRequest<{
    userId: string;
    accessToken: string;
    refreshToken: string;
  }>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  return {
    userId: loginResponse.userId,
    email,
    accessToken: loginResponse.accessToken,
    refreshToken: loginResponse.refreshToken,
  };
}

/**
 * Create a household via API
 */
export interface ApiHousehold {
  id: string;
  name: string;
  role: string;
}

export async function createApiHousehold(name: string, token: string): Promise<ApiHousehold> {
  return apiRequest<ApiHousehold>('/api/households', {
    method: 'POST',
    body: { name },
    token,
  });
}

/**
 * Create a child via API
 */
export interface ApiChild {
  id: string;
  householdId: string;
  name: string;
  age: number | null;
  avatarUrl: string | null;
}

export async function createApiChild(
  householdId: string,
  name: string,
  age: number,
  token: string,
): Promise<ApiChild> {
  return apiRequest<ApiChild>(`/api/households/${householdId}/children`, {
    method: 'POST',
    body: { name, age },
    token,
  });
}

/**
 * Create a task via API
 */
export interface ApiTask {
  id: string;
  householdId: string;
  title: string;
  description: string | null;
  frequency: string;
  points: number;
}

export async function createApiTask(
  householdId: string,
  task: {
    title: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'once';
    points: number;
  },
  token: string,
): Promise<ApiTask> {
  return apiRequest<ApiTask>(`/api/households/${householdId}/tasks`, {
    method: 'POST',
    body: task,
    token,
  });
}

/**
 * Create complete test scenario via API
 */
export interface CompleteTestScenario {
  user: AuthenticatedUser;
  household: ApiHousehold;
  children: ApiChild[];
  tasks: ApiTask[];
}

export interface CreateScenarioOptions {
  email?: string;
  password?: string;
  householdName?: string;
  children?: Array<{ name: string; age: number }>;
  tasks?: Array<{
    title: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'once';
    points: number;
  }>;
}

export async function createCompleteScenario(
  options: CreateScenarioOptions = {},
): Promise<CompleteTestScenario> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);

  // Create and login user
  const user = await createAuthenticatedUser(
    options.email || `test-${timestamp}-${random}@example.com`,
    options.password || 'SecureTestPass123!',
  );

  // Create household
  const household = await createApiHousehold(
    options.householdName || `Test Household ${timestamp}`,
    user.accessToken,
  );

  // Create children
  const children: ApiChild[] = [];
  if (options.children) {
    for (const childData of options.children) {
      const child = await createApiChild(
        household.id,
        childData.name,
        childData.age,
        user.accessToken,
      );
      children.push(child);
    }
  }

  // Create tasks
  const tasks: ApiTask[] = [];
  if (options.tasks) {
    for (const taskData of options.tasks) {
      const task = await createApiTask(household.id, taskData, user.accessToken);
      tasks.push(task);
    }
  }

  return { user, household, children, tasks };
}

/**
 * Get database pool for direct queries
 */
export function getDbPool(): Pool {
  return new Pool({
    host: process.env.DB_HOST || 'host.docker.internal',
    port: parseInt(process.env.DB_PORT || '55432'),
    database: process.env.DB_NAME || 'st44_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });
}

/**
 * Query database directly
 */
export async function dbQuery<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const pool = getDbPool();
  try {
    const result = await pool.query(text, params);
    return result.rows as T[];
  } finally {
    await pool.end();
  }
}

/**
 * Verify user exists in database
 */
export async function verifyUserExists(email: string): Promise<boolean> {
  const rows = await dbQuery<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
  return rows.length > 0;
}

/**
 * Verify household exists in database
 */
export async function verifyHouseholdExists(householdId: string): Promise<boolean> {
  const rows = await dbQuery<{ id: string }>('SELECT id FROM households WHERE id = $1', [
    householdId,
  ]);
  return rows.length > 0;
}

/**
 * Get user ID by email
 */
export async function getUserIdByEmail(email: string): Promise<string | null> {
  const rows = await dbQuery<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
  return rows.length > 0 ? rows[0].id : null;
}
