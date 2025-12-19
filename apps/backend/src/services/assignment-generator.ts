import { getISOWeek } from 'date-fns';
import { db } from '../database.js';

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
  rule_config: {
    rotation_type?: 'odd_even_week' | 'alternating';
    repeat_days?: number[];
    assigned_children?: string[];
  };
}

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

    // 1. Load all active tasks for household
    const tasksResult = await client.query<Task>(
      `SELECT id, household_id, name, rule_type, rule_config
       FROM tasks
       WHERE household_id = $1 AND active = true
       ORDER BY name`,
      [householdId],
    );

    const tasks = tasksResult.rows;

    if (tasks.length === 0) {
      await client.query('COMMIT');
      return result;
    }

    // 2. Generate date range
    const dates: Date[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
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

    // Create lookup set for existing assignments
    const existingSet = new Set<string>();
    for (const row of existingResult.rows) {
      const key = `${row.task_id}:${row.date}:${row.child_id || 'null'}`;
      existingSet.add(key);
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
    const newAssignments = pendingAssignments.filter((assignment) => {
      const key = `${assignment.task_id}:${assignment.date}:${assignment.child_id || 'null'}`;
      return !existingSet.has(key);
    });

    result.skipped = pendingAssignments.length - newAssignments.length;

    // 6. Batch insert new assignments
    if (newAssignments.length > 0) {
      // Build batch insert query
      const valuePlaceholders: string[] = [];
      const values: (string | null)[] = [];
      let paramIndex = 1;

      for (const assignment of newAssignments) {
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

      const insertSql = `
        INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
        VALUES ${valuePlaceholders.join(', ')}
        ON CONFLICT (task_id, child_id, date) DO NOTHING
      `;

      await client.query(insertSql, values);
      result.created = newAssignments.length;
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
  client: any,
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
 * Daily rule: Generate every day, rotate children
 */
function generateDailyAssignments(
  task: Task,
  dates: Date[],
  householdId: string,
): PendingAssignment[] {
  const assignments: PendingAssignment[] = [];
  const assignedChildren = task.rule_config.assigned_children || [];

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    let childId: string | null = null;

    // If assigned_children specified, rotate daily
    if (assignedChildren.length > 0) {
      const childIndex = i % assignedChildren.length;
      childId = assignedChildren[childIndex];
    }

    assignments.push({
      task_id: task.id,
      child_id: childId,
      date: formatDate(date),
      household_id: householdId,
    });
  }

  return assignments;
}

/**
 * Repeating rule: Check repeat_days array, rotate on repeat days
 */
function generateRepeatingAssignments(
  task: Task,
  dates: Date[],
  householdId: string,
): PendingAssignment[] {
  const assignments: PendingAssignment[] = [];
  const repeatDays = task.rule_config.repeat_days || [];
  const assignedChildren = task.rule_config.assigned_children || [];

  if (repeatDays.length === 0) {
    throw new Error('repeat_days is required for repeating tasks');
  }

  let occurrenceCount = 0;

  for (const date of dates) {
    const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday

    // Check if this date is a repeat day
    if (repeatDays.includes(dayOfWeek)) {
      let childId: string | null = null;

      // If assigned_children specified, rotate based on occurrence count
      if (assignedChildren.length > 0) {
        const childIndex = occurrenceCount % assignedChildren.length;
        childId = assignedChildren[childIndex];
      }

      assignments.push({
        task_id: task.id,
        child_id: childId,
        date: formatDate(date),
        household_id: householdId,
      });

      occurrenceCount++;
    }
  }

  return assignments;
}

/**
 * Weekly rotation rule: Uses ISO week or alternating logic
 */
async function generateWeeklyRotationAssignments(
  task: Task,
  dates: Date[],
  householdId: string,
  client: any,
): Promise<PendingAssignment[]> {
  const assignments: PendingAssignment[] = [];
  const rotationType = task.rule_config.rotation_type;
  const assignedChildren = task.rule_config.assigned_children || [];

  if (assignedChildren.length === 0) {
    throw new Error('assigned_children is required for weekly_rotation tasks');
  }

  if (!rotationType) {
    throw new Error('rotation_type is required for weekly_rotation tasks');
  }

  if (rotationType === 'odd_even_week') {
    // Use ISO week number to determine odd/even
    for (const date of dates) {
      const weekNum = getISOWeek(date);
      const isOddWeek = weekNum % 2 === 1;
      const childIndex = isOddWeek ? 0 : 1;
      const childId = assignedChildren[childIndex % assignedChildren.length];

      assignments.push({
        task_id: task.id,
        child_id: childId,
        date: formatDate(date),
        household_id: householdId,
      });
    }
  } else if (rotationType === 'alternating') {
    // Query most recent assignment to determine next child
    const lastAssignmentResult = await client.query(
      `SELECT child_id
       FROM task_assignments
       WHERE task_id = $1
       ORDER BY date DESC
       LIMIT 1`,
      [task.id],
    );

    let lastChildIndex = -1;

    if (lastAssignmentResult.rows.length > 0) {
      const lastChildId = lastAssignmentResult.rows[0].child_id;
      lastChildIndex = assignedChildren.indexOf(lastChildId);
      if (lastChildIndex === -1) {
        // Last child not in current assigned_children list, start from beginning
        lastChildIndex = -1;
      }
    }

    // Generate assignments, rotating through children
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const childIndex = (lastChildIndex + 1 + i) % assignedChildren.length;
      const childId = assignedChildren[childIndex];

      assignments.push({
        task_id: task.id,
        child_id: childId,
        date: formatDate(date),
        household_id: householdId,
      });
    }
  } else {
    throw new Error(`Unknown rotation_type: ${rotationType}`);
  }

  return assignments;
}

/**
 * Format Date object as YYYY-MM-DD string
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
