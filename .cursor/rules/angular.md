# Angular Development Rules

When working with Angular code in this project, follow these rules:

## Component Structure
- **Always use standalone components** - No NgModules
- `standalone: true` is implicit in Angular 20+, but include for clarity
- Use `input()` and `output()` functions, not `@Input()` and `@Output()` decorators
- Use `ChangeDetectionStrategy.OnPush` for all components

## State Management
- Use **signals** (`signal()`, `computed()`) for state management
- Avoid RxJS subjects/observables for component state (use signals instead)
- Use `effect()` for side effects when needed

## Dependency Injection
- Use `inject()` function instead of constructor injection
- Example: `private service = inject(MyService)`

## Control Flow
- Use **native control flow**: `@if`, `@for`, `@switch`
- Do NOT use `*ngIf`, `*ngFor`, `*ngSwitch`

## Styling
- Do NOT use `ngClass` or `ngStyle`
- Use class/style bindings directly: `[class.active]="isActive"`

## TypeScript
- Strict mode enabled
- No `any` types - use `unknown` when uncertain
- Prefer type inference over explicit types

## File Organization
- Components in `apps/frontend/src/app/components/`
- Services in `apps/frontend/src/app/services/`
- Types/interfaces in `apps/frontend/src/app/types/`

## Reference
- See `apps/frontend/AGENTS.md` for detailed patterns and examples
- See `.github/copilot-instructions.md` for coding standards

