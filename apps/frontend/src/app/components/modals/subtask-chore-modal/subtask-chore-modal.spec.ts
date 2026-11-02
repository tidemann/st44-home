import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AssignmentSubtask } from '@st44/types';
import { SubtaskChoreModal, type SubtaskChore } from './subtask-chore-modal';
import { TaskService } from '../../../services/task.service';

const sub = (id: string, points: number, state: AssignmentSubtask['state'] = null) => ({
  id,
  name: `Trinn ${id}`,
  points,
  position: 0,
  state,
  updatedAt: state ? '2026-11-02T16:02:00.000Z' : null,
});

describe('SubtaskChoreModal', () => {
  let fixture: ComponentFixture<SubtaskChoreModal>;
  let taskService: {
    setSubtaskState: ReturnType<typeof vi.fn>;
    submitTask: ReturnType<typeof vi.fn>;
  };
  let finished: SubtaskChore[];
  let submitted: SubtaskChore[];

  const el = () => document.body;
  const text = () => el().querySelector('[role="dialog"]')?.textContent ?? '';
  const ferdig = () =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find(
      (b) => b.textContent?.trim() === 'Ferdig',
    )!;

  function open(subtasks: AssignmentSubtask[]) {
    fixture.componentRef.setInput('chore', { id: 'a1', taskName: 'Rydd rommet', subtasks });
    fixture.detectChanges();
  }

  beforeEach(async () => {
    taskService = { setSubtaskState: vi.fn(), submitTask: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [SubtaskChoreModal],
      providers: [{ provide: TaskService, useValue: taskService }],
    }).compileComponents();
    fixture = TestBed.createComponent(SubtaskChoreModal);
    finished = [];
    submitted = [];
    fixture.componentInstance.completed.subscribe((c) => finished.push(c));
    fixture.componentInstance.submitted.subscribe((c) => submitted.push(c));
  });

  it('counts what is left and says a parent checks it', () => {
    open([sub('1', 5, 'done'), sub('2', 5), sub('3', 10, 'not_possible')]);
    expect(text()).toContain('1 av 3 igjen · 1 ikke mulig');
    expect(text()).toContain('Mor eller far ser over. Du har huket av 5 av 20 poeng.');
  });

  it('saves a tick at once and shows what the server saved', async () => {
    open([sub('1', 5), sub('2', 5)]);
    taskService.setSubtaskState.mockResolvedValue([sub('1', 5, 'done'), sub('2', 5)]);
    el().querySelector<HTMLButtonElement>('[role="checkbox"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(taskService.setSubtaskState).toHaveBeenCalledWith('a1', '1', 'done');
    expect(text()).toContain('1 av 2 igjen');
  });

  it('«Ikke mulig» saves not_possible', async () => {
    open([sub('1', 5)]);
    taskService.setSubtaskState.mockResolvedValue([sub('1', 5, 'not_possible')]);
    el().querySelector<HTMLButtonElement>('button.chip')!.click();
    await fixture.whenStable();
    expect(taskService.setSubtaskState).toHaveBeenCalledWith('a1', '1', 'not_possible');
  });

  it('«Ferdig» with all ticked finishes the chore (no sending)', () => {
    open([sub('1', 5, 'done'), sub('2', 15, 'done')]);
    expect(text()).toContain('Alt gjort!');
    expect(text()).toContain('Du får 20 poeng.');
    ferdig().click();
    expect(finished).toHaveLength(1);
    expect(taskService.submitTask).not.toHaveBeenCalled();
  });

  it('«Ferdig» with some not done sends it to a parent', async () => {
    open([sub('1', 5, 'done'), sub('2', 15)]);
    taskService.submitTask.mockResolvedValue('2026-11-02T16:20:00.000Z');
    ferdig().click();
    await fixture.whenStable();
    expect(taskService.submitTask).toHaveBeenCalledWith('a1');
    expect(submitted).toHaveLength(1);
    expect(finished).toHaveLength(0);
  });

  it('a failed save says so and keeps the rows as they were', async () => {
    open([sub('1', 5)]);
    taskService.setSubtaskState.mockRejectedValue(new Error('offline'));
    el().querySelector<HTMLButtonElement>('[role="checkbox"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(text()).toContain('Det ble ikke lagret.');
    expect(text()).toContain('1 av 1 igjen');
  });
});
