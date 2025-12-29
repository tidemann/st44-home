import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { pool } from './database.js';
import authRoutes from './routes/auth.js';
import householdRoutes from './routes/households.js';
import childrenRoutes from './routes/children.js';
import taskRoutes from './routes/tasks.js';
import { invitationRoutes } from './routes/invitations.js';
import assignmentRoutes from './routes/assignments.js';
import analyticsRoutes from './routes/analytics.js';
import rewardRoutes from './routes/rewards.js';
import statsRoutes from './routes/stats.js';
import userRoutes from './routes/user.js';
import { healthCheckSchema } from './schemas/auth.js';

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
  await fastify.register(invitationRoutes);
  await fastify.register(assignmentRoutes);
  await fastify.register(rewardRoutes);
  await fastify.register(analyticsRoutes);
  await fastify.register(statsRoutes);
  await fastify.register(userRoutes);

  // Example items endpoint
  interface Item {
    id: number;
    title: string;
    description: string | null;
    created_at: Date;
    updated_at: Date;
  }

  fastify.get<{ Reply: { items: Item[] } | { error: string } }>(
    '/api/items',
    async (request, reply) => {
      try {
        const result = await pool.query<Item>('SELECT * FROM items ORDER BY created_at DESC');
        return { items: result.rows };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { error: 'Failed to fetch items' };
      }
    },
  );

  // Health Check Endpoints

  // Basic health check with database connectivity
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

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbStatus,
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
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Only start server if running directly (not imported by tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
