# Backend Development Rules

When working with Fastify backend code in this project, follow these rules:

## Async Operations
- **Always use async/await** - No promise chains or callbacks
- Make all route handlers `async` functions

## Type Safety
- Use type-safe route handlers with generics
- Define types for Params, Body, Query, and Reply
- Example: `server.get<{Params: {id: string}, Reply: User}>('/api/users/:id', ...)`

## Database
- Use connection pooling (`pg.Pool`) for all database queries
- **Always use parameterized queries** to prevent SQL injection
- Never concatenate user input into SQL strings
- Handle database errors gracefully

## Error Handling
- Return appropriate HTTP status codes (200, 201, 400, 404, 500, etc.)
- Use Fastify's built-in error handling
- Log errors appropriately

## CORS
- Enable CORS for development
- Configure via environment variables in production

## Code Organization
- Route handlers in `apps/backend/src/server.ts` or separate route files
- Database queries in service/utility functions
- Types/interfaces in `apps/backend/src/types/`

## Validation
- Use Fastify JSON Schema for request validation
- Validate all user inputs

## Reference
- See `apps/backend/AGENTS.md` for detailed patterns and examples
- See `.github/copilot-instructions.md` for coding standards

