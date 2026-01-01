import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcrypt';

/**
 * Create a connection pool for test database operations
 * Uses environment variables with fallbacks for local E2E testing
 */
function createPool(): Pool {
  // Detect if running inside Docker (claude-code-sandbox) vs host machine
  const isInsideDocker =
    process.env.RUNNING_IN_DOCKER === 'true' || require('fs').existsSync('/.dockerenv');
  const dockerHost = isInsideDocker ? 'host.docker.internal' : 'localhost';

  return new Pool({
    host: process.env.DB_HOST || dockerHost,
    port: parseInt(process.env.DB_PORT || '5433', 10), // Local E2E docker uses 5433
    database: process.env.DB_NAME || 'st44_test_local', // Local E2E docker uses st44_test_local
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
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
 * @param data User data (email, password)
 * @returns Created user ID and email
 *
 * @example
 * ```typescript
 * const user = await seedTestUser({
 *   email: 'test@example.com',
 *   password: 'SecurePass123!'
 * });
 * console.log(user.userId); // Use in tests
 * ```
 */
export async function seedTestUser(data: {
  email: string;
  password: string;
}): Promise<{ userId: string; email: string }> {
  return withTransaction(async (client) => {
    // Hash password with bcrypt (same as production)
    const passwordHash = await bcrypt.hash(data.password, 10);

    const result = await client.query(
      `INSERT INTO users (email, password_hash, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id, email`,
      [data.email, passwordHash],
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
 * @param data Child data (householdId, name, birthYear)
 * @returns Created child ID and name
 *
 * @example
 * ```typescript
 * const child = await seedTestChild({
 *   householdId: household.householdId,
 *   name: 'Emma',
 *   birthYear: 2016
 * });
 * ```
 */
export async function seedTestChild(data: {
  householdId: string;
  name: string;
  birthYear: number;
}): Promise<{ childId: string; name: string }> {
  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO children (household_id, name, birth_year, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, name`,
      [data.householdId, data.name, data.birthYear],
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
    ruleType?: 'weekly_rotation' | 'repeating' | 'daily';
  }>;
}): Promise<{ taskIds: string[] }> {
  return withTransaction(async (client) => {
    const taskIds: string[] = [];

    for (const task of data.tasks) {
      const result = await client.query(
        `INSERT INTO tasks (household_id, name, description, rule_type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id`,
        [data.householdId, task.name, task.description || null, task.ruleType || 'daily'],
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
    await pool.query(`
      TRUNCATE TABLE
        reward_redemptions,
        rewards,
        task_completions,
        task_assignments,
        tasks,
        children,
        invitations,
        household_members,
        households,
        password_reset_tokens,
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
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < childrenCount; i++) {
    const child = await seedTestChild({
      householdId: household.householdId,
      name: childNames[i] || `Child ${i + 1}`,
      birthYear: currentYear - (8 + i), // Convert age to birth year
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

/**
 * Create task assignments for a household
 *
 * @param data Assignment data (householdId, taskId, childId, date)
 * @returns Created assignment ID
 */
export async function seedTaskAssignment(data: {
  householdId: string;
  taskId: string;
  childId: string;
  date: Date;
}): Promise<{ assignmentId: string }> {
  return withTransaction(async (client) => {
    const dateStr = data.date.toISOString().split('T')[0];
    const result = await client.query(
      `INSERT INTO task_assignments (household_id, task_id, child_id, date, status, created_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW())
       RETURNING id`,
      [data.householdId, data.taskId, data.childId, dateStr],
    );

    return {
      assignmentId: result.rows[0].id,
    };
  });
}

/**
 * Seed complete test data for feature tests
 * Creates parent, household, children, tasks, and today's assignments
 *
 * @param config Test data configuration
 * @returns All created entity IDs for use in tests
 *
 * @example
 * ```typescript
 * const testData = await seedTestData({
 *   parent: { email: 'parent@test.com', password: 'Test1234!' },
 *   children: [{ name: 'Emma', age: 10 }],
 *   tasks: [{ title: 'Clean room', description: 'Tidy up', rule_type: 'daily' }]
 * });
 * ```
 */
export async function seedTestData(config: {
  parent: { email: string; password: string; name?: string };
  children: Array<{ name: string; age: number }>;
  tasks: Array<{
    title: string;
    description?: string;
    rule_type?: 'weekly_rotation' | 'repeating' | 'daily';
    days_of_week?: number[];
  }>;
}): Promise<{
  householdId: string;
  parentId: string;
  children: Array<{ id: string; name: string }>;
  tasks: Array<{ id: string; name: string }>;
  assignments: Array<{ id: string; taskId: string; childId: string }>;
}> {
  // Create parent user
  const user = await seedTestUser({
    email: config.parent.email,
    password: config.parent.password,
  });

  // Create household
  const household = await seedTestHousehold({
    name: 'Test Family',
    ownerId: user.userId,
  });

  // Create children
  const currentYear = new Date().getFullYear();
  const children: Array<{ id: string; name: string }> = [];

  for (const childConfig of config.children) {
    const child = await seedTestChild({
      householdId: household.householdId,
      name: childConfig.name,
      birthYear: currentYear - childConfig.age,
    });
    children.push({ id: child.childId, name: child.name });
  }

  // Create tasks
  const tasks: Array<{ id: string; name: string }> = [];

  for (const taskConfig of config.tasks) {
    const pool = createPool();
    try {
      const result = await pool.query(
        `INSERT INTO tasks (household_id, name, description, rule_type, rule_config, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, name`,
        [
          household.householdId,
          taskConfig.title,
          taskConfig.description || null,
          taskConfig.rule_type || 'daily',
          taskConfig.days_of_week ? JSON.stringify({ daysOfWeek: taskConfig.days_of_week }) : null,
        ],
      );
      tasks.push({ id: result.rows[0].id, name: result.rows[0].name });
    } finally {
      await pool.end();
    }
  }

  // Create today's assignments for first child with daily tasks
  const assignments: Array<{ id: string; taskId: string; childId: string }> = [];
  const today = new Date();

  if (children.length > 0) {
    for (const task of tasks) {
      const assignment = await seedTaskAssignment({
        householdId: household.householdId,
        taskId: task.id,
        childId: children[0].id,
        date: today,
      });
      assignments.push({
        id: assignment.assignmentId,
        taskId: task.id,
        childId: children[0].id,
      });
    }
  }

  return {
    householdId: household.householdId,
    parentId: user.userId,
    children,
    tasks,
    assignments,
  };
}

/**
 * Create a single task with candidates
 *
 * @param data Single task data (householdId, name, description, points, deadline, candidates)
 * @returns Created task ID
 *
 * @example
 * ```typescript
 * const task = await seedSingleTask({
 *   householdId: household.householdId,
 *   name: 'Clean the garage',
 *   description: 'One-time deep cleaning',
 *   points: 50,
 *   deadline: new Date('2024-01-15T18:00:00Z'),
 *   candidateIds: [child1.childId, child2.childId]
 * });
 * ```
 */
export async function seedSingleTask(data: {
  householdId: string;
  name: string;
  description?: string;
  points?: number;
  deadline?: Date;
  candidateIds: string[];
}): Promise<{ taskId: string }> {
  return withTransaction(async (client) => {
    // Create the task
    const taskResult = await client.query(
      `INSERT INTO tasks (household_id, name, description, points, rule_type, deadline, rule_config, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'single', $5, $6, true, NOW(), NOW())
       RETURNING id`,
      [
        data.householdId,
        data.name,
        data.description || null,
        data.points || 10,
        data.deadline || null,
        JSON.stringify({ assignedChildren: data.candidateIds }),
      ],
    );

    const taskId = taskResult.rows[0].id;

    // Add candidates
    for (const childId of data.candidateIds) {
      await client.query(
        `INSERT INTO task_candidates (task_id, child_id, household_id, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [taskId, childId, data.householdId],
      );
    }

    return { taskId };
  });
}

/**
 * Add a task response (accept/decline) for a child
 *
 * @param data Response data (taskId, childId, householdId, response)
 * @returns Created response ID
 */
export async function seedTaskResponse(data: {
  taskId: string;
  childId: string;
  householdId: string;
  response: 'accepted' | 'declined';
}): Promise<{ responseId: string }> {
  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO task_responses (task_id, child_id, household_id, response, responded_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [data.taskId, data.childId, data.householdId, data.response],
    );

    return { responseId: result.rows[0].id };
  });
}

/**
 * Seed a complete single task scenario with parent, children, and tasks
 *
 * @example
 * ```typescript
 * const scenario = await seedSingleTaskScenario({
 *   parent: { email: 'parent@test.com', password: 'Test1234!' },
 *   children: ['Emma', 'Noah'],
 *   tasks: [
 *     { name: 'Clean garage', candidates: ['Emma', 'Noah'] },
 *     { name: 'Organize closet', candidates: ['Emma'] }
 *   ]
 * });
 * ```
 */
export async function seedSingleTaskScenario(config: {
  parent: { email: string; password: string };
  children: string[];
  tasks: Array<{
    name: string;
    description?: string;
    points?: number;
    deadline?: Date;
    candidates: string[]; // Child names from the children array
  }>;
}): Promise<{
  householdId: string;
  parentId: string;
  children: Array<{ id: string; name: string }>;
  tasks: Array<{ id: string; name: string; candidateIds: string[] }>;
}> {
  // Create parent user
  const user = await seedTestUser({
    email: config.parent.email,
    password: config.parent.password,
  });

  // Create household
  const household = await seedTestHousehold({
    name: 'Test Family',
    ownerId: user.userId,
  });

  // Create children
  const currentYear = new Date().getFullYear();
  const children: Array<{ id: string; name: string }> = [];

  for (let i = 0; i < config.children.length; i++) {
    const child = await seedTestChild({
      householdId: household.householdId,
      name: config.children[i],
      birthYear: currentYear - (10 + i),
    });
    children.push({ id: child.childId, name: child.name });
  }

  // Create single tasks with candidates
  const tasks: Array<{ id: string; name: string; candidateIds: string[] }> = [];

  for (const taskConfig of config.tasks) {
    // Map child names to child IDs
    const candidateIds = taskConfig.candidates
      .map((name) => children.find((c) => c.name === name)?.id)
      .filter((id): id is string => id !== undefined);

    const task = await seedSingleTask({
      householdId: household.householdId,
      name: taskConfig.name,
      description: taskConfig.description,
      points: taskConfig.points,
      deadline: taskConfig.deadline,
      candidateIds,
    });

    tasks.push({
      id: task.taskId,
      name: taskConfig.name,
      candidateIds,
    });
  }

  return {
    householdId: household.householdId,
    parentId: user.userId,
    children,
    tasks,
  };
}
