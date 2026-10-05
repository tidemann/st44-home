import { getISOWeek } from 'date-fns';
import { db } from '../database.js';
import type { PoolClient } from '../types/database.js';

export interface AssignmentGenerationResult {
  created: number;
  skipped: number;
  errors: string[];
}

interface Task {
  id: string;
  household_id: string;
  name: string;
  rule_type: 'weekly_rotation' | 'repeating' | 'daily';
  rule_config: RuleConfig;
}

interface RuleConfig {
  rotationType?: 'odd_even_week' | 'alternating';
  repeatDays?: number[];
  assignedChildren?: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fixed Monday that rotations count from, so a given date always maps to the same
 * child no matter which day the generator runs (daily reruns stay idempotent).
 */
const ROTATION_ANCHOR_MS = Date.UTC(2024, 0, 1);

interface ExistingAssignment {
  task_id: string;
  date: string;
  child_id: string | null;
}

interface PendingAssignment {
  task_id: string;
  child_id: string | null;
  date: string;
  household_id: string;
}

/**
 * Generates task assignments for a household over a date range
 *
 * @param householdId - UUID of the household
 * @param startDate - First date to generate assignments for
 * @param days - Number of days to generate (1-365)
 * @returns Result with created/skipped counts and any errors
 */
export async function generateAssignments(
  householdId: string,
  startDate: Date,
  days: number,
): Promise<AssignmentGenerationResult> {
  const result: AssignmentGenerationResult = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  // Validate inputs
  if (!householdId || householdId.trim().length === 0) {
    result.errors.push('household_id is required');
    return result;
  }

  if (days < 1 || days > 365) {
    result.errors.push('days must be between 1 and 365');
    return result;
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1. Load all active recurring tasks for household (single tasks are not generated)
    const tasksResult = await client.query<Omit<Task, 'rule_config'> & { rule_config: unknown }>(
      `SELECT id, household_id, name, rule_type, rule_config
       FROM tasks
       WHERE household_id = $1 AND active = true
         AND rule_type IN ('daily', 'repeating', 'weekly_rotation')
       ORDER BY name`,
      [householdId],
    );

    const tasks: Task[] = tasksResult.rows.map((row) => ({
      ...row,
      rule_config: readRuleConfig(row.rule_config),
    }));

    if (tasks.length === 0) {
      await client.query('COMMIT');
      return result;
    }

    // 2. Generate date range (use UTC to avoid timezone issues)
    const dates: Date[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      // Use UTC date methods to avoid timezone shifts
      date.setUTCDate(date.getUTCDate() + i);
      dates.push(date);
    }

    // 3. Load existing assignments for this date range
    const endDate = dates[dates.length - 1];
    const existingResult = await client.query<ExistingAssignment>(
      `SELECT task_id, date::text, child_id
       FROM task_assignments
       WHERE household_id = $1
         AND date >= $2
         AND date <= $3`,
      [householdId, formatDate(startDate), formatDate(endDate)],
    );

    // Create lookup set for existing assignments. Keyed by task and date only: once a
    // task has an assignment on a date (even if a parent moved it to another child),
    // reruns leave that date alone.
    const existingSet = new Set<string>();
    for (const row of existingResult.rows) {
      existingSet.add(`${row.task_id}:${row.date}`);
    }

    // 4. Generate new assignments
    const pendingAssignments: PendingAssignment[] = [];

    for (const task of tasks) {
      try {
        const assignments = await generateAssignmentsForTask(task, dates, householdId, client);
        pendingAssignments.push(...assignments);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Task ${task.name} (${task.id}): ${errorMessage}`);
      }
    }

    // 5. Filter out existing assignments (idempotency)
    const newAssignments = pendingAssignments.filter(
      (assignment) => !existingSet.has(`${assignment.task_id}:${assignment.date}`),
    );

    result.skipped = pendingAssignments.length - newAssignments.length;

    // 6. Batch insert new assignments
    if (newAssignments.length > 0) {
      // Separate assignments with and without child_id for proper ON CONFLICT handling
      const assignmentsWithChild = newAssignments.filter((a) => a.child_id !== null);
      const assignmentsWithoutChild = newAssignments.filter((a) => a.child_id === null);

      let insertedCount = 0;

      // Insert assignments with child_id
      if (assignmentsWithChild.length > 0) {
        const valuePlaceholders: string[] = [];
        const values: (string | null)[] = [];
        let paramIndex = 1;

        for (const assignment of assignmentsWithChild) {
          valuePlaceholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, 'pending')`,
          );
          values.push(
            assignment.household_id,
            assignment.task_id,
            assignment.child_id,
            assignment.date,
          );
          paramIndex += 4;
        }

        const insertSqlWithChild = `
          INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
          VALUES ${valuePlaceholders.join(', ')}
          ON CONFLICT (task_id, child_id, date) WHERE child_id IS NOT NULL DO NOTHING
        `;

        const result1 = await client.query(insertSqlWithChild, values);
        insertedCount += result1.rowCount || 0;
      }

      // Insert assignments without child_id
      if (assignmentsWithoutChild.length > 0) {
        const valuePlaceholders: string[] = [];
        const values: (string | null)[] = [];
        let paramIndex = 1;

        for (const assignment of assignmentsWithoutChild) {
          valuePlaceholders.push(
            `($${paramIndex}, $${paramIndex + 1}, NULL, $${paramIndex + 2}, 'pending')`,
          );
          values.push(assignment.household_id, assignment.task_id, assignment.date);
          paramIndex += 3;
        }

        const insertSqlWithoutChild = `
          INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
          VALUES ${valuePlaceholders.join(', ')}
          ON CONFLICT (task_id, date) WHERE child_id IS NULL DO NOTHING
        `;

        const result2 = await client.query(insertSqlWithoutChild, values);
        insertedCount += result2.rowCount || 0;
      }

      result.created = insertedCount;
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Transaction failed: ${errorMessage}`);
  } finally {
    client.release();
  }

  return result;
}

/**
 * Generates assignments for a single task across all dates
 */
async function generateAssignmentsForTask(
  task: Task,
  dates: Date[],
  householdId: string,
  client: PoolClient,
): Promise<PendingAssignment[]> {
  const assignments: PendingAssignment[] = [];

  switch (task.rule_type) {
    case 'daily':
      assignments.push(...generateDailyAssignments(task, dates, householdId));
      break;

    case 'repeating':
      assignments.push(...generateRepeatingAssignments(task, dates, householdId));
      break;

    case 'weekly_rotation':
      assignments.push(
        ...(await generateWeeklyRotationAssignments(task, dates, householdId, client)),
      );
      break;

    default:
      throw new Error(`Unknown rule_type: ${task.rule_type}`);
  }

  return assignments;
}

/**
 * Daily rule: Generate every day, rotate children by day
 */
function generateDailyAssignments(
  task: Task,
  dates: Date[],
  householdId: string,
): PendingAssignment[] {
  const assignedChildren = task.rule_config.assignedChildren || [];

  return dates.map((date) => ({
    task_id: task.id,
    child_id: pickChild(assignedChildren, daysSinceAnchor(date)),
    date: formatDate(date),
    household_id: householdId,
  }));
}

/**
 * Repeating rule: Check repeatDays array, rotate children per occurrence
 */
function generateRepeatingAssignments(
  task: Task,
  dates: Date[],
  householdId: string,
): PendingAssignment[] {
  const assignments: PendingAssignment[] = [];
  const assignedChildren = task.rule_config.assignedChildren || [];
  // Order the repeat days Monday-first so occurrences count in week order
  const repeatDays = [...new Set(task.rule_config.repeatDays || [])].sort(
    (a, b) => isoWeekday(a) - isoWeekday(b),
  );

  if (repeatDays.length === 0) {
    throw new Error('repeatDays is required for repeating tasks');
  }

  for (const date of dates) {
    const dayOfWeek = date.getUTCDay(); // 0=Sunday, 6=Saturday (use UTC)
    const positionInWeek = repeatDays.indexOf(dayOfWeek);

    if (positionInWeek === -1) continue;

    // Occurrence number since the anchor week, so rotation does not depend on the run date
    const occurrence = weeksSinceAnchor(date) * repeatDays.length + positionInWeek;

    assignments.push({
      task_id: task.id,
      child_id: pickChild(assignedChildren, occurrence),
      date: formatDate(date),
      household_id: householdId,
    });
  }

  return assignments;
}

/**
 * Weekly rotation rule: one child per ISO week (Monday-Sunday)
 */
async function generateWeeklyRotationAssignments(
  task: Task,
  dates: Date[],
  householdId: string,
  client: PoolClient,
): Promise<PendingAssignment[]> {
  const rotationType = task.rule_config.rotationType;
  const assignedChildren = task.rule_config.assignedChildren || [];

  if (assignedChildren.length === 0) {
    throw new Error('assignedChildren is required for weekly_rotation tasks');
  }

  if (!rotationType) {
    throw new Error('rotationType is required for weekly_rotation tasks');
  }

  let childForDate: (date: Date) => string;

  if (rotationType === 'odd_even_week') {
    // ISO week of each date: odd weeks (1, 3, 5...) index 0, even weeks index 1,
    // 3+ children cycle with (weekNum - 1) % length
    childForDate = (date) => {
      const weekNum = getISOWeek(
        new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      );
      return assignedChildren[(weekNum - 1) % assignedChildren.length];
    };
  } else if (rotationType === 'alternating') {
    // Continue from the last child assigned BEFORE the first week in range, so a
    // rerun later in the same week computes the same child for that week
    const firstWeek = weeksSinceAnchor(dates[0]);
    const firstWeekStart = new Date(ROTATION_ANCHOR_MS + firstWeek * 7 * DAY_MS);

    const lastAssignmentResult = await client.query<{ child_id: string }>(
      `SELECT child_id
       FROM task_assignments
       WHERE task_id = $1 AND date < $2 AND child_id IS NOT NULL
       ORDER BY date DESC
       LIMIT 1`,
      [task.id, formatDate(firstWeekStart)],
    );

    let firstChildIndex = 0; // Default to first child if no history

    if (lastAssignmentResult.rows.length > 0) {
      const lastChildIndex = assignedChildren.indexOf(lastAssignmentResult.rows[0].child_id);
      // If the last child is no longer assigned, start from the beginning
      firstChildIndex = lastChildIndex === -1 ? 0 : lastChildIndex + 1;
    }

    childForDate = (date) =>
      assignedChildren[
        mod(firstChildIndex + weeksSinceAnchor(date) - firstWeek, assignedChildren.length)
      ];
  } else {
    throw new Error(`Unknown rotationType: ${rotationType}`);
  }

  return dates.map((date) => ({
    task_id: task.id,
    child_id: childForDate(date),
    date: formatDate(date),
    household_id: householdId,
  }));
}

/**
 * Reads rule_config as stored (camelCase); older rows may use snake_case keys
 */
export function readRuleConfig(raw: unknown): RuleConfig {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof value !== 'object' || value === null) return {};

  const obj = value as Record<string, unknown>;
  const rotationType = obj.rotationType ?? obj.rotation_type;
  const repeatDays = obj.repeatDays ?? obj.repeat_days;
  const assignedChildren = obj.assignedChildren ?? obj.assigned_children;

  const config: RuleConfig = {};
  if (rotationType === 'odd_even_week' || rotationType === 'alternating') {
    config.rotationType = rotationType;
  }
  if (Array.isArray(repeatDays)) {
    config.repeatDays = repeatDays.filter(
      (d): d is number => Number.isInteger(d) && d >= 0 && d <= 6,
    );
  }
  if (Array.isArray(assignedChildren)) {
    config.assignedChildren = assignedChildren.filter(
      (c): c is string => typeof c === 'string' && c.length > 0,
    );
  }
  return config;
}

/**
 * Picks the child for a rotation step, or null for household-wide tasks
 */
function pickChild(children: string[], step: number): string | null {
  return children.length === 0 ? null : children[mod(step, children.length)];
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Monday=0 ... Sunday=6 */
function isoWeekday(dayOfWeek: number): number {
  return (dayOfWeek + 6) % 7;
}

function daysSinceAnchor(date: Date): number {
  const utcMidnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round((utcMidnight - ROTATION_ANCHOR_MS) / DAY_MS);
}

function weeksSinceAnchor(date: Date): number {
  return Math.floor(daysSinceAnchor(date) / 7);
}

/**
 * Format Date object as YYYY-MM-DD string (UTC to avoid timezone issues)
 */
function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
