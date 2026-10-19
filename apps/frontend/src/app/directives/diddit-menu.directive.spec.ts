import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DidditMenu } from './diddit-menu.directive';
import { DidditDate } from './diddit-date.directive';

@Component({
  imports: [DidditMenu, DidditDate, ReactiveFormsModule],
  template: `
    <label for="role">Rolle</label>
    <select id="role" appDidditMenu [formControl]="role">
      <option value="" disabled>Velg …</option>
      <option value="parent">Forelder</option>
      <option value="member">Medlem</option>
    </select>
    <input type="datetime-local" appDidditDate [formControl]="deadline" min="2030-05-10T00:00" />
  `,
})
class Host {
  readonly role = new FormControl('parent');
  readonly deadline = new FormControl('');
}

function setDesktop(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: () => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
}

function mount() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root: HTMLElement = fixture.nativeElement;
  return {
    fixture,
    root,
    select: root.querySelector('select') as HTMLSelectElement,
    date: root.querySelector('input') as HTMLInputElement,
  };
}

const press = (el: Element): boolean =>
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));

describe('Diddit menus in popups (ST-1489, rule 6)', () => {
  const realMatchMedia = window.matchMedia;

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: realMatchMedia,
    });
  });

  describe('on desktop', () => {
    beforeEach(() => setDesktop(true));

    it('opens a Diddit listbox instead of the browser list, without the placeholder', () => {
      const { root, select } = mount();
      expect(press(select)).toBe(false);
      const options = root.querySelectorAll('.diddit-menu [role="option"]');
      expect(Array.from(options).map((o) => o.textContent)).toEqual(['Forelder', 'Medlem']);
      expect(select.getAttribute('aria-expanded')).toBe('true');
      expect(root.querySelector('.diddit-menu')?.getAttribute('aria-label')).toBe('Rolle');
    });

    it('writes the chosen option to the form control and closes', () => {
      const { root, select, fixture } = mount();
      press(select);
      (root.querySelectorAll('.diddit-menu [role="option"]')[1] as HTMLElement).click();
      expect(fixture.componentInstance.role.value).toBe('member');
      expect(root.querySelector('.diddit-menu')).toBeNull();
      expect(select.getAttribute('aria-expanded')).toBe('false');
    });

    it('moves with the arrows, chooses with Enter, and Escape closes only the menu', () => {
      const { root, select, fixture } = mount();
      select.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
      const list = root.querySelector('.diddit-menu') as HTMLElement;
      list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(fixture.componentInstance.role.value).toBe('member');

      press(select);
      const escapeSeen = vi.fn();
      document.addEventListener('keydown', escapeSeen);
      (root.querySelector('.diddit-menu') as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      expect(root.querySelector('.diddit-menu')).toBeNull();
      expect(escapeSeen).not.toHaveBeenCalled();
      document.removeEventListener('keydown', escapeSeen);
    });

    it('opens a Diddit date menu and writes the chosen day with a time', () => {
      const { root, date, fixture } = mount();
      fixture.componentInstance.deadline.setValue('2030-05-14T18:30');
      expect(press(date)).toBe(false);
      const menu = root.querySelector('.diddit-date') as HTMLElement;
      expect(menu).not.toBeNull();
      const days = Array.from(menu.querySelectorAll<HTMLButtonElement>('.diddit-date-day'));
      expect(days).toHaveLength(31);
      expect(days[8].disabled).toBe(true); // 9 May is before min
      expect(days[13].getAttribute('aria-pressed')).toBe('true');

      days[19].click();
      expect(fixture.componentInstance.deadline.value).toBe('2030-05-20T18:30');
      expect(root.querySelector('.diddit-date')).not.toBeNull();

      (root.querySelector('.diddit-date-done') as HTMLElement).click();
      expect(root.querySelector('.diddit-date')).toBeNull();
    });

    it('moves between days with the arrow keys, across the month edge', () => {
      const { root, date, fixture } = mount();
      fixture.componentInstance.deadline.setValue('2030-05-30T18:30');
      press(date);
      const key = (k: string): void => {
        document.activeElement?.dispatchEvent(
          new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }),
        );
      };
      const focused = (): string | null | undefined => document.activeElement?.textContent;
      expect(focused()).toBe('30');
      key('ArrowLeft');
      expect(focused()).toBe('29');
      key('ArrowUp');
      expect(focused()).toBe('22');
      key('ArrowDown');
      expect(focused()).toBe('29');
      key('ArrowRight');
      key('ArrowRight');
      key('ArrowRight');
      expect(focused()).toBe('1'); // 1 June
      expect(root.querySelectorAll('.diddit-date-day')).toHaveLength(30);
      expect(fixture.componentInstance.deadline.value).toBe('2030-05-30T18:30');
    });

    it('keeps focus when an arrow would move to a day before min', () => {
      const { date, fixture } = mount();
      fixture.componentInstance.deadline.setValue('2030-05-12T18:30');
      press(date);
      expect(document.activeElement?.textContent).toBe('12');
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }),
      );
      expect(document.activeElement?.textContent).toBe('12');
    });

    it('starts a deadline picked today after 23:00 at tomorrow 00:00', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2030, 4, 14, 23, 30));
      try {
        const { root, date, fixture } = mount();
        press(date);
        const days = root.querySelectorAll<HTMLButtonElement>('.diddit-date-day');
        days[13].click(); // 14 May = today
        expect(fixture.componentInstance.deadline.value).toBe('2030-05-15T00:00');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('on the phone', () => {
    beforeEach(() => setDesktop(false));

    it('leaves the native select and date picker alone', () => {
      const { root, select, date } = mount();
      expect(press(select)).toBe(true);
      expect(press(date)).toBe(true);
      expect(root.querySelector('.diddit-menu')).toBeNull();
    });
  });
});
