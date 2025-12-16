Create a new Angular standalone component called {{componentName}}.

**Location**: {{path}} (default: apps/frontend/src/app/components/{{componentName}})

**Requirements**:
- Standalone component (no NgModule)
- Use signals for state management (`signal()`, `computed()`)
- `ChangeDetectionStrategy.OnPush` required
- Use `inject()` for dependencies (not constructor injection)
- Use native control flow (`@if`, `@for`, `@switch`)
- No `ngClass` or `ngStyle` - use class/style bindings
- Proper TypeScript types (strict mode, no `any`)
- Follow patterns in `apps/frontend/AGENTS.md`

**Files to create**:
- `{{componentName}}.ts` - Component file
- `{{componentName}}.css` - Styles (if needed)

**Include**:
- Component decorator with `standalone: true`
- Basic template structure
- Input/output using `input()` and `output()` functions
- Proper imports

