import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/**
 * The Diddit mark (guide: The Diddit mark): an ink rounded square with a yellow tick,
 * the geometry of docs/design/diddit/reference/diddit-mark.svg. Inlined rather than
 * loaded from a URL, so it renders the same under every locale's base href.
 *
 * Two colour pairs only: ink square + yellow tick (default), or `inverted` for a
 * yellow square + ink tick. Scale the whole viewBox, never the stroke on its own.
 * Minimum drawn size 24 px.
 *
 * With a `label` it is an image named by that label; without one it is decorative
 * (use that when the wordmark beside it already says "Diddit").
 */
@Component({
  selector: 'app-diddit-mark',
  template: `<svg
    viewBox="0 0 54 54"
    [attr.width]="size()"
    [attr.height]="size()"
    [attr.role]="label() ? 'img' : null"
    [attr.aria-label]="label() || null"
    [attr.aria-hidden]="label() ? null : 'true'"
    focusable="false"
  >
    <rect width="54" height="54" rx="16" ry="16" [attr.fill]="inverted() ? yellow : ink" />
    <path
      d="M14.5 28.5 L23 37 L39.5 18"
      fill="none"
      [attr.stroke]="inverted() ? ink : yellow"
      stroke-width="6.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      line-height: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DidditMark {
  /** Drawn size in px; 54 is the login size, 24 the minimum */
  size = input<number>(54);

  /** Yellow square with an ink tick (app icon on a dark ground) */
  inverted = input<boolean>(false);

  /** Accessible name; leave empty when the wordmark beside it carries the name */
  label = input<string>('');

  protected readonly ink = '#17120A';
  protected readonly yellow = '#F6B93B';
}
