# Cursor Configuration Directory

The `.cursor` folder contains Cursor IDE-specific configuration files that customize how Cursor works with your project.

## Directory Structure

```
.cursor/
├── README.md              # This file
├── commands/              # Custom slash commands
│   └── *.md              # Command definitions
├── rules/                 # Project-specific AI rules
│   └── *.md              # Rule definitions
├── cursor.json            # Cursor configuration (optional)
└── .cursorignore          # Files/paths to exclude from Cursor scans
```

## Components

### 1. Custom Commands (`.cursor/commands/`)

Create reusable slash commands that appear when you type `/` in Cursor's chat.

**Format**: Each command is a Markdown file (`.md`) in the `commands/` folder.

**Usage**: Type `/` in Cursor chat to see all available commands, then select one to insert its prompt.

**Example**: `commands/component.md`
```markdown
Create a new Angular standalone component called {{componentName}} following project conventions:
- Use standalone component pattern
- Use signals for state management
- Use ChangeDetectionStrategy.OnPush
- Use inject() for dependencies
- Follow the patterns in apps/frontend/AGENTS.md
```

**Variables**: You can use `{{variableName}}` placeholders that Cursor will prompt you to fill.

**Best Practices**:
- Keep commands focused on single tasks
- Reference project conventions and AGENTS.md files
- Use descriptive filenames (kebab-case)
- Include context about where to create files

### 2. Project Rules (`.cursor/rules/`)

Define project-specific guidelines that Cursor's AI should follow automatically.

**Format**: Markdown files in the `rules/` folder.

**Usage**: Rules are automatically loaded when you open the project. They provide context to the AI about:
- Architecture patterns
- Coding standards
- File organization
- Naming conventions
- Best practices

**Example**: `rules/angular.md`
```markdown
# Angular Development Rules

- Always use standalone components (no NgModules)
- Use signals for state management, not RxJS subjects
- Use inject() instead of constructor injection
- ChangeDetectionStrategy.OnPush is required
- Use native control flow (@if, @for, @switch)
- Reference apps/frontend/AGENTS.md for detailed patterns
```

**Note**: Rules complement (but don't replace) the main `AGENTS.md` files. Use rules for Cursor-specific guidance, and `AGENTS.md` for comprehensive project documentation.

### 3. Configuration (`cursor.json`)

Optional configuration file for Cursor settings.

**Example**:
```json
{
  "rules": {
    "enabled": true,
    "autoLoad": true
  },
  "commands": {
    "enabled": true,
    "showInChat": true
  },
  "tools": {
    "terminal": true,
    "fileSystem": true,
    "webSearch": true
  }
}
```

**Note**: Most Cursor settings are managed through the UI Settings. This file is for advanced configuration.

### 4. Ignore Patterns (`.cursorignore`)

Similar to `.gitignore`, but for Cursor's file scanning and indexing.

**Purpose**: Exclude files/directories from:
- AI context when reading files
- Codebase searches
- Indexing operations

**Example**:
```
# Dependencies
node_modules/
dist/
build/

# Generated files
*.generated.ts
*.spec.ts

# Large data files
*.sql.gz
*.log

# Test outputs
coverage/
playwright-report/
test-results/
```

**Note**: This doesn't prevent you from explicitly opening these files - it just excludes them from automatic AI context.

## Common Use Cases

### Creating a Component Command

**File**: `.cursor/commands/component.md`
```markdown
Create a new Angular standalone component called {{name}} in {{path}}.

Requirements:
- Standalone component (no NgModule)
- Use signals for state
- ChangeDetectionStrategy.OnPush
- Use inject() for dependencies
- Follow patterns in apps/frontend/AGENTS.md
- Include proper TypeScript types
- Add basic styling structure
```

### Creating a Migration Command

**File**: `.cursor/commands/migration.md`
```markdown
Create a new database migration file following the project's migration pattern.

Requirements:
- File name: NNN_descriptive_name.sql in docker/postgres/migrations/
- Use TEMPLATE.sql as starting point
- Make migration idempotent (IF NOT EXISTS, etc.)
- Include BEGIN/COMMIT transaction blocks
- Update schema_migrations table
- Reference docker/postgres/migrations/README.md for format
```

### Creating an API Endpoint Command

**File**: `.cursor/commands/api-endpoint.md`
```markdown
Create a new Fastify API endpoint {{method}} {{path}}.

Requirements:
- Follow patterns in apps/backend/AGENTS.md
- Use async/await
- Proper error handling with status codes
- Type-safe route handlers
- Parameterized queries for database
- Add to apps/backend/src/server.ts or appropriate route file
```

## Integration with Project Structure

The `.cursor` folder works alongside your existing project documentation:

- **`.cursor/rules/`** → Complements `AGENTS.md` files
- **`.cursor/commands/`** → Quick shortcuts for common tasks
- **`.github/prompts/`** → Full workflow prompts (referenced by commands)
- **`AGENTS.md`** → Comprehensive project documentation
- **`.github/copilot-instructions.md`** → GitHub Copilot standards

### GitHub Prompts Integration

The workflow commands (like `/continue-work`, `/plan-feature`) reference the full prompts in `.github/prompts/`. This allows:
- **Cursor**: Quick access via `/` commands
- **GitHub Copilot**: Direct reference to `.github/prompts/*.prompt.md` files
- **Consistency**: Same workflows work in both environments

## Best Practices

1. **Keep commands focused**: One command = one task
2. **Reference documentation**: Always point to `AGENTS.md` files for details
3. **Use variables**: Make commands reusable with `{{variable}}` placeholders
4. **Version control**: Commit `.cursor` folder to git (except sensitive configs)
5. **Document**: Add comments in command files explaining when to use them
6. **Organize**: Group related commands/rules in subdirectories if needed

## Examples for This Project

### Workflow Commands (GitHub Prompts Integration)

These commands integrate with the `.github/prompts/` system:

- `commands/continue-work.md` - Continue work on next priority from roadmap
- `commands/breakdown-feature.md` - Break down a feature into implementation tasks
- `commands/plan-feature.md` - Plan a new feature with strategic analysis
- `commands/reprioritize.md` - Reorganize roadmap based on current state
- `commands/review-and-merge.md` - Unified review, PR creation, CI wait, and merge workflow
- `commands/merge-pr.md` - Alias to review-and-merge workflow

**Usage**: Type `/` in Cursor chat and select one of these commands. They reference the full prompts in `.github/prompts/` for complete workflow execution.

### Code Generation Commands

- `commands/component.md` - Create Angular component
- `commands/api-endpoint.md` - Create Fastify endpoint
- `commands/migration.md` - Create database migration

### Rules

- `rules/angular.md` - Angular-specific patterns
- `rules/backend.md` - Fastify/API patterns
- `rules/database.md` - PostgreSQL patterns

## Resources

- [Cursor Documentation](https://docs.cursor.com)
- [Project AGENTS.md](../AGENTS.md) - Main project documentation
- [Frontend Patterns](../apps/frontend/AGENTS.md)
- [Backend Patterns](../apps/backend/AGENTS.md)

---

**Last Updated**: 2025-12-13

