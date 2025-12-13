# Task: Create Authentication Middleware

## Metadata
- **ID**: task-005
- **Feature**: feature-001 - User Authentication System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-13
- **Assigned Agent**: backend
- **Estimated Duration**: 3-4 hours

## Description
Create Fastify middleware (preHandler hook) that verifies JWT tokens on protected routes, extracts user information, and attaches it to the request object. This middleware will be used to protect all API endpoints that require authentication.

## Requirements
- Fastify preHandler hook for authentication
- Extract JWT token from Authorization header
- Verify token signature and expiry
- Validate token type is 'access'
- Attach user info to request object
- Reject requests without valid token
- Support "Bearer {token}" format
- Provide clear error messages

## Acceptance Criteria
- [ ] Middleware function created and reusable
- [ ] Extracts token from "Authorization: Bearer {token}" header
- [ ] Verifies token with JWT_SECRET
- [ ] Checks token is not expired
- [ ] Validates token type is 'access' (not refresh)
- [ ] Attaches userId and email to request object
- [ ] Returns 401 for missing token
- [ ] Returns 401 for invalid token
- [ ] Returns 401 for expired token
- [ ] Can be applied to any route with `{ preHandler: [authenticateUser] }`
- [ ] All tests passing

## Dependencies
- task-003: Login endpoint generates access tokens
- jsonwebtoken library installed
- JWT_SECRET environment variable configured

## Technical Notes

### Fastify Request Decoration
We'll need to extend the FastifyRequest type to include user information:

```typescript
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
    };
  }
}
```

### Authorization Header Format
Standard format: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Token Extraction
```typescript
const authHeader = request.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return reply.code(401).send({ error: 'Missing or invalid authorization header' });
}
const token = authHeader.substring(7); // Remove "Bearer " prefix
```

## Affected Areas
- [x] Backend (Fastify/Node.js)

## Implementation Plan

### Research Phase
- [x] Review Fastify preHandler hooks
- [x] Review Fastify request decoration
- [x] Understand JWT verification errors

### Implementation Steps
1. Create authenticateUser function as preHandler
2. Extract token from Authorization header
3. Verify token with jwt.verify()
4. Validate token type === 'access'
5. Attach user info to request.user
6. Handle all error cases
7. Add TypeScript type declaration for request.user
8. Test with protected endpoint

### Testing Strategy
- Unit test: Token extraction from header
- Integration test: Valid token allows access
- Integration test: Missing token returns 401
- Integration test: Invalid token returns 401
- Integration test: Expired token returns 401
- Integration test: Refresh token used as access token returns 401
- Integration test: User info attached to request correctly

## Code Structure

```typescript
// apps/backend/src/server.ts

import jwt from 'jsonwebtoken';
import { FastifyRequest, FastifyReply } from 'fastify';

// Extend FastifyRequest type
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
    };
  }
}

interface AccessTokenPayload {
  userId: string;
  email: string;
  type: string;
  iat: number;
  exp: number;
}

// Authentication middleware
async function authenticateUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Extract token from header
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ 
        error: 'Missing or invalid authorization header' 
      });
    }
    
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
    
    // Verify it's an access token (not refresh token)
    if (decoded.type !== 'access') {
      fastify.log.warn('Attempted to use non-access token');
      return reply.code(401).send({ 
        error: 'Invalid token type' 
      });
    }
    
    // Attach user info to request
    request.user = {
      userId: decoded.userId,
      email: decoded.email
    };
    
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return reply.code(401).send({ 
        error: 'Token expired' 
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return reply.code(401).send({ 
        error: 'Invalid token' 
      });
    }
    
    fastify.log.error(error, 'Authentication error');
    return reply.code(500).send({ 
      error: 'Authentication failed' 
    });
  }
}

// Example: Protected route using the middleware
fastify.get('/api/protected', {
  preHandler: [authenticateUser]
}, async (request, reply) => {
  // request.user is now available
  return { 
    message: 'Protected data', 
    userId: request.user?.userId 
  };
});

// Example: Logout endpoint (requires authentication)
fastify.post('/api/auth/logout', {
  preHandler: [authenticateUser]
}, async (request, reply) => {
  // In basic implementation, logout is client-side (delete tokens)
  // Future: Add token to blacklist
  fastify.log.info({ userId: request.user?.userId }, 'User logged out');
  return { success: true };
});
```

## Progress Log
- [2025-12-13 21:45] Task created from feature-001 breakdown

## Related Files
- `apps/backend/src/server.ts` - Main server file

## Testing Commands
```bash
# First, login to get access token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

# Test protected endpoint with valid token
curl -X GET http://localhost:3000/api/protected \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Test without token
curl -X GET http://localhost:3000/api/protected

# Test with invalid token
curl -X GET http://localhost:3000/api/protected \
  -H "Authorization: Bearer invalid.token.here"

# Test logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Usage Examples

```typescript
// Protect a single route
fastify.get('/api/users/me', {
  preHandler: [authenticateUser]
}, async (request, reply) => {
  const { userId } = request.user!;
  // Fetch user data...
});

// Protect multiple routes with a prefix
fastify.register(async (protectedRoutes) => {
  protectedRoutes.addHook('preHandler', authenticateUser);
  
  protectedRoutes.get('/households', async (request, reply) => {
    // All routes in this context are protected
  });
  
  protectedRoutes.post('/households', async (request, reply) => {
    // ...
  });
}, { prefix: '/api' });
```

## Lessons Learned
[To be filled after completion]
