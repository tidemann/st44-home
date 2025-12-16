/**
 * Test Fixtures
 *
 * Factory functions for creating test data in the database.
 * All fixtures return the created entity with its ID for further operations.
 */

import bcrypt from 'bcrypt';
import { getTestPool } from './database.ts';

/**
 * User fixture data
 */
export interface TestUser {
  id: string;
  email: string;
  password_hash: string;
  google_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTestUserOptions {
  email?: string;
  password?: string;
  googleId?: string;
}

/**
 * Create a test user
 */
export async function createTestUser(options: CreateTestUserOptions = {}): Promise<TestUser> {
  const pool = getTestPool();
  const email =
    options.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = options.password ?? 'Test1234!';
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query<TestUser>(
    `INSERT INTO users (email, password_hash, google_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [email, passwordHash, options.googleId ?? null],
  );

  return result.rows[0];
}

/**
 * Household fixture data
 */
export interface TestHousehold {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTestHouseholdOptions {
  name?: string;
  ownerId?: string;
}

/**
 * Create a test household with an owner
 */
export async function createTestHousehold(
  options: CreateTestHouseholdOptions = {},
): Promise<{ household: TestHousehold; owner: TestUser }> {
  const pool = getTestPool();

  // Create owner if not provided
  let owner: TestUser;
  if (options.ownerId) {
    const result = await pool.query<TestUser>('SELECT * FROM users WHERE id = $1', [
      options.ownerId,
    ]);
    owner = result.rows[0];
    if (!owner) throw new Error(`User not found: ${options.ownerId}`);
  } else {
    owner = await createTestUser();
  }

  const name = options.name ?? `Test Household ${Date.now()}`;

  // Create household
  const householdResult = await pool.query<TestHousehold>(
    `INSERT INTO households (name) VALUES ($1) RETURNING *`,
    [name],
  );
  const household = householdResult.rows[0];

  // Add owner as member with 'owner' role
  await pool.query(
    `INSERT INTO household_members (household_id, user_id, role)
     VALUES ($1, $2, 'owner')`,
    [household.id, owner.id],
  );

  return { household, owner };
}

/**
 * Household member fixture data
 */
export interface TestHouseholdMember {
  household_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: Date;
}

export interface AddHouseholdMemberOptions {
  householdId: string;
  userId?: string;
  role?: 'owner' | 'admin' | 'member';
}

/**
 * Add a member to a household
 */
export async function addHouseholdMember(
  options: AddHouseholdMemberOptions,
): Promise<{ member: TestHouseholdMember; user: TestUser }> {
  const pool = getTestPool();

  // Create user if not provided
  let user: TestUser;
  if (options.userId) {
    const result = await pool.query<TestUser>('SELECT * FROM users WHERE id = $1', [
      options.userId,
    ]);
    user = result.rows[0];
    if (!user) throw new Error(`User not found: ${options.userId}`);
  } else {
    user = await createTestUser();
  }

  const role = options.role ?? 'member';

  const result = await pool.query<TestHouseholdMember>(
    `INSERT INTO household_members (household_id, user_id, role)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [options.householdId, user.id, role],
  );

  return { member: result.rows[0], user };
}

/**
 * Child fixture data
 */
export interface TestChild {
  id: string;
  household_id: string;
  name: string;
  age: number | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTestChildOptions {
  householdId: string;
  name?: string;
  age?: number;
  avatarUrl?: string;
}

/**
 * Create a test child in a household
 */
export async function createTestChild(options: CreateTestChildOptions): Promise<TestChild> {
  const pool = getTestPool();

  const name = options.name ?? `Test Child ${Date.now()}`;
  const age = options.age ?? 10;

  const result = await pool.query<TestChild>(
    `INSERT INTO children (household_id, name, age, avatar_url)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [options.householdId, name, age, options.avatarUrl ?? null],
  );

  return result.rows[0];
}

/**
 * Task fixture data
 */
export interface TestTask {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  frequency: string;
  points: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTestTaskOptions {
  householdId: string;
  title?: string;
  description?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'once';
  points?: number;
}

/**
 * Create a test task in a household
 */
export async function createTestTask(options: CreateTestTaskOptions): Promise<TestTask> {
  const pool = getTestPool();

  const title = options.title ?? `Test Task ${Date.now()}`;
  const frequency = options.frequency ?? 'daily';
  const points = options.points ?? 10;

  const result = await pool.query<TestTask>(
    `INSERT INTO tasks (household_id, title, description, frequency, points)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [options.householdId, title, options.description ?? null, frequency, points],
  );

  return result.rows[0];
}

/**
 * Task assignment fixture data
 */
export interface TestTaskAssignment {
  id: string;
  task_id: string;
  child_id: string;
  due_date: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTestTaskAssignmentOptions {
  taskId: string;
  childId: string;
  dueDate?: Date;
  status?: 'pending' | 'completed' | 'skipped';
}

/**
 * Create a test task assignment
 */
export async function createTestTaskAssignment(
  options: CreateTestTaskAssignmentOptions,
): Promise<TestTaskAssignment> {
  const pool = getTestPool();

  const dueDate = options.dueDate ?? new Date();
  const status = options.status ?? 'pending';

  const result = await pool.query<TestTaskAssignment>(
    `INSERT INTO task_assignments (task_id, child_id, due_date, status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [options.taskId, options.childId, dueDate, status],
  );

  return result.rows[0];
}

/**
 * Invitation fixture data
 */
export interface TestInvitation {
  id: string;
  household_id: string;
  email: string;
  token: string;
  status: string;
  expires_at: Date;
  created_at: Date;
}

export interface CreateTestInvitationOptions {
  householdId: string;
  email?: string;
  invitedById: string;
  role?: 'admin' | 'member';
  expiresIn?: number; // hours
}

/**
 * Create a test invitation
 */
export async function createTestInvitation(
  options: CreateTestInvitationOptions,
): Promise<TestInvitation> {
  const pool = getTestPool();

  const email = options.email ?? `invite-${Date.now()}@example.com`;
  const token = `test-token-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const role = options.role ?? 'member';
  const expiresAt = new Date(Date.now() + (options.expiresIn ?? 24) * 60 * 60 * 1000);

  const result = await pool.query<TestInvitation>(
    `INSERT INTO invitations (household_id, email, token, role, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [options.householdId, email, token, role, options.invitedById, expiresAt],
  );

  return result.rows[0];
}

/**
 * Create a complete test setup with a user, household, and optionally children
 */
export interface CompleteTestSetup {
  user: TestUser;
  household: TestHousehold;
  children: TestChild[];
}

export interface CreateCompleteTestSetupOptions {
  childrenCount?: number;
  householdName?: string;
  userEmail?: string;
}

/**
 * Create a complete test setup for integration tests
 */
export async function createCompleteTestSetup(
  options: CreateCompleteTestSetupOptions = {},
): Promise<CompleteTestSetup> {
  const { household, owner } = await createTestHousehold({
    name: options.householdName,
  });

  const children: TestChild[] = [];
  const childrenCount = options.childrenCount ?? 0;

  for (let i = 0; i < childrenCount; i++) {
    const child = await createTestChild({
      householdId: household.id,
      name: `Test Child ${i + 1}`,
      age: 8 + i,
    });
    children.push(child);
  }

  return { user: owner, household, children };
}

/**
 * Generate a unique test email
 */
export function generateTestEmail(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

/**
 * Generate a unique test name
 */
export function generateTestName(prefix = 'Test'): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
