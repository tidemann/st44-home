/**
 * Task Schema Tests
 */
import { describe, it, expect } from 'vitest';
import {
  TaskSchema,
  TaskRuleTypeSchema,
  CreateTaskRequestSchema,
  UpdateTaskRequestSchema,
} from './task.schema.js';

describe('TaskSchema', () => {
  it('validates daily task', () => {
    const validTask = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      household_id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Clean Room',
      description: 'Clean your bedroom',
      points: 10,
      rule_type: 'daily' as const,
      rule_config: null,
      active: true,
      created_at: '2025-12-22T10:00:00Z',
      updated_at: '2025-12-22T10:00:00Z',
    };

    expect(() => TaskSchema.parse(validTask)).not.toThrow();
    const parsed = TaskSchema.parse(validTask);
    expect(parsed.rule_type).toBe('daily');
  });

  it('validates repeating task with config', () => {
    const validTask = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      household_id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Take Out Trash',
      description: null,
      points: 5,
      rule_type: 'repeating' as const,
      rule_config: {
        repeat_days: [1, 3, 5], // Monday, Wednesday, Friday
      },
      active: true,
      created_at: '2025-12-22T10:00:00Z',
      updated_at: '2025-12-22T10:00:00Z',
    };

    expect(() => TaskSchema.parse(validTask)).not.toThrow();
    const parsed = TaskSchema.parse(validTask);
    expect(parsed.rule_config?.repeat_days).toEqual([1, 3, 5]);
  });

  it('validates weekly rotation task', () => {
    const validTask = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      household_id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Wash Dishes',
      description: null,
      points: 15,
      rule_type: 'weekly_rotation' as const,
      rule_config: {
        rotation_type: 'odd_even_week' as const,
        assigned_children: [
          '123e4567-e89b-12d3-a456-426614174002',
          '123e4567-e89b-12d3-a456-426614174003',
        ],
      },
      active: true,
      created_at: '2025-12-22T10:00:00Z',
      updated_at: '2025-12-22T10:00:00Z',
    };

    expect(() => TaskSchema.parse(validTask)).not.toThrow();
    const parsed = TaskSchema.parse(validTask);
    expect(parsed.rule_config?.rotation_type).toBe('odd_even_week');
  });

  it('rejects invalid rule_type', () => {
    const invalidTask = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      household_id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Task',
      description: null,
      points: 10,
      rule_type: 'invalid_type',
      rule_config: null,
      active: true,
      created_at: '2025-12-22T10:00:00Z',
      updated_at: '2025-12-22T10:00:00Z',
    };

    expect(() => TaskSchema.parse(invalidTask)).toThrow();
  });

  it('rejects points exceeding maximum', () => {
    const invalidTask = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      household_id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Task',
      description: null,
      points: 9999, // Exceeds max of 1000
      rule_type: 'daily' as const,
      rule_config: null,
      active: true,
      created_at: '2025-12-22T10:00:00Z',
      updated_at: '2025-12-22T10:00:00Z',
    };

    expect(() => TaskSchema.parse(invalidTask)).toThrow();
  });

  it('rejects invalid repeat_days', () => {
    const invalidTask = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      household_id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Task',
      description: null,
      points: 10,
      rule_type: 'repeating' as const,
      rule_config: {
        repeat_days: [7, 8], // Invalid - should be 0-6
      },
      active: true,
      created_at: '2025-12-22T10:00:00Z',
      updated_at: '2025-12-22T10:00:00Z',
    };

    expect(() => TaskSchema.parse(invalidTask)).toThrow();
  });
});

describe('CreateTaskRequestSchema', () => {
  it('validates minimal task creation', () => {
    const validRequest = {
      name: 'New Task',
      rule_type: 'daily' as const,
    };

    expect(() => CreateTaskRequestSchema.parse(validRequest)).not.toThrow();
    const parsed = CreateTaskRequestSchema.parse(validRequest);
    expect(parsed.points).toBe(0); // Default value
  });

  it('validates task with all fields', () => {
    const validRequest = {
      name: 'Complete Task',
      description: 'Full description',
      points: 20,
      rule_type: 'repeating' as const,
      rule_config: {
        repeat_days: [0, 6], // Sunday and Saturday
      },
    };

    expect(() => CreateTaskRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('rejects empty name', () => {
    const invalidRequest = {
      name: '',
      rule_type: 'daily' as const,
    };

    expect(() => CreateTaskRequestSchema.parse(invalidRequest)).toThrow();
  });
});
