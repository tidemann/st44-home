# Backend - Agent Context

## Overview

Fastify-based REST API server built with TypeScript and ESM modules. Handles business logic, data access, and provides JSON APIs to the frontend. Uses PostgreSQL for data persistence with connection pooling.

## Architecture

```
server.ts (entry point)
    ├── Fastify instance
    ├── CORS plugin
    ├── Database pool (pg)
    ├── Route handlers
    └── Server startup
```

## Current Implementation

### Server Setup (`src/server.ts`)

**Database Connection**:

```typescript
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'st44',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});
```

**Fastify Configuration**:

- Logger enabled
- CORS configured (origin: `process.env.CORS_ORIGIN || '*'`)
- Top-level await used (ESM)

### Existing Endpoints

#### `GET /health`

Health check with database connectivity test.

**Response** (200):

```json
{ "status": "ok", "database": "connected" }
```

**Response** (503):

```json
{
  "status": "error",
  "database": "disconnected",
  "error": "error message"
}
```

#### `GET /api/items`

Returns all items from the `items` table, ordered by `created_at DESC`.

**Response** (200):

```json
{
  "items": [
    {
      "id": 1,
      "title": "Item title",
      "description": "Description",
      "created_at": "2025-12-13T...",
      "updated_at": "2025-12-13T..."
    }
  ]
}
```

**Response** (500):

```json
{ "error": "Failed to fetch items" }
```

## Conventions & Patterns

### Route Handler Pattern

```typescript
fastify.get<{ Reply: ResponseType }>('/api/route', async (request, reply) => {
  try {
    // Business logic
    const result = await pool.query<RowType>('SELECT ...');
    return { data: result.rows };
  } catch (error) {
    fastify.log.error(error);
    reply.code(500);
    return { error: 'Error message' };
  }
});
```

**Key Points**:

- Use TypeScript generics for type safety
- Always use try/catch
- Log errors with `fastify.log.error()`
- Return appropriate HTTP status codes
- Use async/await (no callbacks)
- Validate inputs (add validation as needed)

### Database Queries

**Always use parameterized queries**:

```typescript
// ✅ Good - prevents SQL injection
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// ❌ Bad - SQL injection risk
const result = await pool.query(`SELECT * FROM users WHERE id = ${userId}`);
```

**Type the result**:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const result = await pool.query<User>('SELECT * FROM users WHERE id = $1', [userId]);
// result.rows is now User[]
```

### Error Handling

**Standard pattern**:

```typescript
try {
  // Operation
} catch (error) {
  fastify.log.error(error);
  reply.code(500); // or appropriate code
  return { error: 'User-friendly message' };
}
```

**Status codes to use**:

- `200` - Success
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `409` - Conflict (duplicate)
- `500` - Server error
- `503` - Service unavailable

### Type Definitions

**Define interfaces for**:

- Database row types
- Request bodies
- Response types
- Query parameters

```typescript
interface CreateItemBody {
  title: string;
  description?: string;
}

interface ItemRow {
  id: number;
  title: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

fastify.post<{ Body: CreateItemBody }>('/api/items', async (request, reply) => {
  const { title, description } = request.body;
  // ...
});
```

## Environment Variables

Required:

- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password

Optional:

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `CORS_ORIGIN` - CORS origin (default: \*)

## File Organization

Current structure:

```
src/
├── server.ts           # Entry point, server setup
├── routes/             # Route handlers organized by feature
├── middleware/         # Request/response middleware
├── test-helpers/       # Testing utilities and fixtures
└── utils/              # Shared utility functions

scripts/                # Manual testing scripts (PowerShell)
├── README.md           # Script documentation
├── test-households.ps1 # Household CRUD testing
├── test-children-crud.ps1
└── test-household-membership.ps1
```

**scripts/ Directory**:

- PowerShell scripts for manual API testing
- Used during local development for quick verification
- Complement automated tests (not a replacement)
- Self-contained (create their own test data)
- See `scripts/README.md` for usage instructions

As the API grows further, organize into:

```
src/
├── server.ts           # Entry point, server setup
├── routes/
│   ├── items.ts        # Item routes
│   ├── users.ts        # User routes
│   └── ...
├── services/
│   ├── item-service.ts # Item business logic
│   └── ...
├── db/
│   ├── pool.ts         # Database pool instance
│   └── queries.ts      # Reusable queries
├── types/
│   └── index.ts        # Shared type definitions
└── middleware/
    └── auth.ts         # Authentication middleware
```

## Adding a New Endpoint

### 1. Define Types

```typescript
interface CreateUserBody {
  name: string;
  email: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  created_at: Date;
}
```

### 2. Create Route Handler

```typescript
fastify.post<{ Body: CreateUserBody }>('/api/users', async (request, reply) => {
  try {
    const { name, email } = request.body;

    // Validate
    if (!name || !email) {
      reply.code(400);
      return { error: 'Name and email are required' };
    }

    // Insert
    const result = await pool.query<User>(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email],
    );

    reply.code(201);
    return { user: result.rows[0] };
  } catch (error) {
    fastify.log.error(error);
    reply.code(500);
    return { error: 'Failed to create user' };
  }
});
```

### 3. Test Manually

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'
```

### 4. Update Frontend

Create/update service in `apps/frontend/src/app/services/`

## Database Access Patterns

### SELECT

```typescript
const result = await pool.query<User>('SELECT * FROM users WHERE active = $1', [true]);
const users = result.rows;
```

### INSERT

```typescript
const result = await pool.query<User>(
  'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
  [name, email],
);
const newUser = result.rows[0];
```

### UPDATE

```typescript
const result = await pool.query<User>('UPDATE users SET name = $1 WHERE id = $2 RETURNING *', [
  newName,
  userId,
]);
const updated = result.rows[0];
```

### DELETE

```typescript
await pool.query('DELETE FROM users WHERE id = $1', [userId]);
```

### Transaction (if needed)

```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO ...', [...]);
  await client.query('UPDATE ...', [...]);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

## Security Checklist

When adding endpoints:

- [ ] Use parameterized queries (never string concatenation)
- [ ] Validate all inputs (type, format, length)
- [ ] Sanitize user input
- [ ] Return appropriate error messages (don't leak details)
- [ ] Implement rate limiting for write operations
- [ ] Add authentication/authorization (when implemented)
- [ ] Test error cases
- [ ] Log security-relevant events

## Common Patterns

### Pagination

```typescript
fastify.get<{ Querystring: { page?: string; limit?: string } }>(
  '/api/items',
  async (request, reply) => {
    const page = parseInt(request.query.page || '1', 10);
    const limit = parseInt(request.query.limit || '10', 10);
    const offset = (page - 1) * limit;

    const result = await pool.query<Item>(
      'SELECT * FROM items ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset],
    );

    return { items: result.rows, page, limit };
  },
);
```

### File Upload (when needed)

```typescript
import multipart from '@fastify/multipart';

await fastify.register(multipart);

fastify.post('/api/upload', async (request, reply) => {
  const data = await request.file();
  // Handle file
});
```

## Testing (TODO)

Unit tests should:

- Mock the database pool
- Test business logic
- Validate error handling
- Test edge cases

Integration tests should:

- Use test database
- Test full request/response cycle
- Verify database changes

## Performance Considerations

- Connection pooling is configured (pg.Pool)
- Add indexes to frequently queried columns
- Use `LIMIT` for large result sets
- Consider caching for read-heavy endpoints
- Monitor query performance (`EXPLAIN ANALYZE`)

## Debugging

### Enable detailed logging

Already enabled via Fastify logger.

### Check database queries

```typescript
const result = await pool.query(...);
console.log('Query result:', result.rows);
```

### Test endpoint

```bash
curl -v http://localhost:3000/api/endpoint
```

## Common Issues

**Database connection fails**:

- Check `DB_HOST`, `DB_PORT` in environment
- Verify database is running: `docker ps`
- Check database logs: `docker logs st44-db`

**CORS errors in frontend**:

- Verify `CORS_ORIGIN` environment variable
- Check proxy configuration in dev mode

**Type errors**:

- Ensure interfaces match database schema
- Use `| null` for nullable columns

## Related Files

- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `Dockerfile` - Production image
- `scripts/` - Manual testing PowerShell scripts
- `TESTING.md` - Testing strategy and guidelines
- `../frontend/src/app/services/` - Frontend API clients
- `../../docker/postgres/init.sql` - Database schema

---

**Last Updated**: 2025-12-19
**Update This File**: When adding endpoints, changing patterns, or updating architecture
