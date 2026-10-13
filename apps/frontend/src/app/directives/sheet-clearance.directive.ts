import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/** The page's own bottom room grows by this while a bottom sheet is up */
export const SHEET_CLEARANCE_VAR = '--sheet-clearance';

/**
 * Guide: Popups, «The sheet covering the last chore row». While the host bottom sheet is in the
 * DOM, sets --sheet-clearance on the root to its height plus 8 px, so the layouts' scroll room
 * lets the last row scroll clear of it. Removed when the sheet goes.
 */
@Directive({ selector: '[appSheetClearance]' })
export class SheetClearance {
  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const root = document.documentElement;
    const set = (): void => {
      root.style.setProperty(SHEET_CLEARANCE_VAR, `${Math.ceil(host.offsetHeight) + 8}px`);
    };
    // The host is not laid out yet in the constructor; measure once it is
    afterNextRender({ read: set });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(set);
    observer?.observe(host);
    inject(DestroyRef).onDestroy(() => {
      observer?.disconnect();
      root.style.removeProperty(SHEET_CLEARANCE_VAR);
    });
  }
}
