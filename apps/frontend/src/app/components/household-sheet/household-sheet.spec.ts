import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HouseholdSheet } from './household-sheet';
import type { HouseholdListItem } from '../../services/household.service';

const household = (id: string, name: string, memberCount: number): HouseholdListItem => ({
  id,
  name,
  createdAt: '2026-10-01',
  updatedAt: '2026-10-01',
  role: 'admin',
  memberCount,
});

describe('HouseholdSheet («Bytt husstand», ST-1065)', () => {
  let fixture: ComponentFixture<HouseholdSheet>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HouseholdSheet] }).compileComponents();
    fixture = TestBed.createComponent(HouseholdSheet);
    el = fixture.nativeElement;
    fixture.componentRef.setInput('households', [
      household('a', 'Familien Dahl', 5),
      household('b', 'Hytta på Geilo', 4),
    ]);
    fixture.componentRef.setInput('activeId', 'a');
    fixture.componentRef.setInput('activeDay', '3 av 7 gjort i dag');
  });

  it('renders nothing while closed', () => {
    fixture.detectChanges();
    expect(el.querySelector('.sheet')).toBeNull();
  });

  it('lists each household with its members, the day on the chosen one, and «Valgt nå»', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(el.querySelector('.sheet-lead')?.textContent?.trim()).toBe('Du er med i to husstander.');
    const rows = Array.from(el.querySelectorAll('.sheet-row'));
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('.sheet-row-detail')?.textContent?.trim()).toBe(
      '5 medlemmer – 3 av 7 gjort i dag',
    );
    expect(rows[1].querySelector('.sheet-row-detail')?.textContent?.trim()).toBe('4 medlemmer');
    expect(rows[0].querySelector('.sheet-row-chosen')).toBeTruthy();
    expect(rows[1].querySelector('.sheet-row-chosen')).toBeNull();
  });

  it('emits pick for another household, and only closes for the chosen one', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const picked: string[] = [];
    let closed = 0;
    fixture.componentInstance.pick.subscribe((id) => picked.push(id));
    fixture.componentInstance.closed.subscribe(() => closed++);

    const rows = el.querySelectorAll<HTMLButtonElement>('.sheet-row');
    rows[1].click();
    rows[0].click();

    expect(picked).toEqual(['b']);
    expect(closed).toBe(1);
  });

  it('closes on Escape and on the veil, and «Administrer husstander» emits manage', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    let closed = 0;
    let managed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.componentInstance.manage.subscribe(() => managed++);

    // Escape works wherever focus is: the listener is on the document
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    el.querySelector<HTMLElement>('.sheet-veil')?.click();
    el.querySelector<HTMLButtonElement>('.sheet-manage')?.click();

    expect(closed).toBe(2);
    expect(managed).toBe(1);
  });
});
