import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { StreakCounter } from './streak-counter';

describe('StreakCounter', () => {
  function message(currentStreak: number): string {
    const fixture = TestBed.createComponent(StreakCounter);
    fixture.componentRef.setInput('currentStreak', currentStreak);
    fixture.componentRef.setInput('longestStreak', 30);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('.streak-message')!.textContent!;
  }

  // ST-800: «Denne uken» on the child screen is Norwegian source text
  it('speaks Norwegian at every streak length', () => {
    expect(message(0)).toBe('Start rekka di i dag!');
    expect(message(2)).toBe('Du er i siget!');
    expect(message(5)).toBe('For en jevnhet!');
    expect(message(40)).toBe('Legendarisk rekke!');
  });
});
