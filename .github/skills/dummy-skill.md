# Dummy Skill - Example Skill Specification

## Overview
This is a dummy skill created to demonstrate the skill specification format. Skills represent reusable capabilities, utilities, or knowledge that agents can leverage when performing tasks.

## Purpose
- Demonstrate skill structure
- Serve as a reference template
- Show best practices for skill specifications
- Provide examples for new skill creation

## Description
This dummy skill provides example functionality that can be used by agents when working on tasks. It demonstrates how skills encapsulate reusable knowledge and capabilities.

## Capabilities

### Capability 1: Example Function
**What it does**: Provides example functionality
**When to use**: When you need example behavior
**How to use**:
```typescript
import { exampleFunction } from './dummy-skill';

const result = exampleFunction(input);
```

**Parameters**:
- `input` (string): Example input parameter
- Returns: Example output

### Capability 2: Example Pattern
**What it does**: Demonstrates a common pattern
**When to use**: When implementing similar functionality
**How to use**:
```typescript
import { examplePattern } from './dummy-skill';

const result = examplePattern(config);
```

**Parameters**:
- `config` (object): Configuration object
- Returns: Processed result

## Usage Examples

### Example 1: Basic Usage
```typescript
import { dummySkill } from './dummy-skill';

const output = dummySkill.process(input);
```

### Example 2: Advanced Usage
```typescript
import { dummySkill } from './dummy-skill';

const result = dummySkill.process(input, {
  option1: true,
  option2: 'value'
});
```

## Integration Points

### With Agents
- Can be used by any agent that needs this capability
- Referenced in agent specifications
- Imported in agent implementations

### With Tasks
- Mentioned in task requirements
- Used in implementation plans
- Documented in task files

## Dependencies
- None (this is a dummy skill)

## Related Skills
- None (this is a standalone example)

## Best Practices
1. Use this skill when appropriate
2. Follow the examples provided
3. Document any custom usage
4. Test thoroughly before using

## Notes
- This is a demonstration skill
- Replace with actual implementation when needed
- Update documentation as skill evolves

## Version
- **Version**: 1.0.0
- **Created**: 2025-12-14
- **Last Updated**: 2025-12-14

## Maintenance
- Update as needed
- Keep examples current
- Document changes


