import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatCard } from './stat-card';
import { ComponentRef } from '@angular/core';

describe('StatCard', () => {
  let component: StatCard;
  let componentRef: ComponentRef<StatCard>;
  let fixture: ComponentFixture<StatCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCard],
    }).compileComponents();

    fixture = TestBed.createComponent(StatCard);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display icon', () => {
    componentRef.setInput('icon', '✓');
    componentRef.setInput('value', '3/8');
    componentRef.setInput('label', 'Today');
    fixture.detectChanges();

    const iconElement = fixture.nativeElement.querySelector('.stat-icon');
    expect(iconElement?.textContent).toContain('✓');
  });

  it('should display value', () => {
    componentRef.setInput('icon', '✓');
    componentRef.setInput('value', '3/8');
    componentRef.setInput('label', 'Today');
    fixture.detectChanges();

    const valueElement = fixture.nativeElement.querySelector('.stat-value');
    expect(valueElement?.textContent).toContain('3/8');
  });

  it('should display numeric value', () => {
    componentRef.setInput('icon', '⭐');
    componentRef.setInput('value', 450);
    componentRef.setInput('label', 'Points');
    fixture.detectChanges();

    const valueElement = fixture.nativeElement.querySelector('.stat-value');
    expect(valueElement?.textContent).toContain('450');
  });

  it('should display label', () => {
    componentRef.setInput('icon', '✓');
    componentRef.setInput('value', '3/8');
    componentRef.setInput('label', 'Today');
    fixture.detectChanges();

    const labelElement = fixture.nativeElement.querySelector('.stat-label');
    expect(labelElement?.textContent).toContain('Today');
  });

  it('should apply custom gradient class when provided', () => {
    componentRef.setInput('icon', '✓');
    componentRef.setInput('value', '3/8');
    componentRef.setInput('label', 'Today');
    componentRef.setInput('gradient', 'custom-gradient');
    fixture.detectChanges();

    const cardElement = fixture.nativeElement.querySelector('.stat-card');
    expect(cardElement?.classList.contains('custom-gradient')).toBe(true);
  });

  it('should have correct CSS classes', () => {
    componentRef.setInput('icon', '✓');
    componentRef.setInput('value', '3/8');
    componentRef.setInput('label', 'Today');
    fixture.detectChanges();

    const cardElement = fixture.nativeElement.querySelector('.stat-card');
    const iconElement = fixture.nativeElement.querySelector('.stat-icon');
    const valueElement = fixture.nativeElement.querySelector('.stat-value');
    const labelElement = fixture.nativeElement.querySelector('.stat-label');

    expect(cardElement).toBeTruthy();
    expect(iconElement).toBeTruthy();
    expect(valueElement).toBeTruthy();
    expect(labelElement).toBeTruthy();
  });

  it('should display percentage value correctly', () => {
    componentRef.setInput('icon', '📊');
    componentRef.setInput('value', '87%');
    componentRef.setInput('label', 'Completion Rate');
    fixture.detectChanges();

    const valueElement = fixture.nativeElement.querySelector('.stat-value');
    expect(valueElement?.textContent).toContain('87%');
  });

  it('should handle different emoji icons', () => {
    const icons = ['✓', '📅', '⭐', '🔥', '🏆', '📊'];

    icons.forEach((icon) => {
      componentRef.setInput('icon', icon);
      componentRef.setInput('value', '1');
      componentRef.setInput('label', 'Test');
      fixture.detectChanges();

      const iconElement = fixture.nativeElement.querySelector('.stat-icon');
      expect(iconElement?.textContent).toContain(icon);
    });
  });
});
