import { describe, it, expect } from 'vitest';
import type { Task, Child } from '@st44/types';
import { hasNoChildrenLeft } from './task-children';

describe('hasNoChildrenLeft', () => {
  const task = (over: Partial<Task>): Task => ({
    id: 'task-1',
    householdId: 'household-1',
    name: 'Mate katten',
    description: null,
    points: 5,
    ruleType: 'daily',
    ruleConfig: null,
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...over,
  });
  const emma: Child = {
    id: 'child-1',
    householdId: 'household-1',
    name: 'Emma',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('is true when every chosen child is gone', () => {
    const t = task({ ruleConfig: { assignedChildren: ['gone-1', 'gone-2'] } });
    expect(hasNoChildrenLeft(t, [emma])).toBe(true);
    expect(hasNoChildrenLeft(t, [])).toBe(true);
  });

  it('is false while one chosen child is left', () => {
    const t = task({ ruleConfig: { assignedChildren: ['gone-1', 'child-1'] } });
    expect(hasNoChildrenLeft(t, [emma])).toBe(false);
  });

  it('is false for a task for everyone', () => {
    expect(hasNoChildrenLeft(task({ ruleConfig: null }), [])).toBe(false);
    expect(hasNoChildrenLeft(task({ ruleConfig: { assignedChildren: [] } }), [])).toBe(false);
  });

  it('is false for a one-time task (the nightly job does not make those)', () => {
    const t = task({ ruleType: 'single', ruleConfig: { assignedChildren: ['gone-1'] } });
    expect(hasNoChildrenLeft(t, [emma])).toBe(false);
  });
});
