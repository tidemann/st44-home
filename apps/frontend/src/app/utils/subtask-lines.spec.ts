import { describe, it, expect } from 'vitest';
import type { AssignmentSubtask } from '@st44/types';
import {
  leftLine,
  popupCountLine,
  waitingLine,
  doneLine,
  sentLine,
  hasSubtasks,
} from './subtask-lines';

const subtasks: AssignmentSubtask[] = [
  {
    id: 's1',
    name: 'Re opp sengen',
    points: 5,
    position: 0,
    state: 'done',
    updatedAt: '2026-11-02T16:02:00.000Z',
  },
  { id: 's2', name: 'Rydde rommet', points: 5, position: 1, state: null, updatedAt: null },
  {
    id: 's3',
    name: 'Vaske gulvet',
    points: 10,
    position: 2,
    state: 'not_possible',
    updatedAt: null,
  },
];

const allOpen: AssignmentSubtask[] = subtasks.map((subtask) => ({
  ...subtask,
  state: null,
  updatedAt: null,
}));
const allDone: AssignmentSubtask[] = subtasks.map((subtask) => ({
  ...subtask,
  state: 'done',
  updatedAt: '2026-11-02T16:02:00.000Z',
}));

describe('sub-task count lines', () => {
  it('counts only open sub-tasks as left and appends the not-possible count when present', () => {
    expect(leftLine(subtasks)).toBe('1 av 3 igjen · 1 ikke mulig');
    expect(leftLine(allOpen)).toBe('3 av 3 igjen');
  });

  it('shows completion in the popup only when all sub-tasks are done', () => {
    expect(popupCountLine(allDone)).toBe('Alt gjort!');
    expect(popupCountLine(subtasks)).toBe('1 av 3 igjen · 1 ikke mulig');
  });

  it('adds the not-possible tail to the waiting line only when needed', () => {
    expect(waitingLine(subtasks)).toBe('Venter på godkjenning · 1 ikke mulig');
    expect(waitingLine(allOpen)).toBe('Venter på godkjenning');
  });

  it('reports the done count before sending and after sending', () => {
    expect(doneLine(subtasks)).toBe('1 av 3 deloppgaver gjort');
    expect(doneLine([{ ...subtasks[0], state: null }])).toBe('0 av 1 deloppgave gjort');
    expect(doneLine([subtasks[0]])).toBe('1 av 1 deloppgave gjort');
    expect(sentLine(subtasks)).toBe('1 av 3 gjort · 1 ikke mulig');
  });

  it('recognises a chore with a nonempty sub-task list', () => {
    expect(hasSubtasks({ subtasks: [] })).toBe(false);
    expect(hasSubtasks({})).toBe(false);
    expect(hasSubtasks({ subtasks })).toBe(true);
  });
});
