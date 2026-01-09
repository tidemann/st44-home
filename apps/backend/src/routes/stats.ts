import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z, zodToOpenAPI, CommonErrors } from '@st44/types/generators';
import { db } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import { stripResponseValidation } from '../schemas/common.js';

/**
 * Stats API endpoints for UX redesign dashboard
 * Provides dashboard statistics, leaderboard, and achievements data
 */

interface DashboardQuerystring {
  householdId?: string;
}

interface LeaderboardQuerystring {
  householdId?: string;
  period?: 'week' | 'month' | 'alltime';
}

interface AchievementsQuerystring {
  userId?: string;
  householdId?: string;
}

// Achievement definitions
const ACHIEVEMENTS = [
  {
    id: 'first_task',
    name: 'First Steps',
    description: 'Complete your first task',
    icon: '🌟',
    requirement: 1,
    type: 'tasks_completed' as const,
  },
  {
    id: 'task_master_10',
    name: 'Task Master',
    description: 'Complete 10 tasks',
    icon: '⭐',
    requirement: 10,
    type: 'tasks_completed' as const,
  },
  {
    id: 'task_champion_50',
    name: 'Task Champion',
    description: 'Complete 50 tasks',
    icon: '🏆',
    requirement: 50,
    type: 'tasks_completed' as const,
  },
  {
    id: 'task_legend_100',
    name: 'Task Legend',
    description: 'Complete 100 tasks',
    icon: '👑',
    requirement: 100,
    type: 'tasks_completed' as const,
  },
  {
    id: 'point_collector_100',
    name: 'Point Collector',
    description: 'Earn 100 points',
    icon: '💎',
    requirement: 100,
    type: 'points_earned' as const,
  },
  {
    id: 'point_hoarder_500',
    name: 'Point Hoarder',
    description: 'Earn 500 points',
    icon: '💰',
    requirement: 500,
    type: 'points_earned' as const,
  },
  {
    id: 'streak_3',
    name: 'On a Roll',
    description: 'Complete all tasks for 3 days in a row',
    icon: '🔥',
    requirement: 3,
    type: 'streak' as const,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Complete all tasks for 7 days in a row',
    icon: '💪',
    requirement: 7,
    type: 'streak' as const,
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Complete all tasks for 30 days in a row',
    icon: '🎯',
    requirement: 30,
    type: 'streak' as const,
  },
];

/**
 * Helper to get user's household ID
 */
async function getUserHouseholdId(
  userId: string,
  requestedHouseholdId?: string,
): Promise<string | null> {
  if (requestedHouseholdId) {
    // Verify user is member of requested household
    const result = await db.query(
      'SELECT household_id FROM household_members WHERE user_id = $1 AND household_id = $2',
      [userId, requestedHouseholdId],
    );
    return result.rows.length > 0 ? requestedHouseholdId : null;
  }

  // Get first household user belongs to
  const result = await db.query(
    'SELECT household_id FROM household_members WHERE user_id = $1 LIMIT 1',
    [userId],
  );
  return result.rows.length > 0 ? result.rows[0].household_id : null;
}

/**
 * Calculate streak for a child
 */
async function calculateStreak(childId: string, householdId: string): Promise<number> {
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
        CASE WHEN total_tasks = completed_tasks AND total_tasks > 0 THEN 1 ELSE 0 END as completed_all
      FROM daily_completion
    )
    SELECT date, completed_all
    FROM completion_status
    ORDER BY date DESC
    LIMIT 90`,
    [childId, householdId],
  );

  let streak = 0;
  for (const row of result.rows) {
    if (row.completed_all === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * GET /api/stats/dashboard
 * Get dashboard statistics for current user's household
 */
async function getDashboardStats(
  request: FastifyRequest<{ Querystring: DashboardQuerystring }>,
  reply: FastifyReply,
) {
  const userId = request.user?.userId;

  if (!userId) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  try {
    const householdId = await getUserHouseholdId(userId, request.query.householdId);

    if (!householdId) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'No household found for user',
      });
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Calculate start of current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Get active tasks count
    const activeTasksResult = await db.query(
      `SELECT COUNT(*) as count
       FROM task_assignments
       WHERE household_id = $1 AND date = $2 AND status = 'pending'`,
      [householdId, today],
    );
    const activeTasks = parseInt(activeTasksResult.rows[0]?.count || '0', 10);

    // Get weekly completed tasks count
    const weeklyCompletedResult = await db.query(
      `SELECT COUNT(*) as count
       FROM task_assignments
       WHERE household_id = $1 AND date >= $2 AND status = 'completed'`,
      [householdId, weekStartStr],
    );
    const weeklyCompleted = parseInt(weeklyCompletedResult.rows[0]?.count || '0', 10);

    // Get total points earned this week
    const totalPointsResult = await db.query(
      `SELECT COALESCE(SUM(tc.points_earned), 0) as total
       FROM task_completions tc
       WHERE tc.household_id = $1 AND tc.completed_at >= $2`,
      [householdId, weekStartStr],
    );
    const totalPoints = parseInt(totalPointsResult.rows[0]?.total || '0', 10);

    // Get today's tasks
    const todaysTasksResult = await db.query(
      `SELECT
        ta.id,
        t.name as title,
        t.description,
        t.points,
        ta.status,
        c.name as assignee_name,
        c.id as assignee_id
       FROM task_assignments ta
       JOIN tasks t ON ta.task_id = t.id
       LEFT JOIN children c ON ta.child_id = c.id
       WHERE ta.household_id = $1 AND ta.date = $2
       ORDER BY ta.status ASC, t.name ASC
       LIMIT 10`,
      [householdId, today],
    );

    const todaysTasks = todaysTasksResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      points: row.points,
      status: row.status,
      assigneeName: row.assignee_name,
      assigneeId: row.assignee_id,
    }));

    // Get upcoming tasks (next 7 days excluding today)
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const upcomingTasksResult = await db.query(
      `SELECT
        ta.id,
        t.name as title,
        t.description,
        t.points,
        ta.date,
        ta.status,
        c.name as assignee_name,
        c.id as assignee_id
       FROM task_assignments ta
       JOIN tasks t ON ta.task_id = t.id
       LEFT JOIN children c ON ta.child_id = c.id
       WHERE ta.household_id = $1 AND ta.date >= $2 AND ta.date < $3
       ORDER BY ta.date ASC, t.name ASC
       LIMIT 10`,
      [householdId, tomorrowStr, nextWeekStr],
    );

    const upcomingTasks = upcomingTasksResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      points: row.points,
      date: row.date,
      status: row.status,
      assigneeName: row.assignee_name,
      assigneeId: row.assignee_id,
    }));

    return reply.send({
      activeTasks,
      weeklyCompleted,
      totalPoints,
      todaysTasks,
      upcomingTasks,
    });
  } catch (error) {
    request.log.error(error, 'Failed to get dashboard stats');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve dashboard statistics',
    });
  }
}

/**
 * GET /api/stats/leaderboard
 * Get leaderboard rankings for household
 */
async function getLeaderboard(
  request: FastifyRequest<{ Querystring: LeaderboardQuerystring }>,
  reply: FastifyReply,
) {
  const userId = request.user?.userId;

  if (!userId) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  try {
    const householdId = await getUserHouseholdId(userId, request.query.householdId);

    if (!householdId) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'No household found for user',
      });
    }

    const period = request.query.period || 'week';

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    if (period === 'week') {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(now);
      startDate.setDate(now.getDate() + mondayOffset);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // alltime - use a far past date
      startDate = new Date('2020-01-01');
    }

    const startDateStr = startDate.toISOString().split('T')[0];

    // Get rankings with points and tasks completed
    const result = await db.query(
      `SELECT
        c.id as user_id,
        c.name,
        COALESCE(SUM(tc.points_earned), 0) as points,
        COUNT(tc.id) as tasks_completed
       FROM children c
       LEFT JOIN task_completions tc ON c.id = tc.child_id AND tc.completed_at >= $2
       WHERE c.household_id = $1
       GROUP BY c.id, c.name
       ORDER BY points DESC, tasks_completed DESC, c.name ASC`,
      [householdId, startDateStr],
    );

    const rankings = result.rows.map((row) => ({
      userId: row.user_id,
      name: row.name,
      points: parseInt(row.points || '0', 10),
      tasksCompleted: parseInt(row.tasks_completed || '0', 10),
    }));

    return reply.send({ rankings });
  } catch (error) {
    request.log.error(error, 'Failed to get leaderboard');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve leaderboard',
    });
  }
}

/**
 * GET /api/stats/achievements
 * Get achievements for a user (child)
 */
async function getAchievements(
  request: FastifyRequest<{ Querystring: AchievementsQuerystring }>,
  reply: FastifyReply,
) {
  const currentUserId = request.user?.userId;

  if (!currentUserId) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  try {
    const householdId = await getUserHouseholdId(currentUserId, request.query.householdId);

    if (!householdId) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'No household found for user',
      });
    }

    // If userId specified, get that child's achievements
    // Otherwise get achievements for the current user's child profile
    let childId: string | null = null;

    if (request.query.userId) {
      // Verify requested child belongs to same household
      const childResult = await db.query(
        'SELECT id FROM children WHERE id = $1 AND household_id = $2',
        [request.query.userId, householdId],
      );

      if (childResult.rows.length === 0) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found in household',
        });
      }
      childId = request.query.userId;
    } else {
      // Get child profile for current user
      const childResult = await db.query(
        'SELECT id FROM children WHERE user_id = $1 AND household_id = $2',
        [currentUserId, householdId],
      );

      if (childResult.rows.length > 0) {
        childId = childResult.rows[0].id;
      }
    }

    if (!childId) {
      // User is not a child - return empty achievements
      return reply.send({
        unlocked: [],
        locked: ACHIEVEMENTS.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
        })),
        progress: [],
      });
    }

    // Get child's stats for achievement progress
    const statsResult = await db.query(
      `SELECT
        COUNT(tc.id) as tasks_completed,
        COALESCE(SUM(tc.points_earned), 0) as points_earned
       FROM task_completions tc
       WHERE tc.child_id = $1`,
      [childId],
    );

    const tasksCompleted = parseInt(statsResult.rows[0]?.tasks_completed || '0', 10);
    const pointsEarned = parseInt(statsResult.rows[0]?.points_earned || '0', 10);

    // Calculate streak
    const currentStreak = await calculateStreak(childId, householdId);

    // Determine achievement status
    const unlocked: typeof ACHIEVEMENTS = [];
    const locked: typeof ACHIEVEMENTS = [];
    const progress: { achievementId: string; current: number; required: number }[] = [];

    for (const achievement of ACHIEVEMENTS) {
      let current = 0;

      if (achievement.type === 'tasks_completed') {
        current = tasksCompleted;
      } else if (achievement.type === 'points_earned') {
        current = pointsEarned;
      } else if (achievement.type === 'streak') {
        current = currentStreak;
      }

      if (current >= achievement.requirement) {
        unlocked.push(achievement);
      } else {
        locked.push(achievement);
        progress.push({
          achievementId: achievement.id,
          current,
          required: achievement.requirement,
        });
      }
    }

    return reply.send({
      unlocked: unlocked.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
      })),
      locked: locked.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
      })),
      progress,
    });
  } catch (error) {
    request.log.error(error, 'Failed to get achievements');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve achievements',
    });
  }
}

/**
 * Register stats routes
 */
export default async function statsRoutes(server: FastifyInstance) {
  // Define schemas
  const DashboardQuerySchema = z.object({
    householdId: z.string().uuid().optional(),
  });

  const LeaderboardQuerySchema = z.object({
    householdId: z.string().uuid().optional(),
    period: z.enum(['week', 'month', 'alltime']).optional(),
  });

  const AchievementsQuerySchema = z.object({
    userId: z.string().uuid().optional(),
    householdId: z.string().uuid().optional(),
  });

  const DashboardResponseSchema = z.object({
    activeTasks: z.number(),
    weeklyCompleted: z.number(),
    totalPoints: z.number(),
    todaysTasks: z.array(
      z.object({
        id: z.string().uuid(),
        title: z.string(),
        description: z.string().nullable(),
        points: z.number(),
        status: z.string(),
        assigneeName: z.string().nullable(),
        assigneeId: z.string().uuid().nullable(),
      }),
    ),
    upcomingTasks: z.array(
      z.object({
        id: z.string().uuid(),
        title: z.string(),
        description: z.string().nullable(),
        points: z.number(),
        date: z.string(),
        status: z.string(),
        assigneeName: z.string().nullable(),
        assigneeId: z.string().uuid().nullable(),
      }),
    ),
  });

  const LeaderboardResponseSchema = z.object({
    rankings: z.array(
      z.object({
        userId: z.string().uuid(),
        name: z.string(),
        points: z.number(),
        tasksCompleted: z.number(),
      }),
    ),
  });

  const AchievementSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    icon: z.string(),
  });

  const AchievementsResponseSchema = z.object({
    unlocked: z.array(AchievementSchema),
    locked: z.array(AchievementSchema),
    progress: z.array(
      z.object({
        achievementId: z.string(),
        current: z.number(),
        required: z.number(),
      }),
    ),
  });

  // Dashboard stats endpoint
  server.get('/api/stats/dashboard', {
    schema: stripResponseValidation({
      summary: 'Get dashboard statistics',
      description:
        'Get dashboard statistics including active tasks, weekly completed, and upcoming tasks',
      tags: ['stats'],
      security: [{ bearerAuth: [] }],
      querystring: zodToOpenAPI(DashboardQuerySchema),
      response: {
        200: zodToOpenAPI(DashboardResponseSchema),
        ...CommonErrors.Unauthorized,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser],
    handler: getDashboardStats,
  });

  // Leaderboard endpoint
  server.get('/api/stats/leaderboard', {
    schema: stripResponseValidation({
      summary: 'Get leaderboard rankings',
      description: 'Get leaderboard rankings for household members by period',
      tags: ['stats'],
      security: [{ bearerAuth: [] }],
      querystring: zodToOpenAPI(LeaderboardQuerySchema),
      response: {
        200: zodToOpenAPI(LeaderboardResponseSchema),
        ...CommonErrors.Unauthorized,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser],
    handler: getLeaderboard,
  });

  // Achievements endpoint
  server.get('/api/stats/achievements', {
    schema: stripResponseValidation({
      summary: 'Get user achievements',
      description: 'Get unlocked and locked achievements with progress',
      tags: ['stats'],
      security: [{ bearerAuth: [] }],
      querystring: zodToOpenAPI(AchievementsQuerySchema),
      response: {
        200: zodToOpenAPI(AchievementsResponseSchema),
        ...CommonErrors.Unauthorized,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser],
    handler: getAchievements,
  });
}
