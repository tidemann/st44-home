import { describe, it, expect } from 'vitest';
import { TaskRuleTypeSchema } from './task.schema.js';
import { ScanResultSchema, TaskTurnSchema, TurnHistoryEntrySchema } from './turn.schema.js';

const emma = '11111111-1111-4111-8111-111111111111';
const jonas = '22222222-2222-4222-8222-222222222222';
const task = '33333333-3333-4333-8333-333333333333';

describe('«Etter tur» schemas (ST-2075)', () => {
  it('next_in_line is a rule type', () => {
    expect(TaskRuleTypeSchema.parse('next_in_line')).toBe('next_in_line');
  });

  it('a turn names the order and whose turn it is', () => {
    const turn = TaskTurnSchema.parse({
      taskId: task,
      name: 'Tømme oppvaskmaskinen',
      points: 5,
      assignmentId: null,
      order: [
        { childId: emma, name: 'Emma' },
        { childId: jonas, name: 'Jonas' },
      ],
      turnChildId: emma,
      scanCode: null,
    });
    expect(turn.order.map((c) => c.name)).toEqual(['Emma', 'Jonas']);
  });

  it('a history line is app, scan or moved', () => {
    const base = {
      childId: emma,
      childName: 'Emma',
      at: '2026-11-01T15:48:00.000Z',
      points: 5,
      movedByName: null,
    };
    expect(TurnHistoryEntrySchema.parse({ ...base, kind: 'scan' }).kind).toBe('scan');
    expect(() => TurnHistoryEntrySchema.parse({ ...base, kind: 'qr' })).toThrow();
  });

  it('a scan is done or not your turn', () => {
    const notYours = ScanResultSchema.parse({
      result: 'not_your_turn',
      taskId: task,
      taskName: 'Tømme oppvaskmaskinen',
      points: 5,
      turnChildName: 'Emma',
      youAreNext: false,
    });
    expect(notYours.result).toBe('not_your_turn');
    expect(() => ScanResultSchema.parse({ result: 'done', taskId: task })).toThrow();
  });
});
