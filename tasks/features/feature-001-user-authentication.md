# Feature: User Authentication System

## Metadata
- **ID**: feature-001
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: ready-for-implementation
- **Priority**: critical
- **Created**: 2025-12-13
- **Updated**: 2025-12-13
- **Estimated Duration**: 4-5 days (10 tasks, ~40-53 hours total)

## Description
Implement a secure user authentication system that allows users to register, login, and maintain authenticated sessions using JWT tokens. Supports both email/password authentication and Google OAuth for faster parent onboarding. This is the foundational security layer that protects all user data and enables role-based access control.

## User Stories
- **As a** new user, **I want** to create an account with email and password, **so that** I can access the application
- **As a** parent, **I want** to sign in with Google, **so that** I can register quickly without creating a new password
- **As a** registered user, **I want** to log in securely, **so that** I can access my household data
- **As a** user, **I want** my session to remain active, **so that** I don't have to login repeatedly
- **As a** user, **I want** to logout when done, **so that** my data remains secure
- **As a** user, **I want** my password to be securely stored, **so that** my account cannot be compromised

## Requirements

### Functional Requirements
- User registration with email and password
- Google OAuth registration and login ("Sign in with Google")
- Email validation (proper format)
- Password strength requirements for email/password auth (min 8 chars, mix of types)
- Secure password hashing (bcrypt) for email/password users
- JWT token generation on successful login (both methods)
- Token refresh mechanism
- Logout functionality
- Protected API endpoints require valid JWT
- Link Google account to existing email/password account (future enhancement)

### Non-Functional Requirements
- **Performance**: Authentication response < 200ms
- **Security**: Passwords hashed with bcrypt (cost factor 12), JWT with 1-hour expiry
- **Accessibility**: WCAG AA compliant forms
- **Browser Support**: Chrome, Firefox, Safari, Edge (last 2 versions)

## Acceptance Criteria
- [ ] User can register with email and password
- [ ] User can sign in with Google OAuth
- [ ] Google OAuth creates user account on first login
- [ ] Google OAuth users don't need password
- [ ] Duplicate email addresses are rejected
- [ ] Password meets strength requirements (email/password only)
- [ ] Passwords are hashed before storage (email/password only)
- [ ] User can login with correct credentials (both methods)
- [ ] Login returns JWT access token and refresh token
- [ ] Invalid credentials return appropriate error
- [ ] JWT tokens expire after 1 hour
- [ ] Refresh tokens work for 7 days
- [ ] User can logout (token invalidation)
- [ ] Protected API endpoints reject invalid/expired tokens
- [ ] All tests passing
- [ ] Documentation updated

## Tasks
**✅ Tasks broken down and ready for implementation**

- [ ] [task-001](../items/task-001-create-users-table-schema.md) - Create users table schema (2-3 hours, database)
- [ ] [task-002](../items/task-002-registration-api-endpoint.md) - Registration API endpoint (4-6 hours, backend)
- [ ] [task-003](../items/task-003-login-api-endpoint.md) - Login API endpoint (5-7 hours, backend)
- [ ] [task-004](../items/task-004-token-refresh-endpoint.md) - Token refresh endpoint (3-4 hours, backend)
- [ ] [task-005](../items/task-005-authentication-middleware.md) - Authentication middleware (3-4 hours, backend)
- [ ] [task-006](../items/task-006-registration-form-component.md) - Registration form component (4-5 hours, frontend)
- [ ] [task-007](../items/task-007-login-form-component.md) - Login form component (3-4 hours, frontend)
- [ ] [task-008](../items/task-008-auth-service.md) - Auth service (4-5 hours, frontend)
- [ ] [task-009](../items/task-009-authentication-tests.md) - Authentication tests (6-8 hours, testing)
- [ ] [task-010](../items/task-010-google-oauth-integration.md) - Google OAuth integration (6-8 hours, fullstack)

## Dependencies
- PostgreSQL database running
- JWT library (jsonwebtoken)
- Password hashing library (bcrypt)
- Google OAuth 2.0 client library
- Google Cloud Console project with OAuth credentials
- Angular HTTP client

## Technical Notes

### Database Changes
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

### API Endpoints
- `POST /api/auth/register` - Create new user account
  - Body: `{ email, password }`
  - Response: `{ userId, email }`
  
- `POST /api/auth/login` - Authenticate user
  - Body: `{ email, password }`
  - Response: `{ accessToken, refreshToken, userId, email }`
  
- `POST /api/auth/refresh` - Refresh access token
  - Body: `{ refreshToken }`
  - Response: `{ accessToken }`
  
- `POST /api/auth/logout` - Invalidate tokens
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ success: true }`

### Frontend Components
- `RegisterComponent` - Registration form
- `LoginComponent` - Login form
- `AuthService` - Handles authentication state and API calls
- `AuthGuard` - Route protection
- `AuthInterceptor` - Adds JWT to outgoing requests

### Third-Party Integrations
- bcrypt for password hashing
- jsonwebtoken for JWT generation/validation

## UI/UX Considerations
- **Registration Form**: Email input, password input (with strength indicator), confirm password, submit button
- **Login Form**: Email input, password input (with show/hide toggle), remember me checkbox, submit button
- **Validation**: Real-time validation with clear error messages
- **Loading States**: Disable form during submission, show spinner
- **Error Handling**: Display API errors clearly (duplicate email, invalid credentials)
- **Success**: Redirect to dashboard after successful login/registration

## Implementation Plan
[To be filled by Orchestrator Agent after task breakdown]

## Progress Log
- [2025-12-13 21:15] Feature created for Epic-001
- [2025-12-13 21:50] Status changed to ready-for-implementation
- [2025-12-13 21:50] Initial 9 tasks created with detailed specifications
- [2025-12-13 22:00] Added Google OAuth support for faster parent onboarding:
  - Added task-010: Google OAuth integration (6-8h)
  - Updated database schema to support OAuth users (password nullable)
  - Updated registration/login components to include Google Sign-In button
  - Total estimated: 40-53 hours (~5-6 working days)

## Testing Strategy
- [ ] Unit tests for password hashing
- [ ] Unit tests for JWT generation/validation
- [ ] Integration tests for auth endpoints
- [ ] E2E tests for registration flow
- [ ] E2E tests for login flow
- [ ] Security tests (SQL injection, XSS attempts)
- [ ] Token expiry tests
- [ ] Invalid token tests

## Related PRs
[To be added when tasks are implemented]

## Demo/Screenshots
[To be added when feature is complete]

## Lessons Learned
[To be filled after completion]
