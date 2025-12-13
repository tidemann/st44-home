import Fastify from 'fastify';
import cors from '@fastify/cors';
import pg from 'pg';

const { Pool } = pg;

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'st44',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Create Fastify instance
const fastify = Fastify({
  logger: true,
});

// Register CORS
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  try {
    await pool.query('SELECT 1');
    return { status: 'ok', database: 'connected' };
  } catch (error) {
    reply.code(503);
    return { status: 'error', database: 'disconnected', error: error.message };
  }
});

// Example API endpoint
fastify.get('/api/items', async (request, reply) => {
  try {
    const result = await pool.query('SELECT * FROM items ORDER BY created_at DESC');
    return { items: result.rows };
  } catch (error) {
    fastify.log.error(error);
    reply.code(500);
    return { error: 'Failed to fetch items' };
  }
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`🚀 Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
