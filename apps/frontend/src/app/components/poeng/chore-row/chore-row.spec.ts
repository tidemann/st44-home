import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChoreRow, LONG_PRESS_MS } from './chore-row';

/** A PointerEvent with the fields the row reads (jsdom has no PointerEvent constructor) */
function pointer(type: string, pointerType: string, x = 100, y = 100): Event {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  return event;
}

describe('ChoreRow', () => {
  let fixture: ComponentFixture<ChoreRow>;
  let row: ChoreRow;
  let pressed: number[];
  let opened: number;

  const card = () => fixture.nativeElement.querySelector('.row') as HTMLElement;
  const title = () => fixture.nativeElement.querySelector('.rowtext-btn') as HTMLButtonElement;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [ChoreRow] }).compileComponents();
    fixture = TestBed.createComponent(ChoreRow);
    row = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Dekke bord');
    fixture.componentRef.setInput('openable', true);
    fixture.componentRef.setInput('pressable', true);
    pressed = [];
    opened = 0;
    row.longPress.subscribe((top) => pressed.push(top));
    row.open.subscribe(() => opened++);
    fixture.detectChanges();
  });

  afterEach(() => {
    // Releases any click a fired press is still holding on the window
    vi.runAllTimers();
    vi.useRealTimers();
  });

  describe('long press (ST-1391)', () => {
    it('draws the held line at once and fires after 500 ms', () => {
      title().dispatchEvent(pointer('pointerdown', 'touch'));
      fixture.detectChanges();
      expect(card().classList).toContain('held');

      vi.advanceTimersByTime(LONG_PRESS_MS - 1);
      expect(pressed.length).toBe(0);
      vi.advanceTimersByTime(1);
      fixture.detectChanges();

      expect(pressed.length).toBe(1);
      expect(card().classList).not.toContain('held');
    });

    it('swallows the click after the lift, so the row does not also open', () => {
      title().dispatchEvent(pointer('pointerdown', 'touch'));
      vi.advanceTimersByTime(LONG_PRESS_MS);
      window.dispatchEvent(pointer('pointerup', 'touch'));
      title().click();
      expect(opened).toBe(0);

      // The next tap is a tap again
      title().click();
      expect(opened).toBe(1);
    });

    it('a short tap still opens the row', () => {
      title().dispatchEvent(pointer('pointerdown', 'touch'));
      vi.advanceTimersByTime(200);
      card().dispatchEvent(pointer('pointerup', 'touch'));
      title().click();
      fixture.detectChanges();

      vi.advanceTimersByTime(LONG_PRESS_MS);
      expect(pressed.length).toBe(0);
      expect(opened).toBe(1);
      expect(card().classList).not.toContain('held');
    });

    it('scroll wins: moving more than 10 px cancels the press', () => {
      title().dispatchEvent(pointer('pointerdown', 'touch', 100, 100));
      card().dispatchEvent(pointer('pointermove', 'touch', 100, 112));
      fixture.detectChanges();
      vi.advanceTimersByTime(LONG_PRESS_MS);

      expect(pressed.length).toBe(0);
      expect(card().classList).not.toContain('held');
    });

    it('a small wobble under 10 px is still a press', () => {
      title().dispatchEvent(pointer('pointerdown', 'touch', 100, 100));
      card().dispatchEvent(pointer('pointermove', 'touch', 104, 106));
      vi.advanceTimersByTime(LONG_PRESS_MS);
      expect(pressed.length).toBe(1);
    });

    it('the browser taking over the scroll (pointercancel) cancels the press', () => {
      title().dispatchEvent(pointer('pointerdown', 'touch'));
      card().dispatchEvent(pointer('pointercancel', 'touch'));
      vi.advanceTimersByTime(LONG_PRESS_MS);
      expect(pressed.length).toBe(0);
    });

    it('a mouse has no long press: desktop is unchanged', () => {
      title().dispatchEvent(pointer('pointerdown', 'mouse'));
      fixture.detectChanges();
      vi.advanceTimersByTime(LONG_PRESS_MS);

      expect(pressed.length).toBe(0);
      expect(card().classList).not.toContain('held');
    });

    it('a row that is not pressable does nothing and draws no line', () => {
      fixture.componentRef.setInput('pressable', false);
      fixture.detectChanges();
      title().dispatchEvent(pointer('pointerdown', 'touch'));
      fixture.detectChanges();
      vi.advanceTimersByTime(LONG_PRESS_MS);

      expect(pressed.length).toBe(0);
      expect(card().classList).not.toContain('held');
    });

    it('the tick-off box keeps its own tap', () => {
      fixture.componentRef.setInput('checkable', true);
      fixture.detectChanges();
      const box = fixture.nativeElement.querySelector('button.cb') as HTMLElement;
      box.dispatchEvent(pointer('pointerdown', 'touch'));
      vi.advanceTimersByTime(LONG_PRESS_MS);
      expect(pressed.length).toBe(0);
    });

    it('stops the touch context menu, never the desktop right-click', () => {
      const touch = pointer('contextmenu', 'touch');
      card().dispatchEvent(touch);
      expect(touch.defaultPrevented).toBe(true);

      const mouse = pointer('contextmenu', 'mouse');
      card().dispatchEvent(mouse);
      expect(mouse.defaultPrevented).toBe(false);
    });
  });

  describe('select mode (ST-1343)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('selectable', true);
      fixture.detectChanges();
    });

    it('the whole row is one checkbox named by its title', () => {
      const box = fixture.nativeElement.querySelector('[role="checkbox"]') as HTMLButtonElement;
      expect(box.getAttribute('aria-checked')).toBe('false');
      expect(box.textContent).toContain('Dekke bord');

      fixture.componentRef.setInput('selected', true);
      fixture.detectChanges();
      expect(box.getAttribute('aria-checked')).toBe('true');
      expect(box.querySelector('.cb.on svg')).toBeTruthy();
    });

    it('a tap toggles, it does not open', () => {
      let toggled = 0;
      row.toggle.subscribe(() => toggled++);
      (fixture.nativeElement.querySelector('[role="checkbox"]') as HTMLElement).click();
      expect(toggled).toBe(1);
      expect(opened).toBe(0);
    });
  });
});
