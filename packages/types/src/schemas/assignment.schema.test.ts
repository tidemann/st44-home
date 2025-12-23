/**
 * Assignment Schema Tests
 */
import { describe, it, expect } from 'vitest';
import {
  AssignmentSchema,
  AssignmentStatusSchema,
  AssignmentFiltersSchema,
  CompleteAssignmentRequestSchema,
  ReassignTaskRequestSchema,
} from './assignment.schema.js';

describe('AssignmentSchema', () => {
  it('validates pending assignment', () => {
    const validAssignment = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      taskId: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Clean Room',
      description: 'Clean your bedroom',
      ruleType: 'daily' as const,
      childId: '123e4567-e89b-12d3-a456-426614174002',
      childName: 'Alice',
      date: '2025-12-22',
      status: 'pending' as const,
      completedAt: null,
      createdAt: '2025-12-22T10:00:00Z',
    };

    expect(() => AssignmentSchema.parse(validAssignment)).not.toThrow();
    const parsed = AssignmentSchema.parse(validAssignment);
    expect(parsed.status).toBe('pending');
  });

  it('validates completed assignment', () => {
    const validAssignment = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      taskId: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Clean Room',
      description: null,
      ruleType: 'daily' as const,
      childId: '123e4567-e89b-12d3-a456-426614174002',
      childName: 'Bob',
      date: '2025-12-22',
      status: 'completed' as const,
      completedAt: '2025-12-22T15:30:00Z',
      createdAt: '2025-12-22T10:00:00Z',
    };

    expect(() => AssignmentSchema.parse(validAssignment)).not.toThrow();
    const parsed = AssignmentSchema.parse(validAssignment);
    expect(parsed.status).toBe('completed');
    expect(parsed.completedAt).toBe('2025-12-22T15:30:00Z');
  });

  it('validates unassigned task (null child_id)', () => {
    const validAssignment = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      taskId: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Shared Task',
      description: null,
      ruleType: 'daily' as const,
      childId: null,
      childName: null,
      date: '2025-12-22',
      status: 'pending' as const,
      completedAt: null,
      createdAt: '2025-12-22T10:00:00Z',
    };

    expect(() => AssignmentSchema.parse(validAssignment)).not.toThrow();
  });

  it('rejects invalid status', () => {
    const invalidAssignment = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      taskId: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Task',
      description: null,
      ruleType: 'daily' as const,
      childId: null,
      childName: null,
      date: '2025-12-22',
      status: 'invalid_status',
      completedAt: null,
      createdAt: '2025-12-22T10:00:00Z',
    };

    expect(() => AssignmentSchema.parse(invalidAssignment)).toThrow();
  });

  it('rejects invalid date format', () => {
    const invalidAssignment = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      taskId: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Task',
      description: null,
      ruleType: 'daily' as const,
      childId: null,
      childName: null,
      date: '12/22/2025', // Wrong format
      status: 'pending' as const,
      completedAt: null,
      createdAt: '2025-12-22T10:00:00Z',
    };

    expect(() => AssignmentSchema.parse(invalidAssignment)).toThrow();
  });
});

describe('AssignmentFiltersSchema', () => {
  it('validates empty filters', () => {
    const validFilters = {};
    expect(() => AssignmentFiltersSchema.parse(validFilters)).not.toThrow();
  });

  it('validates date filter', () => {
    const validFilters = {
      date: '2025-12-22',
    };
    expect(() => AssignmentFiltersSchema.parse(validFilters)).not.toThrow();
  });

  it('validates child_id filter', () => {
    const validFilters = {
      childId: '123e4567-e89b-12d3-a456-426614174000',
    };
    expect(() => AssignmentFiltersSchema.parse(validFilters)).not.toThrow();
  });

  it('validates status filter', () => {
    const validFilters = {
      status: 'completed' as const,
    };
    expect(() => AssignmentFiltersSchema.parse(validFilters)).not.toThrow();
  });

  it('validates date range filter', () => {
    const validFilters = {
      startDate: '2025-12-01',
      endDate: '2025-12-31',
    };
    expect(() => AssignmentFiltersSchema.parse(validFilters)).not.toThrow();
  });
});

describe('CompleteAssignmentRequestSchema', () => {
  it('validates request with timestamp', () => {
    const validRequest = {
      completedAt: '2025-12-22T15:30:00Z',
    };
    expect(() => CompleteAssignmentRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('validates request without timestamp', () => {
    const validRequest = {};
    expect(() => CompleteAssignmentRequestSchema.parse(validRequest)).not.toThrow();
  });
});

describe('ReassignTaskRequestSchema', () => {
  it('validates reassignment to child', () => {
    const validRequest = {
      childId: '123e4567-e89b-12d3-a456-426614174000',
    };
    expect(() => ReassignTaskRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('rejects invalid UUID', () => {
    const invalidRequest = {
      childId: 'not-a-uuid',
    };
    expect(() => ReassignTaskRequestSchema.parse(invalidRequest)).toThrow();
  });
});

describe('AssignmentStatusSchema', () => {
  it('validates valid status values', () => {
    expect(() => AssignmentStatusSchema.parse('pending')).not.toThrow();
    expect(() => AssignmentStatusSchema.parse('completed')).not.toThrow();
  });
});
