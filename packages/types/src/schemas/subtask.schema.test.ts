import { describe, it, expect } from 'vitest';
import { SubtaskInputSchema, summarizeSubtasks } from './subtask.schema.js';
import { CreateTaskRequestSchema } from './task.schema.js';

describe('summarizeSubtasks', () => {
  it('summarizes an empty list without declaring it done', () => {
    expect(summarizeSubtasks([])).toEqual({ total: 0, earned: 0, done: 0, notPossible: 0, left: 0, allDone: false });
  });

  it('counts completed, not possible, and remaining rows separately', () => {
    expect(summarizeSubtasks([{ points: 5, state: 'done' }, { points: 5, state: null }, { points: 10, state: 'not_possible' }])).toEqual({ total: 20, earned: 5, done: 1, notPossible: 1, left: 1, allDone: false });
  });

  it('declares all rows done only when all states are done', () => {
    expect(summarizeSubtasks([{ points: 5, state: 'done' }, { points: 5, state: 'done' }, { points: 10, state: 'done' }])).toEqual({ total: 20, earned: 20, done: 3, notPossible: 0, left: 0, allDone: true });
  });
});

describe('SubtaskInputSchema', () => {
  it('trims a valid name', () => {
    expect(SubtaskInputSchema.parse({ name: ' Re opp sengen ', points: 5 })).toEqual({ name: 'Re opp sengen', points: 5 });
  });

  it.each([
    { name: '', points: 5 },
    { name: '   ', points: 5 },
    { name: 'a'.repeat(101), points: 5 },
    { name: 'a', points: -1 },
    { name: 'a', points: 1001 },
    { name: 'a', points: 2.5 },
  ])('rejects invalid input %j', (input) => {
    expect(SubtaskInputSchema.safeParse(input).success).toBe(false);
  });
});

describe('CreateTaskRequestSchema subtasks', () => {
  it('accepts 20 rows and rejects 21', () => {
    const request = { name: 'Rydd rommet', ruleType: 'daily', subtasks: Array.from({ length: 20 }, () => ({ name: 'a', points: 1 })) };
    expect(CreateTaskRequestSchema.safeParse(request).success).toBe(true);
    expect(CreateTaskRequestSchema.safeParse({ ...request, subtasks: [...request.subtasks, { name: 'a', points: 1 }] }).success).toBe(false);
  });
});
