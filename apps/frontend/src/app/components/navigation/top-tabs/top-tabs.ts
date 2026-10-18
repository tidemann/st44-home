import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { NavIcon, type NavIconName } from '../nav-icon';
import { DidditMark } from '../../diddit-mark/diddit-mark';
import { InitialBadge } from '../../initial-badge/initial-badge';

/** One tab in the yellow top */
export interface TopTab<T extends string = string> {
  id: T;
  icon: NavIconName;
  label: string;
}

/**
 * The yellow top's first line from 1024 px (guide: Desktop and tablet — layout A).
 * The Diddit mark and wordmark, the menu as tabs, the initial badge on the right; edge to
 * edge yellow, contents in the 880 px container. The chosen tab is the ink pill (ST-890).
 * Under 1024 px it is not shown: the phone's bottom menu takes over.
 */
@Component({
  selector: 'app-top-tabs',
  imports: [NavIcon, DidditMark, InitialBadge],
  templateUrl: './top-tabs.html',
  styleUrl: './top-tabs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopTabs<T extends string = string> {
  /** The tabs, left to right */
  tabs = input.required<TopTab<T>[]>();

  /** The chosen tab's id; any other value chooses none */
  activeId = input.required<T | 'none'>();

  /** Emitted with the tab's id when a tab is pressed */
  navigate = output<T>();

  /**
   * The sign-in pages without a menu (guide: Desktop: rules for all pages, choice 2): the same
   * 80 px row with the mark and the wordmark, no tabs and no initial badge.
   */
  bare = input<boolean>(false);
}
