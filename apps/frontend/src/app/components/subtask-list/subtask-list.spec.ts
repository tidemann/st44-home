import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubtaskList, subtaskDraft, subtaskPointsValid, type SubtaskDraft } from './subtask-list';

describe('SubtaskList', () => {
  let fixture: ComponentFixture<SubtaskList>;
  let emitted: SubtaskDraft[][];

  const el = () => fixture.nativeElement as HTMLElement;
  const names = () => current().map((s) => s.name);
  const current = () => fixture.componentInstance.items();
  const click = (selector: string, index = 0) => {
    (el().querySelectorAll<HTMLElement>(selector)[index] as HTMLElement).click();
    fixture.detectChanges();
  };

  function setup(items: SubtaskDraft[]) {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SubtaskList] }).compileComponents();
    fixture = TestBed.createComponent(SubtaskList);
    emitted = [];
    fixture.componentInstance.items.subscribe((list) => emitted.push(list));
  });

  it('with no rows says what the block is for, and offers only «Legg til deloppgave»', () => {
    setup([]);
    expect(el().textContent).toContain('Del opp oppgaven hvis den har flere trinn.');
    expect(el().querySelector('[data-grip]')).toBeNull();
    expect(el().querySelector('.heads')).toBeNull();
    expect(el().querySelector('[data-add]')?.textContent).toContain('+ Legg til deloppgave');
  });

  it('adds an empty row with 5 points', () => {
    setup([]);
    click('[data-add]');
    expect(current()).toHaveLength(1);
    expect(current()[0]).toMatchObject({ name: '', points: 5 });
    expect(emitted.at(-1)).toHaveLength(1);
  });

  it('an add and the typing straight after it build on each other (no lost row)', () => {
    setup([subtaskDraft('Re opp sengen', 5)]);
    // «Legg til» and typing in the same tick, with no change detection in between
    const list = fixture.componentInstance;
    list['add']();
    list['setName'](1, { target: { value: 'Rydd pulten' } } as unknown as Event);
    expect(names()).toEqual(['Re opp sengen', 'Rydd pulten']);
  });

  it('shows the handle and the drag hint from two rows', () => {
    setup([subtaskDraft('Re opp sengen', 5), subtaskDraft('Rydd pulten', 5)]);
    expect(el().querySelectorAll('[data-grip]')).toHaveLength(2);
    expect(el().textContent).toContain('Dra håndtaket for å bytte rekkefølge.');
    expect(el().querySelector('[data-grip]')?.getAttribute('aria-label')).toBe(
      'Flytt Re opp sengen, nummer 1',
    );
  });

  it('× removes that row', () => {
    setup([subtaskDraft('A', 1), subtaskDraft('B', 2), subtaskDraft('C', 3)]);
    click('[data-remove]', 1);
    expect(names()).toEqual(['A', 'C']);
  });

  it('typing a name and points updates the row', () => {
    setup([subtaskDraft('A', 1)]);
    const name = el().querySelector<HTMLInputElement>('[data-name]')!;
    name.value = 'Støvsug gulvet';
    name.dispatchEvent(new Event('input'));
    const pts = el().querySelector<HTMLInputElement>('.pts-in')!;
    pts.value = '10';
    pts.dispatchEvent(new Event('input'));
    expect(current()[0]).toMatchObject({ name: 'Støvsug gulvet', points: 10 });
    pts.value = '';
    pts.dispatchEvent(new Event('input'));
    expect(current()[0].points).toBeNull();
  });

  it('the handle opens move mode: rows show name and points, the arrows move the row', () => {
    setup([subtaskDraft('A', 1), subtaskDraft('B', 2), subtaskDraft('C', 3)]);
    click('[data-grip]', 1);
    expect(el().querySelector('[data-name]')).toBeNull();
    expect(el().querySelector('.row.moving .nm')?.textContent).toBe('B');
    expect(el().textContent).toContain(
      'Flytt «B» med pilene. Trykk håndtaket igjen når du er ferdig.',
    );
    click('[data-arrow="up"]');
    expect(names()).toEqual(['B', 'A', 'C']);
    // Pressing the handle again ends move mode and the fields come back
    click('.row.moving [data-grip]');
    expect(el().querySelector('.row.moving')).toBeNull();
    expect(el().querySelectorAll('[data-name]')).toHaveLength(3);
  });

  it('with errors on, an empty name and bad points are named under the list', () => {
    fixture.componentRef.setInput('showErrors', true);
    setup([subtaskDraft('', 5), subtaskDraft('Rydd pulten', 0)]);
    expect(el().querySelector('[data-name]')?.classList).toContain('error');
    const lines = Array.from(el().querySelectorAll('.err')).map((e) => e.textContent?.trim());
    expect(lines).toEqual([
      'Deloppgave 1 mangler navn.',
      'Poeng for «Rydd pulten» må være mellom 1 og 1000.',
    ]);
  });

  it('points are valid from 1 to 1000, whole numbers only', () => {
    expect([1, 1000].every(subtaskPointsValid)).toBe(true);
    expect([0, 1001, 2.5, null].some(subtaskPointsValid)).toBe(false);
  });
});
