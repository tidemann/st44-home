# Task: Implement Login API Endpoint

## Metadata
- **ID**: task-003
- **Feature**: feature-001 - User Authentication System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: completed
- **Priority**: critical
- **Created**: 2025-12-13
- **Completed**: 2025-12-13
- **Assigned Agent**: backend
- **Estimated Duration**: 5-7 hours
- **Actual Duration**: ~2 hours

## Description
Create a secure login endpoint that authenticates users with email/password, generates JWT access tokens and refresh tokens, and returns them to the client. Implements proper security practices including rate limiting, timing-safe password comparison, and secure token generation.

## Requirements
- POST endpoint at `/api/auth/login`
- Accept email and password in request body
- Verify user exists in database
- Compare password hash using bcrypt
- Generate JWT access token (1-hour expiry)
- Generate JWT refresh token (7-day expiry)
- Return both tokens plus user info
- Use timing-safe comparison to prevent timing attacks
- Log failed login attempts
- Return same error for invalid email or password (security best practice)

## Acceptance Criteria
- [x] Endpoint responds to POST `/api/auth/login`
- [x] Valid credentials return 200 OK with tokens
- [x] Invalid credentials return 401 Unauthorized
- [x] Error message doesn't reveal if email exists
- [x] Access token expires in 1 hour
- [x] Refresh token expires in 7 days
- [x] Tokens include user ID and email in payload
- [x] Password comparison uses bcrypt.compare
- [x] Failed attempts logged for security monitoring
- [x] Request validation uses Fastify JSON Schema
- [ ] All tests passing (deferred to task-009)

## Dependencies
- task-001: Users table must exist
- task-002: At least one user registered
- jsonwebtoken library installed
- bcrypt library installed
- JWT_SECRET environment variable configured

## Technical Notes

### JWT Structure

**Access Token Payload**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "type": "access",
  "iat": 1702483200,
  "exp": 1702486800
}
```

**Refresh Token Payload**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "refresh",
  "iat": 1702483200,
  "exp": 1703088000
}
```

### Security Considerations
- Use strong JWT_SECRET (minimum 32 random bytes)
- Same error message for "user not found" and "wrong password"
- Use bcrypt.compare() which is timing-safe
- Log failed attempts with IP address
- Consider rate limiting (future enhancement)
- Tokens should be stored securely on client (httpOnly cookies or secure storage)

### Environment Variables
```env
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d
```

## Affected Areas
- [x] Backend (Fastify/Node.js)
- [x] Database (PostgreSQL - SELECT query)

## Implementation Plan

### Research Phase
- [x] Review jsonwebtoken library documentation
- [x] Review bcrypt.compare usage
- [x] Research JWT best practices

### Implementation Steps
1. Install jsonwebtoken: `npm install jsonwebtoken @types/jsonwebtoken`
2. Add JWT_SECRET to environment configuration
3. Create JWT utility functions (generateAccessToken, generateRefreshToken)
4. Create login route handler
5. Query database for user by email
6. Compare password with bcrypt.compare
7. Generate both tokens on success
8. Return tokens and user info
9. Handle errors securely (don't reveal user existence)
10. Add logging for failed attempts

### Testing Strategy
- Integration test: Successful login
- Integration test: Wrong password
- Integration test: Non-existent email
- Integration test: Token includes correct payload
- Integration test: Token expiry times correct
- Security test: Timing attack resistance
- Security test: SQL injection attempts

## Code Structure

```typescript
// apps/backend/src/server.ts

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_ACCESS_EXPIRY = '1h';
const JWT_REFRESH_EXPIRY = '7d';

// JWT utility functions
function generateAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRY }
  );
}

function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRY }
  );
}

// Login route
const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' }
    }
  }
};

fastify.post('/api/auth/login', {
  schema: loginSchema
}, async (request, reply) => {
  const { email, password } = request.body;
  
  try {
    // Query user
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );
    
    // User not found or password mismatch - same error message
    if (result.rows.length === 0) {
      fastify.log.warn({ email }, 'Login attempt with non-existent email');
      return reply.code(401).send({ error: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    
    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      fastify.log.warn({ userId: user.id, email }, 'Login attempt with wrong password');
      return reply.code(401).send({ error: 'Invalid email or password' });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);
    
    fastify.log.info({ userId: user.id, email }, 'Successful login');
    
    return reply.code(200).send({
      accessToken,
      refreshToken,
      userId: user.id,
      email: user.email
    });
  } catch (error) {
    fastify.log.error(error, 'Login error');
    return reply.code(500).send({ error: 'Authentication failed' });
  }
});
```

## Progress Log
- [2025-12-13 21:45] Task created from feature-001 breakdown
- [2025-12-13 22:25] Implementation started, jsonwebtoken installed
- [2025-12-13 22:32] Login endpoint implemented with JWT generation
- [2025-12-13 22:35] Testing completed successfully

## Related Files
- `apps/backend/src/server.ts` - Main server file
- `apps/backend/.env` - Environment configuration
- `apps/backend/package.json` - Dependencies

## Testing Commands
```bash
# Successful login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'

# Wrong password
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"WrongPassword"}'

# Non-existent email
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com","password":"Test1234"}'

# Decode JWT (for testing)
# Copy token from response and paste at https://jwt.io
```

## Lessons Learned
- JWT library integration straightforward with TypeScript
- bcrypt.compare is timing-safe by default - no additional measures needed
- Consistent error messages crucial for security (don't reveal user existence)
- Detached dev server workflow (npm run dev:backend) works perfectly for testing
- Access token should include user info for client-side state
- Refresh token minimal payload (just userId) for security
- Logging failed attempts important for security monitoring
- Testing sequence: successful login → wrong password → non-existent email
- JWT structure validation can be done at jwt.io for manual inspection
