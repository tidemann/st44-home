import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DidditMark } from '../../diddit-mark/diddit-mark';

/**
 * ST-1410, pictures only — the yellow top of a sign-in page.
 *
 * Rule 1 says a page's left edge is the left edge of the Diddit mark in the menu. A
 * sign-in page has no menu, so it carries the mark itself: the same 80 px yellow row
 * as `app-top-tabs`, the same 880 px container, the same lockup (mark 36 + wordmark
 * 26/800 ink), and no tabs and no badge — nobody is signed in yet. The page's own
 * title row sits under it on the same yellow, so the band reads as one piece and
 * ends 17 px under the sub-line (rule 2: 191 px).
 */
@Component({
  selector: 'app-auth-top',
  imports: [DidditMark],
  template: `<div class="top">
    <app-diddit-mark [size]="36" />
    <span class="wordmark" translate="no">Diddit</span>
  </div>`,
  styles: [
    `
      :host {
        display: none;
      }

      @media (min-width: 1024px) {
        :host {
          display: block;
          background: var(--yellow);
          color: var(--ink);
        }
      }

      .top {
        max-width: 880px;
        height: 80px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      /* «Diddit», ink y 29.5…49.5 — the tab row's own wordmark */
      .wordmark {
        font-family: var(--font-display);
        font-size: 26px;
        font-weight: 800;
        line-height: 1;
        letter-spacing: -0.02em;
        color: var(--ink);
        padding-top: 2px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthTop {}
