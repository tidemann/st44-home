import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ChildDashboardComponent } from './child-dashboard';
import { ApiService } from '../../services/api.service';
import { AvailableTasksSectionComponent } from '../../components/available-tasks-section/available-tasks-section';
import { NotificationSettings } from '../../components/notification-settings/notification-settings';
import { isoDay } from '../../utils/poeng-format';

describe('ChildDashboardComponent', () => {
  let fixture: ComponentFixture<ChildDashboardComponent>;
  let taskDate: (offset: number) => string;
  let hold: Promise<void> | null = null;

  const task = (id: string, taskName: string, offset: number, status: string) => ({
    id,
    taskName,
    taskDescription: null,
    points: 10,
    date: taskDate(offset),
    status,
    completedAt: status === 'completed' ? new Date().toISOString() : null,
  });

  const api = {
    get: vi.fn(async (endpoint: string) => {
      if (endpoint.startsWith('/children/me/tasks')) {
        if (hold) await hold;
        const yesterday = endpoint.includes(`date=${isoDay(-1)}`);
        return {
          childName: 'Mathea',
          totalPointsToday: 20,
          completedPoints: 10,
          tasks: yesterday
            ? [task('a0', 'Rydde rommet', -1, 'pending')]
            : [task('a1', 'Mate katten', 0, 'pending'), task('a2', 'Dekke bordet', 0, 'completed')],
        };
      }
      if (endpoint.startsWith('/children/me/rewards')) return { rewards: [], pointsBalance: 35 };
      if (endpoint.startsWith('/children/me/analytics')) {
        const progress = { totalTasks: 0, completedTasks: 0, completionRate: 0, pointsEarned: 0 };
        return {
          currentStreak: 0,
          longestStreak: 0,
          weekProgress: progress,
          monthProgress: progress,
          dailyPoints: [],
        };
      }
      return {};
    }),
  };

  async function render(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(ChildDashboardComponent);
    for (let i = 0; i < 4; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    taskDate = (offset) => isoDay(offset);
    hold = null;
    api.get.mockClear();

    await TestBed.configureTestingModule({
      imports: [ChildDashboardComponent],
      providers: [provideRouter([]), { provide: ApiService, useValue: api }],
    })
      .overrideComponent(ChildDashboardComponent, {
        remove: { imports: [AvailableTasksSectionComponent, NotificationSettings] },
        add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
  });

  function rowTitles(el: HTMLElement): string[] {
    return Array.from(el.querySelectorAll('app-chore-row .rt')).map((t) => t.textContent!.trim());
  }

  it('shows the checkbox, title and who-and-when line in every row', async () => {
    const el = await render();

    expect(rowTitles(el)).toEqual(['Rydde rommet', 'Mate katten', 'Dekke bordet']);
    expect(el.querySelectorAll('app-chore-row .cb').length).toBe(3);
    expect(el.querySelectorAll('app-chore-row .rm').length).toBe(3);
    expect(el.textContent).toContain('Forfalt');
    expect(el.textContent).toContain('I dag');
  });

  it('labels the row button «Ferdig», not «Hak av»', async () => {
    const el = await render();

    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('button.rbtn'));
    expect(buttons.map((b) => b.textContent!.trim())).toEqual(['Ferdig', 'Ferdig']);
    expect(buttons[1].getAttribute('aria-label')).toBe('Merk som ferdig: Mate katten');
    expect(el.textContent).not.toMatch(/hak av/i);
  });

  // ST-808: the API sent DATE columns as "2026-10-10T00:00:00.000Z". dayWord threw
  // inside the row bindings, change detection stopped, and each row kept only its
  // projected row button: no checkbox, no title, no group headings.
  it('still renders full rows when the API sends dates as ISO timestamps', async () => {
    taskDate = (offset) => `${isoDay(offset)}T00:00:00.000Z`;
    const el = await render();

    expect(rowTitles(el)).toEqual(['Rydde rommet', 'Mate katten', 'Dekke bordet']);
    expect(el.querySelectorAll('app-chore-row .cb').length).toBe(3);
    const metas = Array.from(el.querySelectorAll('app-chore-row .rm')).map((m) =>
      m.textContent!.trim(),
    );
    expect(metas[0]).toBe('Forfalt i går');
    expect(metas[1]).toBe('I dag – 10 poeng');
  });

  // ST-908: picture 12 draws no reminders and no week block in the right column
  function stubWidth(desktop: boolean): void {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: desktop,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  }

  it('keeps the reminders and the week block on the phone', async () => {
    stubWidth(false);
    const el = await render();
    vi.unstubAllGlobals();

    expect(el.querySelector('app-notification-settings')).not.toBeNull();
    expect(el.querySelector('.analytics-section')).not.toBeNull();
  });

  it('drops the reminders and the week block on desktop', async () => {
    stubWidth(true);
    const el = await render();
    vi.unstubAllGlobals();

    expect(el.querySelector('app-notification-settings')).toBeNull();
    expect(el.querySelector('.analytics-section')).toBeNull();
    expect(el.textContent).toContain('Gjort i dag');
  });

  // ST-1839 (Stig, ST-1838 A): while the list loads, the title is a grey bar and an invisible
  // copy of the band content holds the band at its loaded height
  it('holds the band and shows the title bar until the name arrives', async () => {
    let release!: () => void;
    hold = new Promise((r) => (release = r));
    fixture = TestBed.createComponent(ChildDashboardComponent);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.bandhold app-points-meter')).not.toBeNull();
    expect(el.querySelector('h1.page-title .page-title-bar')).not.toBeNull();

    release();
    for (let i = 0; i < 4; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    expect(el.querySelector('.bandhold')).toBeNull();
    expect(el.querySelector('h1.page-title')!.textContent).toBe('Mathea');
  });
});
