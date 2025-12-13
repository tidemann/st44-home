# Task: Implement Token Refresh Endpoint

## Metadata
- **ID**: task-004
- **Feature**: feature-001 - User Authentication System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-13
- **Assigned Agent**: backend
- **Estimated Duration**: 3-4 hours

## Description
Create an endpoint that accepts a valid refresh token and issues a new access token, allowing users to maintain their session without re-entering credentials. This enables seamless user experience while maintaining security through short-lived access tokens.

## Requirements
- POST endpoint at `/api/auth/refresh`
- Accept refresh token in request body
- Verify refresh token signature and expiry
- Validate token type is 'refresh'
- Generate new access token with same user info
- Return new access token
- Reject expired or invalid tokens
- Optional: Implement token rotation (issue new refresh token)

## Acceptance Criteria
- [ ] Endpoint responds to POST `/api/auth/refresh`
- [ ] Valid refresh token returns 200 OK with new access token
- [ ] Expired refresh token returns 401 Unauthorized
- [ ] Invalid token returns 401 Unauthorized
- [ ] Wrong token type (access instead of refresh) returns 401
- [ ] Response includes new access token
- [ ] New access token has correct payload and expiry
- [ ] Token verification uses JWT_SECRET
- [ ] Error messages are user-friendly
- [ ] All tests passing

## Dependencies
- task-003: Login endpoint must generate refresh tokens
- jsonwebtoken library installed
- JWT_SECRET environment variable configured

## Technical Notes

### Token Rotation (Optional Enhancement)
Token rotation provides additional security by issuing a new refresh token with each refresh request, invalidating the old one. This limits the window of vulnerability if a refresh token is compromised.

For MVP, we'll skip rotation to keep it simple. Can be added later with a token blacklist or database tracking.

### Request/Response Format

**Request**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK)**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401 Unauthorized)**
```json
{
  "error": "Invalid or expired refresh token"
}
```

### Security Considerations
- Verify token type to prevent access token replay
- Check token expiry explicitly
- Use same JWT_SECRET as login endpoint
- Don't expose detailed error messages (security through obscurity)
- Log refresh attempts for security monitoring

## Affected Areas
- [x] Backend (Fastify/Node.js)

## Implementation Plan

### Research Phase
- [x] Review jwt.verify() method
- [x] Understand JWT error types (TokenExpiredError, JsonWebTokenError)

### Implementation Steps
1. Create refresh route handler
2. Add request schema validation
3. Verify refresh token with jwt.verify()
4. Check token type === 'refresh'
5. Extract userId and email from token
6. Generate new access token
7. Return new access token
8. Handle all JWT errors consistently
9. Add logging for monitoring

### Testing Strategy
- Integration test: Valid refresh token returns new access token
- Integration test: Expired refresh token rejected
- Integration test: Invalid signature rejected
- Integration test: Access token used as refresh token rejected
- Integration test: Malformed token rejected
- Integration test: New access token is valid and usable

## Code Structure

```typescript
// apps/backend/src/server.ts

import jwt from 'jsonwebtoken';

interface RefreshTokenPayload {
  userId: string;
  type: string;
  iat: number;
  exp: number;
}

const refreshSchema = {
  body: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string' }
    }
  }
};

fastify.post('/api/auth/refresh', {
  schema: refreshSchema
}, async (request, reply) => {
  const { refreshToken } = request.body;
  
  try {
    // Verify token
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as RefreshTokenPayload;
    
    // Verify it's a refresh token (not access token)
    if (decoded.type !== 'refresh') {
      fastify.log.warn('Attempted to use non-refresh token');
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }
    
    // Need to get user email from database
    const result = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      fastify.log.warn({ userId: decoded.userId }, 'User not found for refresh token');
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }
    
    // Generate new access token
    const accessToken = generateAccessToken(decoded.userId, result.rows[0].email);
    
    fastify.log.info({ userId: decoded.userId }, 'Token refreshed');
    
    return reply.code(200).send({ accessToken });
    
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      fastify.log.warn('Expired refresh token used');
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      fastify.log.warn({ error: error.message }, 'Invalid refresh token');
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }
    
    fastify.log.error(error, 'Token refresh error');
    return reply.code(500).send({ error: 'Token refresh failed' });
  }
});
```

## Progress Log
- [2025-12-13 21:45] Task created from feature-001 breakdown

## Related Files
- `apps/backend/src/server.ts` - Main server file

## Testing Commands
```bash
# First, login to get tokens
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}')

# Extract refresh token
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.refreshToken')

# Use refresh token to get new access token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"

# Test with invalid token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"invalid.token.here"}'

# Test with access token (should fail)
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$ACCESS_TOKEN\"}"
```

## Future Enhancements
- [ ] Implement token rotation (issue new refresh token each time)
- [ ] Add refresh token blacklist/revocation
- [ ] Store refresh tokens in database for audit trail
- [ ] Add device/session tracking

## Lessons Learned
[To be filled after completion]
