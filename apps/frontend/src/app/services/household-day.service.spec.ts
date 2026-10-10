import { TestBed } from '@angular/core/testing';
import type { Assignment } from '@st44/types';
import { ApiService } from './api.service';
import { HouseholdDayService } from './household-day.service';
import { isoDay } from '../utils/poeng-format';

function assignment(partial: Partial<Assignment>): Assignment {
  return {
    id: crypto.randomUUID(),
    taskId: crypto.randomUUID(),
    title: 'Dekke bord',
    description: null,
    ruleType: 'daily',
    childId: null,
    childName: 'Emma',
    date: isoDay(),
    status: 'pending',
    completedAt: null,
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe('HouseholdDayService', () => {
  const get = vi.fn();

  beforeEach(() => {
    get.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: { get } }],
    });
  });

  it('asks for exactly one day, and the week before for open chores', async () => {
    get.mockResolvedValue({ assignments: [] });
    await TestBed.inject(HouseholdDayService).load('h1');

    expect(get).toHaveBeenCalledWith(`/households/h1/assignments?date=${isoDay()}&days=1`);
    expect(get).toHaveBeenCalledWith(
      `/households/h1/assignments?date=${isoDay(-7)}&days=7&status=pending`,
    );
  });

  it('keeps only open chores from before today as overdue, oldest first', async () => {
    const today = assignment({ title: 'I dag' });
    const yesterday = assignment({ title: 'I går', date: isoDay(-1) });
    const older = assignment({ title: 'Eldre', date: isoDay(-3) });
    get.mockImplementation((url: string) =>
      Promise.resolve({
        assignments: url.includes('days=1') ? [today] : [yesterday, today, older],
      }),
    );

    const day = await TestBed.inject(HouseholdDayService).load('h1');

    expect(day.today.map((a) => a.title)).toEqual(['I dag']);
    expect(day.overdue.map((a) => a.title)).toEqual(['Eldre', 'I går']);
  });
});
