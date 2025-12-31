import Fastify, { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { z } from 'zod';
import { pool } from './database.js';
import authRoutes from './routes/auth.js';
import householdRoutes from './routes/households.js';
import childrenRoutes from './routes/children.js';
import taskRoutes from './routes/tasks.js';
import singleTasksRoutes from './routes/single-tasks.js';
import { invitationRoutes } from './routes/invitations.js';
import assignmentRoutes from './routes/assignments.js';
import analyticsRoutes from './routes/analytics.js';
import rewardRoutes from './routes/rewards.js';
import statsRoutes from './routes/stats.js';
import userRoutes from './routes/user.js';
import { healthCheckSchema } from './schemas/auth.js';
import { isBaseError, InternalError } from './errors/index.js';
import type { ErrorResponse } from './types/error-response.js';
import { requestIdPlugin } from './middleware/request-id.js';
import { requestLoggerPlugin, getRequestContext } from './middleware/request-logger.js';
import { connectRedis, isRedisReady, disconnectRedis } from './core/redis.js';

// Extend FastifyRequest type to include user info
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
      role?: string;
    };
  }
}

// Build Fastify app with ALL routes
async function buildApp() {
  const fastify = Fastify({
    logger: true,
  });

  // Register CORS
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
  });

  // Register request ID middleware (must be first for tracing)
  await fastify.register(requestIdPlugin);

  // Register request logging middleware
  await fastify.register(requestLoggerPlugin);

  // Global error handler - centralized error handling for all routes
  fastify.setErrorHandler(
    (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
      const isProduction = process.env.NODE_ENV === 'production';

      // Get request context for logging
      const requestContext = getRequestContext(request);

      // Handle custom BaseError instances (our error classes)
      if (isBaseError(error)) {
        // Log error with request context
        request.log.error(
          {
            err: error,
            errorType: error.errorType,
            statusCode: error.statusCode,
            ...requestContext,
          },
          error.message,
        );

        const response: ErrorResponse = error.toJSON();
        return reply.code(error.statusCode).send(response);
      }

      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        request.log.warn(
          {
            err: error,
            ...requestContext,
          },
          'Validation error',
        );

        const response: ErrorResponse = {
          error: 'VALIDATION_ERROR',
          message: 'Validation failed',
          statusCode: 400,
          details: {
            validationErrors: error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
        };
        return reply.code(400).send(response);
      }

      // Handle Fastify-specific errors (e.g., schema validation)
      if ('statusCode' in error && typeof error.statusCode === 'number') {
        request.log.error(
          {
            err: error,
            statusCode: error.statusCode,
            ...requestContext,
          },
          error.message,
        );

        const response: ErrorResponse = {
          error: error.code || 'REQUEST_ERROR',
          message: isProduction ? 'Request failed' : error.message,
          statusCode: error.statusCode,
        };
        return reply.code(error.statusCode).send(response);
      }

      // Handle unexpected errors (500)
      request.log.error(
        {
          err: error,
          ...requestContext,
          stack: error.stack,
        },
        'Unhandled error',
      );

      const response: ErrorResponse = {
        error: 'INTERNAL_ERROR',
        message: isProduction ? 'Internal server error' : error.message,
        statusCode: 500,
      };
      return reply.code(500).send(response);
    },
  );

  // Register Swagger for API documentation (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: 'Diddit API',
          description: 'Multi-tenant household chores management API',
          version: '1.0.0',
        },
        servers: [
          {
            url: 'http://localhost:3000',
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        tags: [
          { name: 'auth', description: 'Authentication endpoints' },
          { name: 'user', description: 'User profile management' },
          { name: 'households', description: 'Household management' },
          { name: 'children', description: 'Child profile management' },
          { name: 'tasks', description: 'Task template management' },
          { name: 'assignments', description: 'Task assignment management' },
          { name: 'rewards', description: 'Rewards and points redemption system' },
          { name: 'invitations', description: 'Household invitation system' },
        ],
      },
    });
  }

  // Register Swagger UI (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    await fastify.register(swaggerUi, {
      routePrefix: '/api/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
      staticCSP: true,
    });
  }

  // Register auth routes with /api/auth prefix
  await fastify.register(authRoutes, { prefix: '/api/auth' });

  // Register household, children, invitation, task, assignment, rewards, and analytics routes
  await fastify.register(householdRoutes);
  await fastify.register(childrenRoutes);
  await fastify.register(taskRoutes);
  await fastify.register(singleTasksRoutes);
  await fastify.register(invitationRoutes);
  await fastify.register(assignmentRoutes);
  await fastify.register(rewardRoutes);
  await fastify.register(analyticsRoutes);
  await fastify.register(statsRoutes);
  await fastify.register(userRoutes);

  // Example items endpoint - demonstrates new error handling pattern
  interface Item {
    id: number;
    title: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }

  fastify.get<{ Reply: { items: Item[] } }>('/api/items', async () => {
    // With global error handler, we can throw errors directly
    // No try-catch needed - errors bubble up to the global handler
    try {
      const result = await pool.query<Item>(
        `SELECT id, title, description,
           created_at as "createdAt", updated_at as "updatedAt"
           FROM items ORDER BY created_at DESC`,
      );
      return { items: result.rows };
    } catch (error) {
      // Wrap unexpected errors with context
      throw InternalError.wrap(error, 'Failed to fetch items');
    }
  });

  // Health Check Endpoints

  // Basic health check with database and Redis connectivity
  fastify.get(
    '/health',
    {
      schema: healthCheckSchema,
    },
    async () => {
      // Check database connectivity
      let dbStatus: 'connected' | 'disconnected' = 'disconnected';
      try {
        await pool.query('SELECT 1');
        dbStatus = 'connected';
      } catch (error) {
        fastify.log.error({ err: error }, 'Health check: database connection failed');
      }

      // Check Redis connectivity
      const redisStatus: 'connected' | 'disconnected' = isRedisReady()
        ? 'connected'
        : 'disconnected';

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        redis: redisStatus,
      };
    },
  );

  // Database health check with schema validation
  fastify.get('/health/database', async (request, reply) => {
    const healthCheck = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        responseTime: 0,
        error: undefined as string | undefined,
      },
      migrations: {
        applied: [] as string[],
        latest: null as string | null,
        count: 0,
        warning: undefined as string | undefined,
      },
      schema: {
        critical_tables: [] as Array<{ name: string; exists: boolean }>,
        all_tables_exist: false,
      },
    };

    try {
      // Check database connectivity
      const startTime = Date.now();
      try {
        await pool.query('SELECT 1');
        healthCheck.database.connected = true;
        healthCheck.database.responseTime = Date.now() - startTime;
      } catch (error) {
        healthCheck.database.connected = false;
        healthCheck.database.error = error instanceof Error ? error.message : 'Connection failed';
        healthCheck.status = 'unhealthy';
        return reply.code(503).send(healthCheck);
      }

      // Check migrations
      try {
        const result = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
        healthCheck.migrations.applied = result.rows.map((row) => row.version);
        healthCheck.migrations.count = result.rows.length;
        healthCheck.migrations.latest = result.rows[result.rows.length - 1]?.version || null;

        // Expected migrations: 000, 001, 011-016 = 8 total
        const expectedCount = 8;
        if (healthCheck.migrations.count < expectedCount) {
          healthCheck.migrations.warning = `Expected ${expectedCount} migrations, only ${healthCheck.migrations.count} applied`;
          healthCheck.status = 'degraded';
        }
      } catch (error) {
        healthCheck.migrations.warning = 'schema_migrations table not found';
        healthCheck.status = 'degraded';
      }

      // Check critical tables exist
      const criticalTables = [
        'users',
        'households',
        'household_members',
        'children',
        'tasks',
        'task_assignments',
        'task_completions',
      ];

      for (const tableName of criticalTables) {
        try {
          const result = await pool.query(
            `SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_name = $1
            )`,
            [tableName],
          );
          const exists = result.rows[0]?.exists || false;
          healthCheck.schema.critical_tables.push({ name: tableName, exists });
        } catch (error) {
          healthCheck.schema.critical_tables.push({ name: tableName, exists: false });
        }
      }

      healthCheck.schema.all_tables_exist = healthCheck.schema.critical_tables.every(
        (t) => t.exists,
      );

      if (!healthCheck.schema.all_tables_exist) {
        healthCheck.status = 'degraded';
      }

      // Return appropriate status code
      const statusCode = healthCheck.status === 'unhealthy' ? 503 : 200;
      return reply.code(statusCode).send(healthCheck);
    } catch (error) {
      fastify.log.error({ error }, 'Health check failed');
      return reply.code(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return fastify;
}

// Create module-level instance for direct server execution
const fastify = await buildApp();

// Export build function for testing
export async function build() {
  return buildApp();
}

// Start server only if this module is run directly (not imported for tests)
const start = async () => {
  try {
    // Connect to Redis (for rate limiting)
    try {
      await connectRedis();
      console.log('Redis: Connection established');
    } catch (err) {
      // Redis is optional - server can still function without it
      console.warn('Redis: Failed to connect, rate limiting will be disabled');
      fastify.log.warn({ err }, 'Redis connection failed');
    }

    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`Server listening on ${host}:${port}`);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`${signal} received, shutting down gracefully...`);
      await fastify.close();
      await disconnectRedis();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Only start server if running directly (not imported by tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
