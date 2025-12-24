import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  HouseholdAnalyticsSchema,
  ChildAnalyticsSchema,
  AnalyticsPeriodSchema,
  type HouseholdAnalytics,
  type ChildAnalytics,
  type AnalyticsPeriod,
  type DailyCompletion,
  type ChildProgressHistory,
  type ChildStreak,
  type TaskPopularity,
  type PeriodComparison,
} from '@st44/types';
import { z, zodToOpenAPI, CommonErrors } from '@st44/types/generators';
import { db } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import { validateHouseholdMembership } from '../middleware/household-membership.js';
import { stripResponseValidation } from '../schemas/common.js';

interface GetAnalyticsRequest {
  Params: {
    householdId: string;
  };
  Querystring: {
    period?: AnalyticsPeriod;
  };
}

interface GetChildAnalyticsRequest {
  Querystring: {
    period?: AnalyticsPeriod;
  };
}

/**
 * Calculate date range based on period
 */
function getDateRange(period: AnalyticsPeriod): {
  startDate: string;
  endDate: string;
  previousStartDate: string;
  previousEndDate: string;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let startDate: Date;
  let previousStartDate: Date;
  let daysDiff: number;

  if (period === 'week') {
    // Current week (Monday to Sunday)
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate = new Date(today);
    startDate.setDate(today.getDate() + mondayOffset);

    // Previous week
    previousStartDate = new Date(startDate);
    previousStartDate.setDate(startDate.getDate() - 7);
    daysDiff = 7;
  } else if (period === 'month') {
    // Current month
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);

    // Previous month
    previousStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    daysDiff = 30; // Approximate
  } else {
    // All time - last 90 days
    startDate = new Date(today);
    startDate.setDate(today.getDate() - 90);

    previousStartDate = new Date(startDate);
    previousStartDate.setDate(startDate.getDate() - 90);
    daysDiff = 90;
  }

  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 1); // Include today

  const previousEndDate = new Date(startDate);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    previousStartDate: previousStartDate.toISOString().split('T')[0],
    previousEndDate: previousEndDate.toISOString().split('T')[0],
  };
}

/**
 * Calculate current streak for a child
 * A streak is consecutive days with 100% task completion
 */
async function calculateStreak(
  childId: string,
  householdId: string,
): Promise<{ currentStreak: number; longestStreak: number; lastCompletionDate: string | null }> {
  // Get all dates with task assignments and their completion status
  const result = await db.query(
    `WITH daily_completion AS (
      SELECT
        date,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
      FROM task_assignments
      WHERE child_id = $1 AND household_id = $2
      GROUP BY date
      ORDER BY date DESC
    ),
    completion_status AS (
      SELECT
        date,
        CASE WHEN total_tasks = completed_tasks THEN 1 ELSE 0 END as completed_all
      FROM daily_completion
    )
    SELECT
      date,
      completed_all
    FROM completion_status
    ORDER BY date DESC
    LIMIT 365`,
    [childId, householdId],
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastCompletionDate: string | null = null;
  let checkingCurrent = true;

  for (const row of result.rows) {
    const completedAll = row.completed_all === 1;

    if (completedAll) {
      tempStreak++;
      if (checkingCurrent) {
        currentStreak = tempStreak;
        lastCompletionDate = row.date;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      if (checkingCurrent) {
        checkingCurrent = false;
      }
      tempStreak = 0;
    }
  }

  return { currentStreak, longestStreak, lastCompletionDate };
}

/**
 * GET /api/households/:householdId/analytics
 * Get comprehensive analytics for a household
 */
async function getHouseholdAnalytics(
  request: FastifyRequest<GetAnalyticsRequest>,
  reply: FastifyReply,
) {
  const { householdId } = request.params;
  const period = (request.query.period || 'week') as AnalyticsPeriod;

  try {
    const { startDate, endDate, previousStartDate, previousEndDate } = getDateRange(period);

    // 1. Period Comparison (current vs previous)
    const currentPeriodResult = await db.query(
      `SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'completed' THEN t.points ELSE 0 END) as total_points
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      WHERE ta.household_id = $1
        AND ta.date >= $2::date
        AND ta.date < $3::date`,
      [householdId, startDate, endDate],
    );

    const previousPeriodResult = await db.query(
      `SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'completed' THEN t.points ELSE 0 END) as total_points
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      WHERE ta.household_id = $1
        AND ta.date >= $2::date
        AND ta.date < $3::date`,
      [householdId, previousStartDate, previousEndDate],
    );

    const currentStats = currentPeriodResult.rows[0];
    const previousStats = previousPeriodResult.rows[0];

    const currentTotal = parseInt(currentStats.total_tasks || '0', 10);
    const currentCompleted = parseInt(currentStats.completed_tasks || '0', 10);
    const currentPoints = parseInt(currentStats.total_points || '0', 10);
    const currentRate = currentTotal > 0 ? Math.round((currentCompleted / currentTotal) * 100) : 0;

    const previousTotal = parseInt(previousStats.total_tasks || '0', 10);
    const previousCompleted = parseInt(previousStats.completed_tasks || '0', 10);
    const previousPoints = parseInt(previousStats.total_points || '0', 10);
    const previousRate =
      previousTotal > 0 ? Math.round((previousCompleted / previousTotal) * 100) : 0;

    const periodComparison: PeriodComparison = {
      current: {
        totalTasks: currentTotal,
        completedTasks: currentCompleted,
        completionRate: currentRate,
        totalPoints: currentPoints,
      },
      previous: {
        totalTasks: previousTotal,
        completedTasks: previousCompleted,
        completionRate: previousRate,
        totalPoints: previousPoints,
      },
      change: {
        completionRateDelta: currentRate - previousRate,
        pointsDelta: currentPoints - previousPoints,
        tasksDelta: currentTotal - previousTotal,
      },
    };

    // 2. Children Progress History
    const childrenResult = await db.query(
      'SELECT id, name FROM children WHERE household_id = $1 ORDER BY name',
      [householdId],
    );

    const childrenProgress: ChildProgressHistory[] = [];

    for (const child of childrenResult.rows) {
      const dailyDataResult = await db.query(
        `SELECT
          ta.date,
          COUNT(*) as total_tasks,
          SUM(CASE WHEN ta.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE WHEN ta.status = 'completed' THEN t.points ELSE 0 END) as points_earned
        FROM task_assignments ta
        JOIN tasks t ON ta.task_id = t.id
        WHERE ta.child_id = $1
          AND ta.household_id = $2
          AND ta.date >= $3::date
          AND ta.date < $4::date
        GROUP BY ta.date
        ORDER BY ta.date`,
        [child.id, householdId, startDate, endDate],
      );

      const dailyData: DailyCompletion[] = dailyDataResult.rows.map((row) => {
        const total = parseInt(row.total_tasks || '0', 10);
        const completed = parseInt(row.completed_tasks || '0', 10);
        return {
          date: row.date,
          totalTasks: total,
          completedTasks: completed,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          pointsEarned: parseInt(row.points_earned || '0', 10),
        };
      });

      const totalPointsEarned = dailyData.reduce((sum, day) => sum + day.pointsEarned, 0);
      const averageCompletionRate =
        dailyData.length > 0
          ? Math.round(
              dailyData.reduce((sum, day) => sum + day.completionRate, 0) / dailyData.length,
            )
          : 0;

      childrenProgress.push({
        childId: child.id,
        childName: child.name,
        dailyData,
        totalPointsEarned,
        averageCompletionRate,
      });
    }

    // 3. Streaks for each child
    const streaks: ChildStreak[] = [];
    for (const child of childrenResult.rows) {
      const streakData = await calculateStreak(child.id, householdId);
      streaks.push({
        childId: child.id,
        childName: child.name,
        ...streakData,
      });
    }

    // 4. Task Popularity
    const taskPopularityResult = await db.query(
      `SELECT
        t.id as task_id,
        t.name as task_name,
        COUNT(ta.id) as total_assignments,
        SUM(CASE WHEN ta.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        AVG(t.points) as average_points
      FROM tasks t
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
        AND ta.date >= $2::date
        AND ta.date < $3::date
      WHERE t.household_id = $1 AND t.active = true
      GROUP BY t.id, t.name
      HAVING COUNT(ta.id) > 0
      ORDER BY completed_count DESC, t.name`,
      [householdId, startDate, endDate],
    );

    const taskPopularity: TaskPopularity[] = taskPopularityResult.rows.map((row) => {
      const total = parseInt(row.total_assignments || '0', 10);
      const completed = parseInt(row.completed_count || '0', 10);
      return {
        taskId: row.task_id,
        taskName: row.task_name,
        totalAssignments: total,
        completedCount: completed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        averagePoints: parseFloat(row.average_points || '0'),
      };
    });

    const analytics: HouseholdAnalytics = {
      householdId,
      period,
      periodComparison,
      childrenProgress,
      streaks,
      taskPopularity,
      generatedAt: new Date().toISOString(),
    };

    return reply.send(analytics);
  } catch (error) {
    request.log.error(error, 'Failed to get household analytics');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve analytics data',
    });
  }
}

/**
 * GET /api/children/me/analytics
 * Get analytics for the authenticated child
 */
async function getChildAnalytics(
  request: FastifyRequest<GetChildAnalyticsRequest>,
  reply: FastifyReply,
) {
  const userId = request.user?.userId;

  if (!userId) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  try {
    const period = (request.query.period || 'week') as AnalyticsPeriod;
    const { startDate, endDate } = getDateRange(period);

    // Get child profile
    const childResult = await db.query(
      'SELECT id, household_id, name FROM children WHERE user_id = $1',
      [userId],
    );

    if (childResult.rows.length === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Child profile not found',
      });
    }

    const child = childResult.rows[0];
    const childId = child.id;
    const householdId = child.household_id;
    const childName = child.name;

    // Calculate streaks
    const streakData = await calculateStreak(childId, householdId);

    // Get week progress
    const weekRange = getDateRange('week');
    const weekProgressResult = await db.query(
      `SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN ta.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN ta.status = 'completed' THEN t.points ELSE 0 END) as points_earned
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      WHERE ta.child_id = $1
        AND ta.household_id = $2
        AND ta.date >= $3::date
        AND ta.date < $4::date`,
      [childId, householdId, weekRange.startDate, weekRange.endDate],
    );

    const weekStats = weekProgressResult.rows[0];
    const weekTotal = parseInt(weekStats.total_tasks || '0', 10);
    const weekCompleted = parseInt(weekStats.completed_tasks || '0', 10);
    const weekPoints = parseInt(weekStats.points_earned || '0', 10);

    // Get month progress
    const monthRange = getDateRange('month');
    const monthProgressResult = await db.query(
      `SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN ta.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN ta.status = 'completed' THEN t.points ELSE 0 END) as points_earned
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      WHERE ta.child_id = $1
        AND ta.household_id = $2
        AND ta.date >= $3::date
        AND ta.date < $4::date`,
      [childId, householdId, monthRange.startDate, monthRange.endDate],
    );

    const monthStats = monthProgressResult.rows[0];
    const monthTotal = parseInt(monthStats.total_tasks || '0', 10);
    const monthCompleted = parseInt(monthStats.completed_tasks || '0', 10);
    const monthPoints = parseInt(monthStats.points_earned || '0', 10);

    // Get daily points for the selected period
    const dailyPointsResult = await db.query(
      `SELECT
        ta.date,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN ta.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN ta.status = 'completed' THEN t.points ELSE 0 END) as points_earned
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      WHERE ta.child_id = $1
        AND ta.household_id = $2
        AND ta.date >= $3::date
        AND ta.date < $4::date
      GROUP BY ta.date
      ORDER BY ta.date`,
      [childId, householdId, startDate, endDate],
    );

    const dailyPoints: DailyCompletion[] = dailyPointsResult.rows.map((row) => {
      const total = parseInt(row.total_tasks || '0', 10);
      const completed = parseInt(row.completed_tasks || '0', 10);
      return {
        date: row.date,
        totalTasks: total,
        completedTasks: completed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        pointsEarned: parseInt(row.points_earned || '0', 10),
      };
    });

    const analytics: ChildAnalytics = {
      childId,
      childName,
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      weekProgress: {
        totalTasks: weekTotal,
        completedTasks: weekCompleted,
        completionRate: weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0,
        pointsEarned: weekPoints,
      },
      monthProgress: {
        totalTasks: monthTotal,
        completedTasks: monthCompleted,
        completionRate: monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0,
        pointsEarned: monthPoints,
      },
      dailyPoints,
      generatedAt: new Date().toISOString(),
    };

    return reply.send(analytics);
  } catch (error) {
    request.log.error(error, 'Failed to get child analytics');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve analytics data',
    });
  }
}

/**
 * Register analytics routes
 */
export default async function analyticsRoutes(server: FastifyInstance) {
  const HouseholdParamsSchema = z.object({ householdId: z.string().uuid() });
  const AnalyticsQuerySchema = z.object({ period: AnalyticsPeriodSchema.optional() });

  // Get household analytics
  server.get('/api/households/:householdId/analytics', {
    schema: stripResponseValidation({
      summary: 'Get household analytics',
      description: 'Get comprehensive analytics and reporting data for a household',
      tags: ['analytics'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(HouseholdParamsSchema),
      querystring: zodToOpenAPI(AnalyticsQuerySchema),
      response: {
        200: zodToOpenAPI(HouseholdAnalyticsSchema),
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership],
    handler: getHouseholdAnalytics,
  });

  // Get child analytics
  server.get('/api/children/me/analytics', {
    schema: stripResponseValidation({
      summary: 'Get child analytics',
      description: 'Get analytics data for the authenticated child',
      tags: ['analytics'],
      security: [{ bearerAuth: [] }],
      querystring: zodToOpenAPI(AnalyticsQuerySchema),
      response: {
        200: zodToOpenAPI(ChildAnalyticsSchema),
        ...CommonErrors.Unauthorized,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser],
    handler: getChildAnalytics,
  });
}
