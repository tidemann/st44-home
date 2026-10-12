import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DESKTOP_MEDIA_QUERY, isDesktopSignal } from './desktop-query';

@Component({ selector: 'app-probe', template: '' })
class Probe {
  readonly desktop = isDesktopSignal();
}

describe('isDesktopSignal', () => {
  let listeners: ((event: MediaQueryListEvent) => void)[];
  let removed: number;
  let original: typeof window.matchMedia;

  function fakeMatchMedia(matches: boolean) {
    return vi.fn((query: string) => ({
      matches,
      media: query,
      addEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => listeners.push(fn),
      removeEventListener: () => removed++,
    })) as unknown as typeof window.matchMedia;
  }

  beforeEach(() => {
    listeners = [];
    removed = 0;
    original = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = original;
  });

  it('should ask for 1024 px and wider and start from the current match', () => {
    window.matchMedia = fakeMatchMedia(true);
    const fixture = TestBed.createComponent(Probe);

    expect(window.matchMedia).toHaveBeenCalledWith(DESKTOP_MEDIA_QUERY);
    expect(DESKTOP_MEDIA_QUERY).toBe('(min-width: 1024px)');
    expect(fixture.componentInstance.desktop()).toBe(true);
  });

  it('should follow the window across the breakpoint and stop listening when destroyed', () => {
    window.matchMedia = fakeMatchMedia(false);
    const fixture = TestBed.createComponent(Probe);
    expect(fixture.componentInstance.desktop()).toBe(false);

    listeners.forEach((fn) => fn({ matches: true } as MediaQueryListEvent));
    expect(fixture.componentInstance.desktop()).toBe(true);

    fixture.destroy();
    expect(removed).toBe(1);
  });
});
