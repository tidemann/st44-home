import { Component, ChangeDetectionStrategy, input } from '@angular/core';

export type NavIconName = 'home' | 'tasks' | 'rewards' | 'family' | 'progress';

/**
 * The four Poeng bottom-nav icons, plus progress for the desktop sidebar. Stroked in currentColor, so the active
 * amber and the inactive muted come from the button around it.
 */
@Component({
  selector: 'app-nav-icon',
  templateUrl: './nav-icon.html',
  styles: ':host { display: inline-flex; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavIcon {
  name = input.required<NavIconName>();
}
