import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyGroup } from './empty-group';

describe('EmptyGroup', () => {
  let fixture: ComponentFixture<EmptyGroup>;
  const card = () => fixture.nativeElement.querySelector('.card') as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EmptyGroup] }).compileComponents();
    fixture = TestBed.createComponent(EmptyGroup);
    fixture.componentRef.setInput('heading', 'Ingen oppgaver er haket av i dag');
    fixture.componentRef.setInput('hint', 'Når noen haker av en oppgave, dukker den opp her.');
    fixture.detectChanges();
  });

  it('shows the title line and the one sentence, as a status, with no button', () => {
    expect(card().getAttribute('role')).toBe('status');
    expect(card().querySelector('.title')?.textContent?.trim()).toBe(
      'Ingen oppgaver er haket av i dag',
    );
    expect(card().querySelector('.sub')?.textContent?.trim()).toBe(
      'Når noen haker av en oppgave, dukker den opp her.',
    );
    expect(card().querySelector('button')).toBeNull();
  });

  it('is the 13 / 15 px card unless roomy', () => {
    expect(card().classList).not.toContain('roomy');
    fixture.componentRef.setInput('roomy', true);
    fixture.detectChanges();
    expect(card().classList).toContain('roomy');
  });
});
