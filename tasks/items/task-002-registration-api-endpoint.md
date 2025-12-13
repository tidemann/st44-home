# Task: Implement Registration API Endpoint

## Metadata
- **ID**: task-002
- **Feature**: feature-001 - User Authentication System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-13
- **Assigned Agent**: backend
- **Estimated Duration**: 4-6 hours

## Description
Create a secure user registration endpoint that validates input, hashes passwords with bcrypt, and stores new users in the database. Includes proper error handling for duplicate emails, validation failures, and database errors.

## Requirements
- POST endpoint at `/api/auth/register`
- Accept email and password in request body
- Validate email format (RFC 5322 compliant)
- Validate password strength (min 8 chars, at least one uppercase, lowercase, number)
- Hash password with bcrypt (cost factor 12)
- Check for existing email before insertion
- Return user ID and email on success
- Return appropriate error codes and messages

## Acceptance Criteria
- [ ] Endpoint responds to POST `/api/auth/register`
- [ ] Email validation rejects invalid formats
- [ ] Password validation enforces strength requirements
- [ ] Password is hashed with bcrypt before storage
- [ ] Duplicate email returns 409 Conflict
- [ ] Valid registration returns 201 Created
- [ ] Response includes userId and email (NOT password)
- [ ] Database errors return 500 with safe error message
- [ ] Request validation uses Fastify JSON Schema
- [ ] All edge cases handled (empty fields, malformed JSON)
- [ ] Unit tests pass
- [ ] Integration tests pass

## Dependencies
- task-001: Users table must exist
- bcrypt library installed
- Fastify server running
- PostgreSQL connection pool

## Technical Notes

### Request Schema
```typescript
const registerSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        maxLength: 255
      },
      password: {
        type: 'string',
        minLength: 8,
        maxLength: 128
      }
    }
  }
};
```

### Password Strength Validation
```typescript
function validatePasswordStrength(password: string): boolean {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return password.length >= 8 && hasUpperCase && hasLowerCase && hasNumber;
}
```

### API Response Formats

**Success (201 Created)**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

**Error (400 Bad Request)**
```json
{
  "error": "Password must contain at least one uppercase letter, one lowercase letter, and one number"
}
```

**Error (409 Conflict)**
```json
{
  "error": "Email already registered"
}
```

## Affected Areas
- [x] Backend (Fastify/Node.js)
- [x] Database (PostgreSQL - INSERT query)

## Implementation Plan

### Research Phase
- [x] Review Fastify route handler patterns
- [x] Review existing database query patterns
- [x] Check bcrypt library documentation

### Implementation Steps
1. Install bcrypt: `npm install bcrypt @types/bcrypt`
2. Create route handler in `apps/backend/src/server.ts`
3. Add Fastify JSON Schema validation
4. Implement password strength validation function
5. Implement password hashing with bcrypt
6. Implement database query with error handling
7. Handle duplicate email case (catch unique constraint violation)
8. Return appropriate response codes
9. Add logging for security events

### Testing Strategy
- Unit test: Password validation function
- Unit test: Password hashing (verify bcrypt.compare works)
- Integration test: Successful registration
- Integration test: Duplicate email rejection
- Integration test: Invalid email format
- Integration test: Weak password rejection
- Integration test: Missing fields
- Security test: SQL injection attempts

## Code Structure

```typescript
// apps/backend/src/server.ts

import bcrypt from 'bcrypt';
import { FastifyInstance } from 'fastify';

// Registration route
fastify.post('/api/auth/register', {
  schema: registerSchema
}, async (request, reply) => {
  const { email, password } = request.body;
  
  // Validate password strength
  if (!validatePasswordStrength(password)) {
    return reply.code(400).send({ 
      error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
    });
  }
  
  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash]
    );
    
    return reply.code(201).send({
      userId: result.rows[0].id,
      email: result.rows[0].email
    });
  } catch (error: any) {
    // Handle duplicate email
    if (error.code === '23505') { // PostgreSQL unique violation
      return reply.code(409).send({ error: 'Email already registered' });
    }
    
    // Log error but don't expose details
    fastify.log.error(error);
    return reply.code(500).send({ error: 'Registration failed' });
  }
});
```

## Progress Log
- [2025-12-13 21:45] Task created from feature-001 breakdown

## Related Files
- `apps/backend/src/server.ts` - Main server file
- `apps/backend/package.json` - Dependencies

## Testing Commands
```bash
# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'

# Test duplicate
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'

# Test weak password
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@example.com","password":"weak"}'
```

## Lessons Learned
[To be filled after completion]
