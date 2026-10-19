import { DestroyRef, Directive, ElementRef, LOCALE_ID, effect, inject } from '@angular/core';
import { isDesktopSignal } from '../utils/desktop-query';

let nextDateId = 0;

const pad = (n: number): string => String(n).padStart(2, '0');
const isoDay = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** «18», «1800», «930», «18:00» and «18.00» all read as a 24-hour `HH:mm`; anything else is null */
export const parseTime = (text: string): string | null => {
  const match = /^(\d{1,2})(?:[:.]?(\d{2}))?$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  return hours < 24 && minutes < 60 ? `${pad(hours)}:${pad(minutes)}` : null;
};

/**
 * Guide: Desktop rules for all popups, rule 6 — no browser date picker inside a popup. On desktop
 * pressing the host `datetime-local` field opens a Diddit menu: the month as a grid of days and
 * Diddit's own 24-hour time field under it. The phone keeps the native picker.
 *
 * The closed field shows Diddit text on every width, never the browser's own format (ST-1520):
 * «Velg dato og klokkeslett» when empty, «man. 20. oktober, kl. 18.00» when chosen. The text
 * lies over the input; the input's own text is transparent.
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
  private readonly text = document.createElement('span');
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
    const onInput = (): void => this.showText();
    this.input.addEventListener('mousedown', onMouseDown);
    this.input.addEventListener('keydown', onKeyDown);
    this.input.addEventListener('input', onInput);

    // Before the input in the flow, as tall as it and pulled back over it by the same height
    this.text.className = 'diddit-date-text';
    this.text.setAttribute('aria-hidden', 'true');
    this.input.classList.add('diddit-date-field');
    this.input.insertAdjacentElement('beforebegin', this.text);
    const fit = (): void => {
      const height = this.input.offsetHeight;
      const style = getComputedStyle(this.input);
      this.text.style.height = `${height}px`;
      this.text.style.marginBottom = `${-height}px`;
      // The text starts where the field's own text would: its edge plus its inset
      this.text.style.paddingLeft = `calc(${style.borderLeftWidth} + ${style.paddingLeft})`;
    };
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    resize?.observe(this.input);
    // The form writes its value without an event (edit, reset), and an OnPush popup is not
    // checked after it: follow the input's own `value` setter instead
    const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (native?.get && native.set) {
      const { get, set } = native;
      Object.defineProperty(this.input, 'value', {
        configurable: true,
        get: () => get.call(this.input),
        set: (value: string) => {
          set.call(this.input, value);
          this.showText();
        },
      });
    }
    this.showText();

    effect(() => {
      if (!this.desktop()) this.close(false);
    });

    inject(DestroyRef).onDestroy(() => {
      this.input.removeEventListener('mousedown', onMouseDown);
      this.input.removeEventListener('keydown', onKeyDown);
      this.input.removeEventListener('input', onInput);
      resize?.disconnect();
      delete (this.input as { value?: string }).value;
      this.text.remove();
      this.close(false);
    });
  }

  private showText(): void {
    const { day, time } = this.value();
    this.text.classList.toggle('empty', !day);
    if (!day) {
      this.text.textContent = $localize`:@@didditDate.label:Velg dato og klokkeslett`;
      return;
    }
    const date = new Intl.DateTimeFormat(this.locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    }).format(new Date(`${day}T00:00`));
    const [hours = '00', minutes = '00'] = time.split(':');
    this.text.textContent = $localize`:@@didditDate.closed:${date}:date:, kl. ${hours}:hours:.${minutes}:minutes:`;
  }

  private value(): { day: string; time: string } {
    const [day = '', time = ''] = this.input.value.split('T');
    return { day, time };
  }

  /** A new deadline starts at the next whole hour; after 23:00 today that is tomorrow 00:00 */
  private start(day: string): { day: string; time: string } {
    const next = new Date();
    next.setHours(next.getHours() + 1, 0, 0, 0);
    const time = `${pad(next.getHours())}:00`;
    return { day: day === isoDay(new Date()) ? isoDay(next) : day, time };
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
    // The chosen day first, else the first day that can be chosen
    (
      menu.querySelector<HTMLElement>('[aria-pressed="true"]') ??
      menu.querySelector<HTMLElement>('.diddit-date-day:not(:disabled)') ??
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
    // Left/right one day, up/down one week; past the edge the next or previous month shows
    grid.addEventListener('keydown', (event) => {
      const by = (
        { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>
      )[event.key];
      const from = (event.target as HTMLElement).dataset['day'];
      if (!by || !from) return;
      event.preventDefault();
      const [y, m, d] = from.split('-').map(Number);
      const to = new Date(y, m - 1, d + by);
      // A day before min cannot take focus: stay put
      if (min && isoDay(to) < min) return;
      if (
        to.getMonth() !== this.month.getMonth() ||
        to.getFullYear() !== this.month.getFullYear()
      ) {
        this.month = new Date(to.getFullYear(), to.getMonth(), 1);
        this.render();
      }
      this.menu?.querySelector<HTMLElement>(`.diddit-date-day[data-day="${isoDay(to)}"]`)?.focus();
    });
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
        const start = this.start(iso);
        const time = this.value().time;
        if (time) this.write(iso, time);
        else this.write(start.day, start.time);
        this.render();
        this.menu?.querySelector<HTMLElement>('.diddit-date-day[aria-pressed="true"]')?.focus();
      });
      button.setAttribute('aria-label', label.format(date));
      button.dataset['day'] = iso;
      button.setAttribute('aria-pressed', String(iso === chosen));
      button.classList.toggle('today', iso === today);
      button.disabled = !!min && iso < min;
      grid.append(button);
    }

    const timeRow = document.createElement('label');
    timeRow.className = 'diddit-date-time';
    const timeLabel = document.createElement('span');
    timeLabel.textContent = $localize`:@@didditDate.time:Klokkeslett`;
    // Diddit's own 24-hour field, never the browser's `type=time`: that one follows the browser's
    // language and draws «06:00 AM» in a Norwegian app (ST-1520)
    const timeField = document.createElement('input');
    timeField.type = 'text';
    timeField.className = 'form-input diddit-date-clock';
    timeField.inputMode = 'numeric';
    timeField.autocomplete = 'off';
    timeField.maxLength = 5;
    timeField.value = time || this.start(today).time;
    const commit = (): void => {
      const chosen = parseTime(timeField.value);
      if (chosen) {
        timeField.value = chosen;
        this.write(this.value().day || today, chosen);
      } else {
        timeField.value = this.value().time || this.start(today).time;
      }
    };
    timeField.addEventListener('change', commit);
    timeField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commit();
      }
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
