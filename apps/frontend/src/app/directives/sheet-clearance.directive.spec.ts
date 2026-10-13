import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SHEET_CLEARANCE_VAR, SheetClearance } from './sheet-clearance.directive';

@Component({
  imports: [SheetClearance],
  template: `@if (shown()) {
    <section appSheetClearance style="height: 120px"></section>
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly shown = signal(true);
}

describe('SheetClearance', () => {
  const clearance = () => document.documentElement.style.getPropertyValue(SHEET_CLEARANCE_VAR);

  it('gives the page the sheet height plus 8 px and takes it back when the sheet goes', () => {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    const sheet = (fixture.nativeElement as HTMLElement).querySelector('section') as HTMLElement;
    expect(sheet).toBeTruthy();
    expect(clearance()).toBe(`${Math.ceil(sheet.offsetHeight) + 8}px`);

    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();
    expect(clearance()).toBe('');
    fixture.destroy();
  });
});
