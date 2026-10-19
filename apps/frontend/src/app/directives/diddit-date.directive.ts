import { DestroyRef, Directive, ElementRef, LOCALE_ID, effect, inject } from '@angular/core';
import { isDesktopSignal } from '../utils/desktop-query';

let nextDateId = 0;

const pad = (n: number): string => String(n).padStart(2, '0');
const isoDay = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Guide: Desktop rules for all popups, rule 6 — no browser date picker inside a popup. On desktop
 * pressing the host `datetime-local` field opens a Diddit menu: the month as a grid of days and a
 * time field under it. The phone keeps the native picker, unchanged.
 *
 * The input stays the form control: every choice writes its `YYYY-MM-DDTHH:mm` value and fires
 * `input` and `change`. The keyboard can still type straight into the field.
 */
@Directive({ selector: 'input[type=datetime-local][appDidditDate]' })
export class DidditDate {
  private readonly input = inject(ElementRef<HTMLInputElement>).nativeElement as HTMLInputElement;
  private readonly locale = inject(LOCALE_ID);
  private readonly desktop = isDesktopSignal();
  private readonly menuId = `diddit-date-${nextDateId++}`;
  private menu: HTMLElement | null = null;
  /** First day of the month on show */
  private month = new Date();
  /** True while the grid is redrawn: the focused day goes with it, and that is not leaving */
  private rendering = false;

  constructor() {
    const onMouseDown = (event: MouseEvent): void => {
      if (!this.desktop() || event.button !== 0 || this.input.disabled) return;
      event.preventDefault();
      this.input.focus();
      if (this.menu) this.close();
      else this.open();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!this.desktop() || this.menu || this.input.disabled) return;
      if (event.key === 'Enter' || (event.altKey && event.key === 'ArrowDown')) {
        event.preventDefault();
        this.open();
      }
    };
    this.input.addEventListener('mousedown', onMouseDown);
    this.input.addEventListener('keydown', onKeyDown);

    effect(() => {
      if (!this.desktop()) this.close(false);
    });

    inject(DestroyRef).onDestroy(() => {
      this.input.removeEventListener('mousedown', onMouseDown);
      this.input.removeEventListener('keydown', onKeyDown);
      this.close(false);
    });
  }

  private value(): { day: string; time: string } {
    const [day = '', time = ''] = this.input.value.split('T');
    return { day, time };
  }

  /** The time a new deadline starts at: the next whole hour */
  private defaultTime(): string {
    return `${pad((new Date().getHours() + 1) % 24)}:00`;
  }

  private write(day: string, time: string): void {
    this.input.value = `${day}T${time}`;
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private open(): void {
    const { day } = this.value();
    const shown = day ? new Date(`${day}T00:00`) : new Date();
    this.month = new Date(shown.getFullYear(), shown.getMonth(), 1);

    const menu = document.createElement('div');
    menu.id = this.menuId;
    menu.className = 'diddit-menu diddit-date';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('tabindex', '-1');
    menu.setAttribute('aria-label', $localize`:@@didditDate.label:Velg dato og klokkeslett`);
    menu.setAttribute('popover', 'manual');
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        // The menu closes, not the popup around it
        event.stopPropagation();
        event.preventDefault();
        this.close();
      }
    });
    menu.addEventListener('focusout', (event) => {
      if (!this.rendering && !menu.contains(event.relatedTarget as Node | null)) this.close(false);
    });

    this.input.insertAdjacentElement('afterend', menu);
    this.menu = menu;
    this.input.setAttribute('aria-expanded', 'true');
    this.input.setAttribute('aria-controls', this.menuId);
    this.render();
    menu.showPopover?.();
    this.place();
    document.addEventListener('mousedown', this.onOutside, true);
    window.addEventListener('resize', this.onReflow);
    window.addEventListener('scroll', this.onReflow, true);
    (
      menu.querySelector<HTMLElement>('[aria-pressed="true"], .diddit-date-day:not(:disabled)') ??
      menu
    ).focus();
  }

  private render(): void {
    const menu = this.menu;
    if (!menu) return;
    this.rendering = true;
    menu.replaceChildren();
    this.rendering = false;
    const { day: chosen, time } = this.value();
    const min = this.input.min ? this.input.min.split('T')[0] : '';
    const today = isoDay(new Date());

    const head = document.createElement('div');
    head.className = 'diddit-date-head';
    const title = document.createElement('span');
    title.className = 'diddit-date-title';
    title.setAttribute('aria-live', 'polite');
    title.textContent = new Intl.DateTimeFormat(this.locale, {
      month: 'long',
      year: 'numeric',
    }).format(this.month);
    const step = (label: string, text: string, by: number): HTMLButtonElement => {
      const button = this.button('diddit-date-step', text, () => {
        this.month = new Date(this.month.getFullYear(), this.month.getMonth() + by, 1);
        this.render();
        this.menu?.querySelector<HTMLElement>(`.diddit-date-step[data-by="${by}"]`)?.focus();
      });
      button.dataset['by'] = String(by);
      button.setAttribute('aria-label', label);
      return button;
    };
    head.append(
      step($localize`:@@didditDate.previous:Forrige måned`, '‹', -1),
      title,
      step($localize`:@@didditDate.next:Neste måned`, '›', 1),
    );

    const grid = document.createElement('div');
    grid.className = 'diddit-date-grid';
    const weekday = new Intl.DateTimeFormat(this.locale, { weekday: 'short' });
    for (let i = 0; i < 7; i++) {
      const name = document.createElement('span');
      name.className = 'diddit-date-weekday';
      name.setAttribute('aria-hidden', 'true');
      // 2024-01-01 was a Monday
      name.textContent = weekday.format(new Date(2024, 0, 1 + i)).replace('.', '');
      grid.append(name);
    }
    const first = (this.month.getDay() + 6) % 7;
    for (let i = 0; i < first; i++) grid.append(document.createElement('span'));
    const label = new Intl.DateTimeFormat(this.locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const days = new Date(this.month.getFullYear(), this.month.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const date = new Date(this.month.getFullYear(), this.month.getMonth(), d);
      const iso = isoDay(date);
      const button = this.button('diddit-date-day', String(d), () => {
        this.write(iso, this.value().time || this.defaultTime());
        this.render();
        this.menu?.querySelector<HTMLElement>('.diddit-date-day[aria-pressed="true"]')?.focus();
      });
      button.setAttribute('aria-label', label.format(date));
      button.setAttribute('aria-pressed', String(iso === chosen));
      button.classList.toggle('today', iso === today);
      button.disabled = !!min && iso < min;
      grid.append(button);
    }

    const timeRow = document.createElement('label');
    timeRow.className = 'diddit-date-time';
    const timeLabel = document.createElement('span');
    timeLabel.textContent = $localize`:@@didditDate.time:Klokkeslett`;
    const timeField = document.createElement('input');
    timeField.type = 'time';
    timeField.className = 'form-input';
    timeField.value = time || this.defaultTime();
    timeField.addEventListener('change', () => {
      if (timeField.value) this.write(this.value().day || today, timeField.value);
    });
    timeRow.append(timeLabel, timeField);

    const done = this.button(
      'btn btn-primary diddit-date-done',
      $localize`:@@didditDate.done:Ferdig`,
      () => this.close(),
    );

    menu.append(head, grid, timeRow, done);
  }

  private button(className: string, text: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
  }

  /** Under the field, left-aligned with it; above it when the window has no room below */
  private place(): void {
    if (!this.menu) return;
    const field = this.input.getBoundingClientRect();
    const gap = 4;
    const room = window.innerHeight - field.bottom - gap - 24;
    this.menu.style.left = `${field.left}px`;
    this.menu.style.width = `${field.width}px`;
    const height = this.menu.offsetHeight;
    const top = height > room && field.top > room ? field.top - gap - height : field.bottom + gap;
    this.menu.style.top = `${Math.max(gap, top)}px`;
  }

  private readonly onReflow = (event?: Event): void => {
    if (event?.target === this.menu) return;
    this.place();
  };

  private readonly onOutside = (event: MouseEvent): void => {
    const target = event.target as Node;
    if (this.menu?.contains(target) || target === this.input) return;
    this.close(false);
  };

  private close(refocus = true): void {
    if (!this.menu) return;
    const menu = this.menu;
    this.menu = null;
    document.removeEventListener('mousedown', this.onOutside, true);
    window.removeEventListener('resize', this.onReflow);
    window.removeEventListener('scroll', this.onReflow, true);
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-controls');
    menu.remove();
    if (refocus) this.input.focus();
  }
}
