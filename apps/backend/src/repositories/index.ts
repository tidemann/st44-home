/**
 * Repository Layer - Data Access Objects
 *
 * This module provides repositories that encapsulate all database queries.
 * Services should use these repositories instead of direct database access.
 *
 * Benefits:
 * - Single point of change for schema modifications
 * - Type-safe query results
 * - Easier testing with mockable repositories
 * - Consistent row-to-domain mapping
 * - Transaction support via withClient()
 */

// Task Repository
export {
  TaskRepository,
  createTaskRepository,
  type Task,
  type TaskRuleType,
  type CreateTaskDto,
  type UpdateTaskDto,
  type TaskListOptions,
  type TaskListResult,
} from './task.repository.js';

// Household Repository
export {
  HouseholdRepository,
  createHouseholdRepository,
  type Household,
  type HouseholdWithCounts,
  type HouseholdMember,
  type HouseholdListItem,
  type CreateHouseholdDto,
} from './household.repository.js';

// Child Repository
export {
  ChildRepository,
  createChildRepository,
  type Child,
  type ChildWithPoints,
  type CreateChildDto,
  type UpdateChildDto,
} from './child.repository.js';

// Assignment Repository
export {
  AssignmentRepository,
  createAssignmentRepository,
  type Assignment,
  type AssignmentWithDetails,
  type TaskCompletion,
  type CreateAssignmentDto,
  type CreateCompletionDto,
  type AssignmentFilters,
} from './assignment.repository.js';

// User Repository
export {
  UserRepository,
  createUserRepository,
  type User,
  type CreateUserDto,
  type UpdateUserDto,
  type PasswordResetToken,
} from './user.repository.js';
