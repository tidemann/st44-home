import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Child } from '@st44/types';
import { RotationOrder, moveItem } from './rotation-order';

const child = (id: string, name: string): Child => ({
  id,
  householdId: 'h1',
  name,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const emma = child('emma', 'Emma');
const jonas = child('jonas', 'Jonas');
const mathea = child('mathea', 'Mathea');

/** Wednesday of ISO week 45, 2026 */
const TODAY = new Date(2026, 10, 4, 12);

function pointer(type: string, init: { clientY?: number; pointerType?: string } = {}): Event {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientY: init.clientY ?? 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
  return event;
}

describe('RotationOrder (ST-2030)', () => {
  let fixture: ComponentFixture<RotationOrder>;
  let el: HTMLElement;
  let emitted: string[][];
  let oddEvenEmitted: boolean[];

  const text = (selector: string) =>
    Array.from(el.querySelectorAll(selector)).map((n) =>
      n.textContent!.replace(/\s+/g, ' ').trim(),
    );

  function setup(order: string[], extra: Record<string, unknown> = {}) {
    fixture.componentRef.setInput('children', [emma, jonas, mathea]);
    fixture.componentRef.setInput('order', order);
    fixture.componentRef.setInput('today', TODAY);
    for (const [key, value] of Object.entries(extra)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RotationOrder] }).compileComponents();
    fixture = TestBed.createComponent(RotationOrder);
    el = fixture.nativeElement;
    emitted = [];
    oddEvenEmitted = [];
    fixture.componentInstance.orderChange.subscribe((ids) => emitted.push(ids));
    fixture.componentInstance.oddEvenChange.subscribe((on) => oddEvenEmitted.push(on));
  });

  it('one row per child: ticked rows in rotation order with their week, then the rest', () => {
    setup(['jonas', 'emma']);
    expect(text('.nm').slice(0, 3)).toEqual(['Jonas', 'Emma', 'Mathea']);
    expect(text('.row .wk')).toEqual(['uke 45', 'uke 46', 'er ikke med']);
    // a child who is not in has no handle
    expect(el.querySelectorAll('.row')[2].querySelector('.grip')).toBeNull();
    expect(el.querySelectorAll('.grip').length).toBe(2);
  });

  it('says who has this week and next week', () => {
    setup(['emma', 'jonas']);
    expect(text('.prev .half')).toEqual(['Denne uka (uke 45): Emma', 'Neste uke (uke 46): Jonas']);
    expect(text('#rotation-switch-line')).toEqual(['De bytter hver uke.']);
  });

  it('three children: weeks 45-47, odd/even is off and says why', () => {
    setup(['emma', 'jonas', 'mathea'], { oddEven: true });
    expect(text('.row .wk')).toEqual(['uke 45', 'uke 46', 'uke 47']);
    const sw = el.querySelector<HTMLButtonElement>('[role="switch"]')!;
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(sw.getAttribute('aria-disabled')).toBe('true');
    expect(text('#rotation-switch-line')).toEqual([
      'Oddetall/partall passer bare når to barn deler.',
    ]);
    sw.click();
    expect(oddEvenEmitted).toEqual([]);
  });

  it('odd/even with two children: top row has the odd weeks', () => {
    setup(['emma', 'jonas'], { oddEven: true });
    expect(text('.row .wk').slice(0, 2)).toEqual(['oddetallsuker', 'partallsuker']);
    expect(text('#rotation-switch-line')).toEqual(['Emma tar oddetallsuker, Jonas partallsuker.']);
    expect(text('.prev .half')).toEqual([
      'Denne uka (uke 45, oddetall): Emma',
      'Neste uke (uke 46, partall): Jonas',
    ]);
    el.querySelector<HTMLButtonElement>('[role="switch"]')!.click();
    expect(oddEvenEmitted).toEqual([false]);
  });

  it('edit: rows start next week and this week keeps its child (rule 1)', () => {
    setup(['mathea', 'emma', 'jonas'], { startsNextWeek: true, thisWeekName: 'Jonas' });
    expect(text('.row .wk')).toEqual(['uke 46', 'uke 47', 'uke 48']);
    expect(text('.prev .half')).toEqual([
      'Denne uka (uke 45): Jonas',
      'Neste uke (uke 46): Mathea',
    ]);
  });

  it('week numbers follow the year end', () => {
    setup(['emma', 'jonas', 'mathea'], { today: new Date(2026, 11, 30) });
    expect(text('.row .wk')).toEqual(['uke 53', 'uke 1', 'uke 2']);
  });

  it('ticking adds the child last; unticking takes it out', () => {
    setup(['emma', 'jonas']);
    el.querySelectorAll<HTMLInputElement>('.cb')[2].click();
    expect(emitted.at(-1)).toEqual(['emma', 'jonas', 'mathea']);
    el.querySelectorAll<HTMLInputElement>('.cb')[0].click();
    expect(emitted.at(-1)).toEqual(['jonas']);
  });

  it('fewer than two: no handles, no switch, the reason under the list', () => {
    setup(['emma']);
    expect(el.querySelector('.grip')).toBeNull();
    expect(el.querySelector('[role="switch"]')).toBeNull();
    expect(text('.why')).toEqual(['Velg minst to barn – en rotasjon trenger noen å bytte med.']);
    expect(el.querySelector('.why')!.getAttribute('role')).toBeNull();
  });

  it('after «Legg til» with fewer than two, the list is marked and the line is an alert', () => {
    setup([], { showError: true });
    expect(el.querySelector('.rot')!.classList).toContain('bad');
    expect(el.querySelector('.why')!.getAttribute('role')).toBe('alert');
    expect(el.querySelector('.why')!.classList).toContain('err');
  });

  it('move mode: the handle gives arrows, and the arrows move the row', () => {
    setup(['emma', 'jonas', 'mathea']);
    el.querySelectorAll<HTMLButtonElement>('.grip')[1].click();
    fixture.detectChanges();
    expect(text('.hint')).toEqual([
      'Flytt Jonas med pilene. Trykk håndtaket igjen når du er ferdig.',
    ]);
    const arrows = el.querySelectorAll<HTMLButtonElement>('.arr');
    expect(arrows.length).toBe(2);
    expect(el.querySelector('.row.moving')).not.toBeNull();
    arrows[0].click();
    expect(emitted.at(-1)).toEqual(['jonas', 'emma', 'mathea']);
    fixture.detectChanges();
    expect(text('[aria-live]')).toEqual(['Jonas er nå nummer 1, uke 45.']);
  });

  it('move mode on the last row hides the down arrow but keeps its place', () => {
    setup(['emma', 'jonas', 'mathea']);
    el.querySelectorAll<HTMLButtonElement>('.grip')[2].click();
    fixture.detectChanges();
    const down = el.querySelector<HTMLButtonElement>('[data-arrow="down"]')!;
    expect(down.classList).toContain('gone');
    expect(down.getAttribute('aria-hidden')).toBe('true');
  });

  it('move mode: arrow keys move the row, Escape ends it', () => {
    setup(['emma', 'jonas', 'mathea']);
    el.querySelectorAll<HTMLButtonElement>('.grip')[0].click();
    fixture.detectChanges();
    const row = el.querySelector('.row.moving [data-arrow="down"]')!;
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(emitted.at(-1)).toEqual(['jonas', 'emma', 'mathea']);
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(el.querySelector('.row.moving')).toBeNull();
  });

  it('dragging the handle lifts the row and drops it where it is let go', () => {
    setup(['emma', 'jonas', 'mathea']);
    // jsdom has no layout: give the rows the drawn 68 px height, 8 px apart
    el.querySelectorAll<HTMLElement>('[data-ticked-row]').forEach((row, i) => {
      Object.defineProperty(row, 'offsetTop', { value: i * 76 });
      Object.defineProperty(row, 'offsetHeight', { value: 68 });
    });
    const grip = el.querySelectorAll<HTMLButtonElement>('.grip')[0];
    grip.dispatchEvent(pointer('pointerdown', { clientY: 10 }));
    window.dispatchEvent(pointer('pointermove', { clientY: 200 }));
    fixture.detectChanges();
    expect(el.querySelector('.row.held')).not.toBeNull();
    expect(el.querySelector('.slot')).not.toBeNull();
    window.dispatchEvent(pointer('pointerup', { clientY: 200 }));
    fixture.detectChanges();
    expect(emitted.at(-1)).toEqual(['jonas', 'mathea', 'emma']);
    expect(el.querySelector('.row.held')).toBeNull();
    // the click that follows the drop does not open move mode
    grip.click();
    fixture.detectChanges();
    expect(el.querySelector('.row.moving')).toBeNull();
  });

  it('dragging the last row to the top puts it first', () => {
    setup(['emma', 'jonas', 'mathea']);
    el.querySelectorAll<HTMLElement>('[data-ticked-row]').forEach((row, i) => {
      Object.defineProperty(row, 'offsetTop', { value: i * 76 });
      Object.defineProperty(row, 'offsetHeight', { value: 68 });
    });
    const grip = el.querySelectorAll<HTMLButtonElement>('.grip')[2];
    grip.dispatchEvent(pointer('pointerdown', { clientY: 300 }));
    window.dispatchEvent(pointer('pointermove', { clientY: 0 }));
    fixture.detectChanges();
    // the weeks follow while dragging, and the sentence too
    expect(text('.row .wk')).toEqual(['uke 46', 'uke 47', 'uke 45']);
    expect(text('.prev .half')[0]).toBe('Denne uka (uke 45): Mathea');
    window.dispatchEvent(pointer('pointerup', { clientY: 0 }));
    expect(emitted.at(-1)).toEqual(['mathea', 'emma', 'jonas']);
  });

  it('a small wobble on the handle is a press, not a drag', () => {
    setup(['emma', 'jonas']);
    const grip = el.querySelectorAll<HTMLButtonElement>('.grip')[0];
    grip.dispatchEvent(pointer('pointerdown', { clientY: 10 }));
    window.dispatchEvent(pointer('pointermove', { clientY: 12 }));
    window.dispatchEvent(pointer('pointerup', { clientY: 12 }));
    expect(emitted).toEqual([]);
  });

  it('moveItem moves one item and leaves the input alone', () => {
    const list = ['a', 'b', 'c'];
    expect(moveItem(list, 2, 0)).toEqual(['c', 'a', 'b']);
    expect(list).toEqual(['a', 'b', 'c']);
  });

  describe('turns mode (ST-2075)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('turns', true);
      setup(['emma', 'jonas', 'mathea']);
    });

    it('labels the three ticked rows by turn', () => {
      expect(text('[data-ticked-row] .wk')).toEqual(['nå', 'neste', '3. i rekken']);
    });

    it('asks which children take turns', () => {
      expect(text('legend')).toEqual(['Hvem går oppgaven mellom? *']);
    });

    it('hides odd/even and shows who has the turn now and next', () => {
      expect(el.querySelector('.swrow')).toBeNull();
      expect(text('.prev')).toEqual([
        'Emma har turen nå. Når Emma har gjort den, går turen til Jonas.',
      ]);
    });

    it('explains that the top child has the turn now', () => {
      expect(text('.hint')).toEqual([
        'Den øverste har turen nå. Dra håndtaket for å bytte rekkefølge.',
      ]);
    });
  });
});
