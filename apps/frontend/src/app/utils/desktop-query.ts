import { DestroyRef, inject, signal, type Signal } from '@angular/core';

/** The one breakpoint (guide: The breakpoint): desktop A from 1024 px, the phone under it */
export const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

/**
 * True while the window is 1024 px or wider. For markup that only exists in one layout
 * (a column that moves); pure styling stays in CSS media queries. Call in an injection context.
 */
export function isDesktopSignal(): Signal<boolean> {
  const mql = typeof window !== 'undefined' && window.matchMedia?.(DESKTOP_MEDIA_QUERY);
  const desktop = signal(mql ? mql.matches : false);
  if (mql) {
    const onChange = (event: MediaQueryListEvent) => desktop.set(event.matches);
    mql.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => mql.removeEventListener('change', onChange));
  }
  return desktop.asReadonly();
}
