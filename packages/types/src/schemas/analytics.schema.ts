/**
 * Analytics Schemas
 *
 * Zod schemas for analytics and reporting endpoints.
 * Provides validation for analytics requests and responses.
 */

import { z } from 'zod';

/**
 * Period for analytics queries
 */
export const AnalyticsPeriodSchema = z.enum(['week', 'month', 'all']);
export type AnalyticsPeriod = z.infer<typeof AnalyticsPeriodSchema>;

/**
 * Request schema for analytics endpoint
 */
export const AnalyticsRequestSchema = z.object({
  period: AnalyticsPeriodSchema.optional().default('week'),
});
export type AnalyticsRequest = z.infer<typeof AnalyticsRequestSchema>;

/**
 * Child's streak information
 */
export const ChildStreakSchema = z.object({
  childId: z.string().uuid(),
  childName: z.string(),
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  lastCompletionDate: z.string().nullable(),
});
export type ChildStreak = z.infer<typeof ChildStreakSchema>;

/**
 * Daily completion data point for trends
 */
export const DailyCompletionSchema = z.object({
  date: z.string(), // YYYY-MM-DD format
  totalTasks: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
  completionRate: z.number().min(0).max(100),
  pointsEarned: z.number().int().min(0),
});
export type DailyCompletion = z.infer<typeof DailyCompletionSchema>;

/**
 * Child's progress history with daily data points
 */
export const ChildProgressHistorySchema = z.object({
  childId: z.string().uuid(),
  childName: z.string(),
  dailyData: z.array(DailyCompletionSchema),
  totalPointsEarned: z.number().int().min(0),
  averageCompletionRate: z.number().min(0).max(100),
});
export type ChildProgressHistory = z.infer<typeof ChildProgressHistorySchema>;

/**
 * Task popularity metrics
 */
export const TaskPopularitySchema = z.object({
  taskId: z.string().uuid(),
  taskName: z.string(),
  totalAssignments: z.number().int().min(0),
  completedCount: z.number().int().min(0),
  completionRate: z.number().min(0).max(100),
  averagePoints: z.number().min(0),
});
export type TaskPopularity = z.infer<typeof TaskPopularitySchema>;

/**
 * Period comparison data (current vs previous)
 */
export const PeriodComparisonSchema = z.object({
  current: z.object({
    totalTasks: z.number().int().min(0),
    completedTasks: z.number().int().min(0),
    completionRate: z.number().min(0).max(100),
    totalPoints: z.number().int().min(0),
  }),
  previous: z.object({
    totalTasks: z.number().int().min(0),
    completedTasks: z.number().int().min(0),
    completionRate: z.number().min(0).max(100),
    totalPoints: z.number().int().min(0),
  }),
  change: z.object({
    completionRateDelta: z.number(),
    pointsDelta: z.number().int(),
    tasksDelta: z.number().int(),
  }),
});
export type PeriodComparison = z.infer<typeof PeriodComparisonSchema>;

/**
 * Complete analytics response
 */
export const HouseholdAnalyticsSchema = z.object({
  householdId: z.string().uuid(),
  period: AnalyticsPeriodSchema,
  periodComparison: PeriodComparisonSchema,
  childrenProgress: z.array(ChildProgressHistorySchema),
  streaks: z.array(ChildStreakSchema),
  taskPopularity: z.array(TaskPopularitySchema),
  generatedAt: z.string(), // ISO timestamp
});
export type HouseholdAnalytics = z.infer<typeof HouseholdAnalyticsSchema>;

/**
 * Child analytics for child dashboard
 */
export const ChildAnalyticsSchema = z.object({
  childId: z.string().uuid(),
  childName: z.string(),
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  weekProgress: z.object({
    totalTasks: z.number().int().min(0),
    completedTasks: z.number().int().min(0),
    completionRate: z.number().min(0).max(100),
    pointsEarned: z.number().int().min(0),
  }),
  monthProgress: z.object({
    totalTasks: z.number().int().min(0),
    completedTasks: z.number().int().min(0),
    completionRate: z.number().min(0).max(100),
    pointsEarned: z.number().int().min(0),
  }),
  dailyPoints: z.array(DailyCompletionSchema),
  generatedAt: z.string(),
});
export type ChildAnalytics = z.infer<typeof ChildAnalyticsSchema>;
