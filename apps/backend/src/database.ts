import pg from 'pg';

const { Pool } = pg;

// Database connection pool
// Prioritize TEST_DB_* variables for test environment, fall back to DB_* for production
// Default port 55432 matches local test database docker-compose mapping
export const db = new Pool({
  host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || process.env.DB_PORT || '55432', 10),
  database: process.env.TEST_DB_NAME || process.env.DB_NAME || 'st44_test',
  user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
});

// Export pool for backward compatibility
export const pool = db;
