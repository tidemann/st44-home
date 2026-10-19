import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import type { Child } from '@st44/types';
import { ChildrenManagementComponent } from './children-management';
import { ChildrenService } from '../../services/children.service';
import { HouseholdService } from '../../services/household.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

describe('ChildrenManagementComponent', () => {
  const child = (name: string, birthYear: number | null): Child => ({
    id: `00000000-0000-4000-8000-00000000000${name.length}`,
    householdId: '00000000-0000-4000-8000-000000000000',
    name,
    birthYear,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChildrenManagementComponent],
      providers: [
        {
          provide: ChildrenService,
          useValue: {
            listChildren: vi.fn().mockResolvedValue([child('Ola', 2016), child('Kari', null)]),
          },
        },
        { provide: HouseholdService, useValue: { getActiveHouseholdId: () => 'h1' } },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
      ],
    });
  });

  it('shows an age line only for a child with a birth year (no «Alder: 0 (Født )»)', async () => {
    const fixture = TestBed.createComponent(ChildrenManagementComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const cards = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.child-details'),
    );
    expect(cards.map((c) => c.querySelector('h3')?.textContent?.trim())).toEqual(['Ola', 'Kari']);

    const age = (c: Element) => c.querySelector('.child-age')?.textContent?.replace(/\s+/g, ' ');
    expect(age(cards[0])).toContain('(Født 2016)');
    expect(age(cards[1])).toBeUndefined();
  });
});
