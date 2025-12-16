Create a new Fastify API endpoint.

**Method**: {{method}} (GET, POST, PUT, DELETE, etc.)
**Path**: {{path}} (e.g., `/api/users/:id`)

**Requirements**:
- Follow patterns in `apps/backend/AGENTS.md`
- Use async/await for all async operations
- Type-safe route handlers with generics
- Proper error handling with appropriate HTTP status codes
- Use connection pooling for database queries
- Parameterized queries to prevent SQL injection
- Enable CORS for development
- Add to `apps/backend/src/server.ts` or appropriate route file

**Structure**:
```typescript
server.{{method.toLowerCase()}}<{Params: {...}, Body: {...}, Reply: {...}}>('{{path}}', async (request, reply) => {
  // Implementation
});
```

**Include**:
- Request/response types
- Input validation (Fastify JSON Schema)
- Error handling
- Database queries (if needed)
- Proper logging

