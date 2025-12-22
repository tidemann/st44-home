# @st44/types

**Shared TypeScript types and runtime schemas for the st44-home project.**

## Overview

This package provides a single source of truth for all data models shared between the frontend (Angular) and backend (Fastify). By centralizing type definitions and validation schemas, we ensure:

- **Type Safety**: Compile-time checking prevents API integration bugs
- **Consistency**: Frontend and backend always use the same data structures
- **Maintainability**: Update types in one place, changes propagate automatically
- **Runtime Validation**: Backend uses schemas for request/response validation
- **Auto-Generated Docs**: OpenAPI schemas generated from TypeScript types

## Installation

This package is part of the monorepo workspace and automatically linked via npm workspaces:

```bash
# From project root
npm install

# The @st44/types package is now available to all workspace packages
```

## Usage

### In Backend (Fastify)

```typescript
import { UserSchema, CreateTaskSchema } from '@st44/types/schemas';
import type { User, Task } from '@st44/types/types';

// Runtime validation with schemas
fastify.post('/api/tasks', {
  schema: {
    body: CreateTaskSchema,
  },
  handler: async (request, reply) => {
    const task: Task = await createTask(request.body);
    return task;
  },
});
```

### In Frontend (Angular)

```typescript
import type { User, Task, CreateTaskRequest } from '@st44/types/types';

@Injectable()
export class TaskService {
  async createTask(request: CreateTaskRequest): Promise<Task> {
    // TypeScript ensures request matches backend expectations
    return this.http.post<Task>('/api/tasks', request);
  }
}
```

## Package Structure

```
packages/types/
├── src/
│   ├── schemas/      # Zod schemas for runtime validation
│   ├── types/        # TypeScript type definitions
│   └── index.ts      # Main export file
├── dist/             # Compiled output (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Build Commands

```bash
# Clean dist folder
npm run clean

# Build TypeScript to JavaScript + declarations
npm run build

# Watch mode (rebuild on changes)
npm run watch

# Type check without emitting files
npm run type-check
```

### Adding New Types

1. Define Zod schema in `src/schemas/`
2. Infer TypeScript type: `export type MyType = z.infer<typeof MySchema>`
3. Export from `src/types/index.ts`
4. Run `npm run build`
5. Use in frontend and backend

## Architecture

### Type Flow

```
Zod Schemas (src/schemas/)
    ↓
TypeScript Types (inferred via z.infer)
    ↓
Backend Validation (Fastify uses schemas)
    ↓
Frontend Type Safety (TypeScript uses types)
```

### Build Pipeline

```
1. packages/types/    - Build first (npm run build)
2. apps/backend/      - Import @st44/types
3. apps/frontend/     - Import @st44/types
```

## Benefits

- **Single Source of Truth**: One definition, used everywhere
- **Compile-Time Safety**: TypeScript catches mismatches before runtime
- **Runtime Validation**: Backend validates all requests against schemas
- **No Duplication**: Eliminate duplicate type definitions
- **OpenAPI Generation**: Auto-generate API docs from schemas
- **Developer Experience**: IDE autocomplete, clear error messages

## Roadmap

- ✅ Task-104: Package structure and build setup
- ⏳ Task-105: Core domain schemas (User, Household, Child, Task, Assignment)
- ⏳ Task-106: OpenAPI schema generator
- ⏳ Task-107: Backend migration (3 endpoints)
- ⏳ Task-108: Frontend service migration
- ⏳ Task-109: Build pipeline integration
- ⏳ Task-110: Documentation and testing

## Contributing

When adding new types:

1. Always define Zod schema first (runtime validation)
2. Infer TypeScript type from schema
3. Document complex types with JSDoc comments
4. Run `npm run type-check` before committing
5. Update this README if architecture changes

## License

ISC
