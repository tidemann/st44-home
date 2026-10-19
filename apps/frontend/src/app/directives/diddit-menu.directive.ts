import { DestroyRef, Directive, ElementRef, effect, inject } from '@angular/core';
import { isDesktopSignal } from '../utils/desktop-query';

let nextMenuId = 0;

/**
 * Guide: Desktop rules for all popups, rule 6 — no browser chrome inside a popup. On desktop the
 * host `<select>` keeps its Diddit field and caret, but pressing it opens a Diddit menu instead of
 * the operating system's own list. The phone keeps the native picker, unchanged.
 *
 * The `<select>` stays the form control: choosing an option sets its value and fires `change`, so
 * `formControlName` and `ngModel` work as before. The menu is a `popover` in the top layer, so the
 * popup body's scroll and the veil do not clip it.
 */
@Directive({ selector: 'select[appDidditMenu]' })
export class DidditMenu {
  private readonly select = inject(ElementRef<HTMLSelectElement>)
    .nativeElement as HTMLSelectElement;
  private readonly desktop = isDesktopSignal();
  private readonly menuId = `diddit-menu-${nextMenuId++}`;
  private list: HTMLElement | null = null;
  private active = -1;

  constructor() {
    const onMouseDown = (event: MouseEvent): void => {
      if (!this.desktop() || event.button !== 0 || this.select.disabled) return;
      event.preventDefault();
      this.select.focus();
      if (this.list) this.close();
      else this.open();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!this.desktop() || this.list || this.select.disabled) return;
      if ([' ', 'Enter', 'ArrowDown', 'ArrowUp', 'F4'].includes(event.key)) {
        event.preventDefault();
        this.open();
      }
    };
    this.select.addEventListener('mousedown', onMouseDown);
    this.select.addEventListener('keydown', onKeyDown);

    // Leaving desktop with the menu open: the phone has no Diddit menu
    effect(() => {
      if (!this.desktop()) this.close(false);
    });

    inject(DestroyRef).onDestroy(() => {
      this.select.removeEventListener('mousedown', onMouseDown);
      this.select.removeEventListener('keydown', onKeyDown);
      this.close(false);
    });
  }

  private options(): HTMLOptionElement[] {
    return Array.from(this.select.options).filter((option) => !option.disabled);
  }

  private open(): void {
    const options = this.options();
    if (options.length === 0) return;

    const list = document.createElement('div');
    list.id = this.menuId;
    list.className = 'diddit-menu';
    list.setAttribute('role', 'listbox');
    list.setAttribute('tabindex', '-1');
    const label = this.select.labels?.[0]?.textContent?.trim();
    if (label) list.setAttribute('aria-label', label);
    list.setAttribute('popover', 'manual');

    options.forEach((option, index) => {
      const item = document.createElement('div');
      item.id = `${this.menuId}-${index}`;
      item.className = 'diddit-menu-option';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(option.value === this.select.value));
      item.textContent = option.textContent;
      item.addEventListener('mousedown', (event) => event.preventDefault());
      item.addEventListener('click', () => this.choose(index));
      item.addEventListener('mousemove', () => this.setActive(index));
      list.appendChild(item);
    });

    list.addEventListener('keydown', (event) => this.onListKey(event));
    list.addEventListener('focusout', (event) => {
      if (!list.contains(event.relatedTarget as Node | null)) this.close(false);
    });

    // Inside the popup, so the popup's focus trap still counts it as its own
    this.select.insertAdjacentElement('afterend', list);
    this.list = list;
    this.select.setAttribute('aria-expanded', 'true');
    this.select.setAttribute('aria-controls', this.menuId);
    list.showPopover?.();
    this.place();
    document.addEventListener('mousedown', this.onOutside, true);
    window.addEventListener('resize', this.onReflow);
    window.addEventListener('scroll', this.onReflow, true);

    const selected = options.findIndex((option) => option.value === this.select.value);
    this.setActive(selected >= 0 ? selected : 0);
    list.focus();
  }

  /** Under the field, the field's width; above it when the window has no room below */
  private place(): void {
    if (!this.list) return;
    const field = this.select.getBoundingClientRect();
    const gap = 4;
    const room = window.innerHeight - field.bottom - gap - 24;
    this.list.style.left = `${field.left}px`;
    this.list.style.width = `${field.width}px`;
    const height = this.list.offsetHeight;
    const top = height > room && field.top > room ? field.top - gap - height : field.bottom + gap;
    this.list.style.top = `${Math.max(gap, top)}px`;
  }

  private readonly onReflow = (event?: Event): void => {
    if (event?.target === this.list) return;
    this.place();
  };

  private readonly onOutside = (event: MouseEvent): void => {
    const target = event.target as Node;
    if (this.list?.contains(target) || target === this.select) return;
    this.close(false);
  };

  private setActive(index: number): void {
    if (!this.list) return;
    const items = Array.from(this.list.children) as HTMLElement[];
    items.forEach((item, i) => item.classList.toggle('active', i === index));
    this.active = index;
    const item = items[index];
    if (item) {
      this.list.setAttribute('aria-activedescendant', item.id);
      item.scrollIntoView?.({ block: 'nearest' });
    }
  }

  private onListKey(event: KeyboardEvent): void {
    const last = this.options().length - 1;
    switch (event.key) {
      case 'ArrowDown':
        this.setActive(Math.min(last, this.active + 1));
        break;
      case 'ArrowUp':
        this.setActive(Math.max(0, this.active - 1));
        break;
      case 'Home':
        this.setActive(0);
        break;
      case 'End':
        this.setActive(last);
        break;
      case 'Enter':
      case ' ':
        this.choose(this.active);
        break;
      case 'Escape':
        // The menu closes, not the popup around it
        event.stopPropagation();
        this.close();
        break;
      case 'Tab':
        this.close();
        return;
      default:
        return;
    }
    event.preventDefault();
  }

  private choose(index: number): void {
    const option = this.options()[index];
    if (option && option.value !== this.select.value) {
      this.select.value = option.value;
      this.select.dispatchEvent(new Event('input', { bubbles: true }));
      this.select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    this.close();
  }

  private close(refocus = true): void {
    if (!this.list) return;
    const list = this.list;
    this.list = null;
    this.active = -1;
    document.removeEventListener('mousedown', this.onOutside, true);
    window.removeEventListener('resize', this.onReflow);
    window.removeEventListener('scroll', this.onReflow, true);
    this.select.setAttribute('aria-expanded', 'false');
    this.select.removeAttribute('aria-controls');
    list.remove();
    if (refocus) this.select.focus();
  }
}
