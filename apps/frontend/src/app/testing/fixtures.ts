/**
 * Test Fixtures - Factory functions for creating test data
 *
 * This module provides factory functions for all domain models to reduce
 * duplication in test files. Each factory creates a valid default instance
 * that can be customized with overrides.
 *
 * @example
 * // Create a basic task
 * const task = createMockTask();
 *
 * // Create a task with overrides
 * const customTask = createMockTask({ name: 'Custom Task', points: 25 });
 *
 * // Create multiple tasks
 * const tasks = createMockTasks(5, { householdId: 'household-1' });
 */

import type {
  Task,
  Assignment,
  Child,
  User,
  Household,
  HouseholdMember,
  TaskRuleConfig,
  PaginationMeta,
} from '@st44/types';

// Counter for generating unique IDs
let idCounter = 0;

/**
 * Generate a unique test ID with optional prefix
 */
export function generateTestId(prefix = 'test'): string {
  idCounter++;
  return `${prefix}-${idCounter}-${Date.now().toString(36)}`;
}

/**
 * Generate a mock UUID (not cryptographically secure, for testing only)
 */
export function generateMockUuid(): string {
  const hex = '0123456789abcdef';
  const segments = [8, 4, 4, 4, 12];
  return segments
    .map((len) => Array.from({ length: len }, () => hex[Math.floor(Math.random() * 16)]).join(''))
    .join('-');
}

/**
 * Generate an ISO date string for today
 */
export function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate an ISO datetime string for now
 */
export function nowDatetime(): string {
  return new Date().toISOString();
}

/**
 * Generate a date string offset by days from today
 */
export function dateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// =============================================================================
// User Fixtures
// =============================================================================

/**
 * Create a mock User
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  const id = overrides.id || generateMockUuid();
  return {
    id,
    email: `user-${id.slice(0, 8)}@test.com`,
    name: 'Test User',
    googleId: null,
    passwordHash: null,
    createdAt: nowDatetime(),
    updatedAt: nowDatetime(),
    ...overrides,
  };
}

/**
 * Create multiple mock Users
 */
export function createMockUsers(count: number, overrides: Partial<User> = {}): User[] {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({
      name: `Test User ${i + 1}`,
      ...overrides,
    }),
  );
}

// =============================================================================
// Household Fixtures
// =============================================================================

/**
 * Create a mock Household
 */
export function createMockHousehold(overrides: Partial<Household> = {}): Household {
  const id = overrides.id || generateMockUuid();
  return {
    id,
    name: 'Test Household',
    adminUserId: generateMockUuid(),
    createdAt: nowDatetime(),
    updatedAt: nowDatetime(),
    ...overrides,
  };
}

/**
 * Create a mock HouseholdMember
 */
export function createMockHouseholdMember(
  overrides: Partial<HouseholdMember> = {},
): HouseholdMember {
  return {
    id: generateMockUuid(),
    householdId: generateMockUuid(),
    userId: generateMockUuid(),
    role: 'parent',
    joinedAt: nowDatetime(),
    ...overrides,
  };
}

// =============================================================================
// Child Fixtures
// =============================================================================

/**
 * Create a mock Child
 */
export function createMockChild(overrides: Partial<Child> = {}): Child {
  const id = overrides.id || generateMockUuid();
  return {
    id,
    householdId: overrides.householdId || generateMockUuid(),
    userId: null,
    name: 'Test Child',
    birthYear: 2015,
    avatarUrl: null,
    createdAt: nowDatetime(),
    updatedAt: nowDatetime(),
    ...overrides,
  };
}

/**
 * Create multiple mock Children with sequential names
 */
export function createMockChildren(count: number, overrides: Partial<Child> = {}): Child[] {
  const names = ['Emma', 'Noah', 'Olivia', 'Liam', 'Ava', 'William', 'Sophia', 'James'];
  return Array.from({ length: count }, (_, i) =>
    createMockChild({
      name: names[i % names.length],
      birthYear: 2015 - i,
      ...overrides,
    }),
  );
}

// =============================================================================
// Task Fixtures
// =============================================================================

/**
 * Create a mock Task
 */
export function createMockTask(overrides: Partial<Task> = {}): Task {
  const id = overrides.id || generateMockUuid();
  return {
    id,
    householdId: overrides.householdId || generateMockUuid(),
    name: 'Test Task',
    description: 'A test task description',
    points: 10,
    ruleType: 'daily',
    ruleConfig: null,
    active: true,
    createdAt: nowDatetime(),
    updatedAt: nowDatetime(),
    ...overrides,
  };
}

/**
 * Create a mock daily task
 */
export function createMockDailyTask(overrides: Partial<Task> = {}): Task {
  return createMockTask({
    name: 'Daily Task',
    ruleType: 'daily',
    ruleConfig: null,
    ...overrides,
  });
}

/**
 * Create a mock weekly rotation task
 */
export function createMockWeeklyRotationTask(
  assignedChildren: string[],
  overrides: Partial<Task> = {},
): Task {
  const ruleConfig: TaskRuleConfig = {
    rotationType: 'odd_even_week',
    assignedChildren,
  };
  return createMockTask({
    name: 'Weekly Rotation Task',
    ruleType: 'weekly_rotation',
    ruleConfig,
    ...overrides,
  });
}

/**
 * Create a mock repeating task
 */
export function createMockRepeatingTask(
  repeatDays: number[],
  assignedChildren: string[],
  overrides: Partial<Task> = {},
): Task {
  const ruleConfig: TaskRuleConfig = {
    repeatDays,
    assignedChildren,
  };
  return createMockTask({
    name: 'Repeating Task',
    ruleType: 'repeating',
    ruleConfig,
    ...overrides,
  });
}

/**
 * Create multiple mock Tasks
 */
export function createMockTasks(count: number, overrides: Partial<Task> = {}): Task[] {
  const taskNames = [
    'Feed the dog',
    'Take out trash',
    'Clean room',
    'Do homework',
    'Practice piano',
    'Water plants',
    'Set table',
    'Load dishwasher',
  ];
  return Array.from({ length: count }, (_, i) =>
    createMockTask({
      name: taskNames[i % taskNames.length],
      points: 10 + i * 5,
      ...overrides,
    }),
  );
}

/**
 * Create an inactive (deleted) task
 */
export function createMockInactiveTask(overrides: Partial<Task> = {}): Task {
  return createMockTask({
    name: 'Inactive Task',
    active: false,
    ...overrides,
  });
}

// =============================================================================
// Assignment Fixtures
// =============================================================================

/**
 * Create a mock Assignment
 */
export function createMockAssignment(overrides: Partial<Assignment> = {}): Assignment {
  const id = overrides.id || generateMockUuid();
  return {
    id,
    taskId: overrides.taskId || generateMockUuid(),
    title: 'Test Assignment',
    description: null,
    ruleType: 'daily',
    childId: overrides.childId || generateMockUuid(),
    childName: 'Test Child',
    date: todayDate(),
    status: 'pending',
    completedAt: null,
    createdAt: nowDatetime(),
    ...overrides,
  };
}

/**
 * Create a pending assignment
 */
export function createMockPendingAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return createMockAssignment({
    status: 'pending',
    completedAt: null,
    ...overrides,
  });
}

/**
 * Create a completed assignment
 */
export function createMockCompletedAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return createMockAssignment({
    status: 'completed',
    completedAt: nowDatetime(),
    ...overrides,
  });
}

/**
 * Create an overdue assignment (pending with past date)
 */
export function createMockOverdueAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return createMockAssignment({
    status: 'pending',
    date: dateOffset(-1),
    completedAt: null,
    ...overrides,
  });
}

/**
 * Create multiple mock Assignments
 */
export function createMockAssignments(
  count: number,
  overrides: Partial<Assignment> = {},
): Assignment[] {
  const titles = ['Feed the dog', 'Take out trash', 'Clean room', 'Do homework', 'Practice piano'];
  return Array.from({ length: count }, (_, i) =>
    createMockAssignment({
      title: titles[i % titles.length],
      ...overrides,
    }),
  );
}

/**
 * Create a mix of pending and completed assignments
 */
export function createMockMixedAssignments(
  pendingCount: number,
  completedCount: number,
  overrides: Partial<Assignment> = {},
): Assignment[] {
  const pending = Array.from({ length: pendingCount }, () =>
    createMockPendingAssignment(overrides),
  );
  const completed = Array.from({ length: completedCount }, () =>
    createMockCompletedAssignment(overrides),
  );
  return [...pending, ...completed];
}

// =============================================================================
// Pagination Fixtures
// =============================================================================

/**
 * Create a mock PaginationMeta
 */
export function createMockPagination(overrides: Partial<PaginationMeta> = {}): PaginationMeta {
  const page = overrides.page ?? 1;
  const pageSize = overrides.pageSize ?? 20;
  const total = overrides.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    ...overrides,
  };
}

// =============================================================================
// API Response Fixtures
// =============================================================================

/**
 * Create a mock paginated tasks response
 */
export function createMockTasksResponse(
  tasks: Task[],
  paginationOverrides: Partial<PaginationMeta> = {},
) {
  return {
    tasks,
    pagination: createMockPagination({
      total: tasks.length,
      ...paginationOverrides,
    }),
  };
}

/**
 * Create a mock assignments response
 */
export function createMockAssignmentsResponse(assignments: Assignment[]) {
  return {
    assignments,
    total: assignments.length,
  };
}

/**
 * Create a mock task completion response
 */
export function createMockCompletionResponse(assignmentId: string, pointsEarned = 10) {
  return {
    taskAssignment: {
      id: assignmentId,
      status: 'completed' as const,
      completedAt: nowDatetime(),
    },
    completion: {
      id: generateMockUuid(),
      pointsEarned,
      completedAt: nowDatetime(),
    },
  };
}

// =============================================================================
// Reset Utilities
// =============================================================================

/**
 * Reset the ID counter (call in beforeEach for consistent tests)
 */
export function resetIdCounter(): void {
  idCounter = 0;
}
