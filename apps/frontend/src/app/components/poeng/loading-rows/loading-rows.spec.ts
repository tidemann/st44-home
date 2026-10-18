import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingRows } from './loading-rows';

describe('LoadingRows', () => {
  let fixture: ComponentFixture<LoadingRows>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LoadingRows] }).compileComponents();
    fixture = TestBed.createComponent(LoadingRows);
    el = fixture.nativeElement;
  });

  it('draws three placeholder rows by default, hidden from screen readers', () => {
    fixture.detectChanges();
    const rows = el.querySelectorAll('.row');
    expect(rows.length).toBe(3);
    rows.forEach((row) => expect(row.getAttribute('aria-hidden')).toBe('true'));
  });

  it('draws as many rows as asked for', () => {
    fixture.componentRef.setInput('count', 5);
    fixture.detectChanges();
    expect(el.querySelectorAll('.row').length).toBe(5);
  });

  it('announces the loading state, not a visible sentence', () => {
    fixture.componentRef.setInput('label', 'Laster oppgavene dine');
    fixture.detectChanges();
    expect(el.getAttribute('role')).toBe('status');
    expect(el.querySelector('.visually-hidden')?.textContent?.trim()).toBe('Laster oppgavene dine');
  });
});
