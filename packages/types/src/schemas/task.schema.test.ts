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
      householdId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Clean Room',
      description: 'Clean your bedroom',
      points: 10,
      ruleType: 'daily' as const,
      ruleConfig: null,
      active: true,
      createdAt: '2025-12-22T10:00:00Z',
      updatedAt: '2025-12-22T10:00:00Z',
    };

    expect(() => TaskSchema.parse(validTask)).not.toThrow();
    const parsed = TaskSchema.parse(validTask);
    expect(parsed.ruleType).toBe('daily');
  });

  it('validates repeating task with config', () => {
    const validTask = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      householdId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Take Out Trash',
      description: null,
      points: 5,
      ruleType: 'repeating' as const,
      ruleConfig: {
        repeatDays: [1, 3, 5], // Monday, Wednesday, Friday
      },
      active: true,
      createdAt: '2025-12-22T10:00:00Z',
      updatedAt: '2025-12-22T10:00:00Z',
    };

    expect(() => TaskSchema.parse(validTask)).not.toThrow();
    const parsed = TaskSchema.parse(validTask);
    expect(parsed.ruleConfig?.repeatDays).toEqual([1, 3, 5]);
  });

  it('validates weekly rotation task', () => {
    const validTask = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      householdId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Wash Dishes',
      description: null,
      points: 15,
      ruleType: 'weekly_rotation' as const,
      ruleConfig: {
        rotationType: 'odd_even_week' as const,
        assignedChildren: [
          '123e4567-e89b-12d3-a456-426614174002',
          '123e4567-e89b-12d3-a456-426614174003',
        ],
      },
      active: true,
      createdAt: '2025-12-22T10:00:00Z',
      updatedAt: '2025-12-22T10:00:00Z',
    };

    expect(() => TaskSchema.parse(validTask)).not.toThrow();
    const parsed = TaskSchema.parse(validTask);
    expect(parsed.ruleConfig?.rotationType).toBe('odd_even_week');
  });

  it('rejects invalid rule_type', () => {
    const invalidTask = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      householdId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Task',
      description: null,
      points: 10,
      ruleType: 'invalid_type',
      ruleConfig: null,
      active: true,
      createdAt: '2025-12-22T10:00:00Z',
      updatedAt: '2025-12-22T10:00:00Z',
    };

    expect(() => TaskSchema.parse(invalidTask)).toThrow();
  });

  it('rejects points exceeding maximum', () => {
    const invalidTask = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      householdId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Task',
      description: null,
      points: 9999, // Exceeds max of 1000
      ruleType: 'daily' as const,
      ruleConfig: null,
      active: true,
      createdAt: '2025-12-22T10:00:00Z',
      updatedAt: '2025-12-22T10:00:00Z',
    };

    expect(() => TaskSchema.parse(invalidTask)).toThrow();
  });

  it('rejects invalid repeat_days', () => {
    const invalidTask = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      householdId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Task',
      description: null,
      points: 10,
      ruleType: 'repeating' as const,
      ruleConfig: {
        repeatDays: [7, 8], // Invalid - should be 0-6
      },
      active: true,
      createdAt: '2025-12-22T10:00:00Z',
      updatedAt: '2025-12-22T10:00:00Z',
    };

    expect(() => TaskSchema.parse(invalidTask)).toThrow();
  });
});

describe('CreateTaskRequestSchema', () => {
  it('validates minimal task creation', () => {
    const validRequest = {
      name: 'New Task',
      ruleType: 'daily' as const,
    };

    expect(() => CreateTaskRequestSchema.parse(validRequest)).not.toThrow();
    const parsed = CreateTaskRequestSchema.parse(validRequest);
    expect(parsed.points).toBe(10); // Default value
  });

  it('validates task with all fields', () => {
    const validRequest = {
      name: 'Complete Task',
      description: 'Full description',
      points: 20,
      ruleType: 'repeating' as const,
      ruleConfig: {
        repeatDays: [0, 6], // Sunday and Saturday
      },
    };

    expect(() => CreateTaskRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('rejects empty name', () => {
    const invalidRequest = {
      name: '',
      ruleType: 'daily' as const,
    };

    expect(() => CreateTaskRequestSchema.parse(invalidRequest)).toThrow();
  });
});
