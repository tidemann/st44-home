import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AssignmentSubtask } from '@st44/types';
import { SubtaskRow } from './subtask-row';

const open: AssignmentSubtask = {
  id: 's1',
  name: 'Re opp sengen',
  points: 5,
  position: 0,
  state: null,
  updatedAt: null,
};

describe('SubtaskRow', () => {
  let fixture: ComponentFixture<SubtaskRow>;
  let row: SubtaskRow;
  const checkbox = () =>
    fixture.nativeElement.querySelector('button[role="checkbox"]') as HTMLButtonElement;
  const chip = () => fixture.nativeElement.querySelector('button.chip') as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SubtaskRow] }).compileComponents();
    fixture = TestBed.createComponent(SubtaskRow);
    row = fixture.componentInstance;
    fixture.componentRef.setInput('subtask', open);
    fixture.detectChanges();
  });

  it('lets a child tick an open sub-task and separately mark it not possible', () => {
    let doneToggles = 0;
    let notPossibleToggles = 0;
    row.toggleDone.subscribe(() => doneToggles++);
    row.toggleNotPossible.subscribe(() => notPossibleToggles++);

    expect(checkbox().getAttribute('aria-checked')).toBe('false');
    expect(chip().textContent?.trim()).toBe('Ikke mulig');
    expect(chip().getAttribute('aria-pressed')).toBe('false');
    expect(chip().getAttribute('aria-label')).toBe('Ikke mulig: Re opp sengen');

    checkbox().click();
    chip().click();
    expect(doneToggles).toBe(1);
    expect(notPossibleToggles).toBe(1);
  });

  it('shows a completed sub-task with a checked box and a time, without the chip', () => {
    fixture.componentRef.setInput('subtask', {
      ...open,
      state: 'done',
      updatedAt: '2026-11-02T16:02:00.000Z',
    });
    fixture.detectChanges();

    expect(checkbox().getAttribute('aria-checked')).toBe('true');
    expect((fixture.nativeElement.querySelector('.box') as HTMLElement).classList).toContain('on');
    expect(fixture.nativeElement.textContent as string).toMatch(/Gjort \d{2}\.\d{2}/);
    expect(chip()).toBeNull();
  });

  it('shows a not-possible sub-task with a pressed chip and dimmed points', () => {
    fixture.componentRef.setInput('subtask', { ...open, state: 'not_possible' });
    fixture.detectChanges();

    expect(chip().classList).toContain('on');
    expect(chip().getAttribute('aria-pressed')).toBe('true');
    expect((fixture.nativeElement.querySelector('.pts') as HTMLElement).classList).toContain('dim');
  });

  it('shows a parent the not-possible state without interactive controls', () => {
    fixture.componentRef.setInput('subtask', { ...open, state: 'not_possible' });
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Ikke mulig');
  });

  it('disables both controls while a save is pending', () => {
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();

    expect(checkbox().disabled).toBe(true);
    expect(chip().disabled).toBe(true);
  });
});
