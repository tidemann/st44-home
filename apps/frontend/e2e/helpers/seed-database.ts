import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcrypt';

/**
 * Create a connection pool for test database operations
 * Uses environment variables with fallbacks for local E2E testing
 */
function createPool(): Pool {
  return new Pool({
    host: process.env.E2E_DB_HOST || 'localhost',
    port: parseInt(process.env.E2E_DB_PORT || '55432', 10),
    database: process.env.E2E_DB_NAME || 'st44_test',
    user: process.env.E2E_DB_USER || 'postgres',
    password: process.env.E2E_DB_PASSWORD || 'postgres',
  });
}

/**
 * Execute a function within a database transaction
 * Automatically commits on success, rolls back on error
 */
async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * Create a test user with hashed password
 *
 * @param data User data (email, password, name optional)
 * @returns Created user ID and email
 *
 * @example
 * ```typescript
 * const user = await seedTestUser({
 *   email: 'test@example.com',
 *   password: 'SecurePass123!',
 *   name: 'Test User'
 * });
 * console.log(user.userId); // Use in tests
 * ```
 */
export async function seedTestUser(data: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ userId: string; email: string }> {
  return withTransaction(async (client) => {
    // Hash password with bcrypt (same as production)
    const passwordHash = await bcrypt.hash(data.password, 10);

    const result = await client.query(
      `INSERT INTO users (email, password_hash, name, provider, created_at, updated_at)
       VALUES ($1, $2, $3, 'email', NOW(), NOW())
       RETURNING id, email`,
      [data.email, passwordHash, data.name || null],
    );

    return {
      userId: result.rows[0].id,
      email: result.rows[0].email,
    };
  });
}

/**
 * Create a test household with owner as member
 *
 * @param data Household data (name, ownerId)
 * @returns Created household ID and name
 *
 * @example
 * ```typescript
 * const user = await seedTestUser({ email: '...', password: '...' });
 * const household = await seedTestHousehold({
 *   name: 'Test Family',
 *   ownerId: user.userId
 * });
 * ```
 */
export async function seedTestHousehold(data: {
  name: string;
  ownerId: string;
}): Promise<{ householdId: string; name: string }> {
  return withTransaction(async (client) => {
    // Create household
    const householdResult = await client.query(
      `INSERT INTO households (name, created_at, updated_at)
       VALUES ($1, NOW(), NOW())
       RETURNING id, name`,
      [data.name],
    );

    const householdId = householdResult.rows[0].id;

    // Add owner as parent member
    await client.query(
      `INSERT INTO household_members (household_id, user_id, role, joined_at)
       VALUES ($1, $2, 'parent', NOW())`,
      [householdId, data.ownerId],
    );

    return {
      householdId,
      name: householdResult.rows[0].name,
    };
  });
}

/**
 * Add a member to an existing household
 *
 * @param data Membership data (householdId, userId, role)
 * @returns Created member ID
 *
 * @example
 * ```typescript
 * const member = await addHouseholdMember({
 *   householdId: household.householdId,
 *   userId: otherUser.userId,
 *   role: 'parent'
 * });
 * ```
 */
export async function addHouseholdMember(data: {
  householdId: string;
  userId: string;
  role: 'parent' | 'child';
}): Promise<{ memberId: string }> {
  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO household_members (household_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [data.householdId, data.userId, data.role],
    );

    return {
      memberId: result.rows[0].id,
    };
  });
}

/**
 * Create a child in a household
 *
 * @param data Child data (householdId, name, age)
 * @returns Created child ID and name
 *
 * @example
 * ```typescript
 * const child = await seedTestChild({
 *   householdId: household.householdId,
 *   name: 'Emma',
 *   age: 8
 * });
 * ```
 */
export async function seedTestChild(data: {
  householdId: string;
  name: string;
  age: number;
}): Promise<{ childId: string; name: string }> {
  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO children (household_id, name, age, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, name`,
      [data.householdId, data.name, data.age],
    );

    return {
      childId: result.rows[0].id,
      name: result.rows[0].name,
    };
  });
}

/**
 * Create multiple tasks for a household
 *
 * @param data Task data (householdId, tasks array)
 * @returns Array of created task IDs
 *
 * @example
 * ```typescript
 * const tasks = await seedTestTasks({
 *   householdId: household.householdId,
 *   tasks: [
 *     { name: 'Clean Room', description: 'Make bed and organize' },
 *     { name: 'Do Homework', description: 'Math and reading' }
 *   ]
 * });
 * ```
 */
export async function seedTestTasks(data: {
  householdId: string;
  tasks: Array<{
    name: string;
    description?: string;
    assignmentRule?: string;
  }>;
}): Promise<{ taskIds: string[] }> {
  return withTransaction(async (client) => {
    const taskIds: string[] = [];

    for (const task of data.tasks) {
      const result = await client.query(
        `INSERT INTO tasks (household_id, name, description, assignment_rule, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id`,
        [data.householdId, task.name, task.description || null, task.assignmentRule || 'manual'],
      );

      taskIds.push(result.rows[0].id);
    }

    return { taskIds };
  });
}

/**
 * Reset the test database to a clean state
 * Truncates all tables and restarts identity sequences
 *
 * @example
 * ```typescript
 * // In test setup or beforeEach
 * await resetDatabase();
 * ```
 */
export async function resetDatabase(): Promise<void> {
  const pool = createPool();

  try {
    // Truncate all tables with CASCADE to handle foreign keys
    // Order doesn't matter with CASCADE, but listed in logical order
    await pool.query(`
      TRUNCATE TABLE 
        task_completions,
        task_assignments,
        tasks,
        children,
        household_members,
        households,
        users
      RESTART IDENTITY CASCADE
    `);
  } finally {
    await pool.end();
  }
}

/**
 * Seed a complete test scenario with user, household, children, and tasks
 * This is a convenience function for common test setups
 *
 * @param config Optional configuration to customize the scenario
 * @returns All created entity IDs for use in tests
 *
 * @example
 * ```typescript
 * const scenario = await seedFullScenario();
 *
 * // Use in test
 * await page.goto(`/households/${scenario.household.householdId}`);
 * ```
 */
export async function seedFullScenario(config?: {
  userEmail?: string;
  userPassword?: string;
  householdName?: string;
  childrenCount?: number;
  tasksCount?: number;
}): Promise<{
  user: { userId: string; email: string };
  household: { householdId: string; name: string };
  children: Array<{ childId: string; name: string }>;
  tasks: { taskIds: string[] };
}> {
  // Create user
  const user = await seedTestUser({
    email: config?.userEmail || `test-${Date.now()}@example.com`,
    password: config?.userPassword || 'SecureTestPass123!',
    name: 'Test User',
  });

  // Create household
  const household = await seedTestHousehold({
    name: config?.householdName || 'Test Family',
    ownerId: user.userId,
  });

  // Create children
  const childrenCount = config?.childrenCount || 2;
  const children: Array<{ childId: string; name: string }> = [];

  const childNames = ['Emma', 'Noah', 'Olivia', 'Liam', 'Ava'];
  for (let i = 0; i < childrenCount; i++) {
    const child = await seedTestChild({
      householdId: household.householdId,
      name: childNames[i] || `Child ${i + 1}`,
      age: 8 + i,
    });
    children.push(child);
  }

  // Create tasks
  const tasksCount = config?.tasksCount || 3;
  const taskTemplates = [
    { name: 'Clean Room', description: 'Make bed and organize toys' },
    { name: 'Do Homework', description: 'Complete all school assignments' },
    { name: 'Feed Pet', description: 'Feed and water the family pet' },
    { name: 'Set Table', description: 'Set table for dinner' },
    { name: 'Take Out Trash', description: 'Take out trash and recycling' },
  ];

  const tasks = await seedTestTasks({
    householdId: household.householdId,
    tasks: taskTemplates.slice(0, tasksCount),
  });

  return {
    user,
    household,
    children,
    tasks,
  };
}

/**
 * Seed a minimal test scenario for quick tests
 * Creates just a user and household
 *
 * @example
 * ```typescript
 * const { user, household } = await seedMinimalScenario();
 * ```
 */
export async function seedMinimalScenario(): Promise<{
  user: { userId: string; email: string };
  household: { householdId: string; name: string };
}> {
  const user = await seedTestUser({
    email: `test-${Date.now()}@example.com`,
    password: 'SecureTestPass123!',
  });

  const household = await seedTestHousehold({
    name: 'Test Family',
    ownerId: user.userId,
  });

  return { user, household };
}
