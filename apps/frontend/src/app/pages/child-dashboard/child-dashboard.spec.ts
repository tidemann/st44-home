import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ChildDashboardComponent } from './child-dashboard';
import { ApiService } from '../../services/api.service';
import { AvailableTasksSectionComponent } from '../../components/available-tasks-section/available-tasks-section';
import { NotificationSettings } from '../../components/notification-settings/notification-settings';
import { isoDay } from '../../utils/poeng-format';
import { HouseholdStore } from '../../stores/household.store';

describe('ChildDashboardComponent', () => {
  let fixture: ComponentFixture<ChildDashboardComponent>;
  let taskDate: (offset: number) => string;
  let hold: Promise<void> | null = null;
  /** ST-2227: GET /households */
  let householdsAnswer: unknown[] = [];
  let rewardsHold: Promise<void> | null = null;
  let turnsAnswer: { turns: unknown[]; myChildId: string } = { turns: [], myChildId: 'c-mathea' };
  let todayTasks: unknown[] | null = null;

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
    post: vi.fn(async (endpoint: string) =>
      endpoint.endsWith('/complete')
        ? {
            taskAssignment: {
              id: 't1',
              status: 'completed',
              completedAt: '2026-11-01T15:48:00.000Z',
            },
            completion: { id: 'k1', pointsEarned: 5, completedAt: '2026-11-01T15:48:00.000Z' },
            turn: { nextChildName: 'Jonas' },
          }
        : {},
    ),
    get: vi.fn(async (endpoint: string) => {
      if (endpoint === '/households') return householdsAnswer;
      if (endpoint.startsWith('/children/me/tasks')) {
        if (hold) await hold;
        const yesterday = endpoint.includes(`date=${isoDay(-1)}`);
        return {
          childName: 'Mathea',
          totalPointsToday: 20,
          completedPoints: 10,
          tasks: yesterday
            ? [task('a0', 'Rydde rommet', -1, 'pending')]
            : (todayTasks ?? [
                task('a1', 'Mate katten', 0, 'pending'),
                task('a2', 'Dekke bordet', 0, 'completed'),
              ]),
        };
      }
      if (endpoint.startsWith('/children/me/turns')) return turnsAnswer;
      if (endpoint.startsWith('/children/me/rewards')) {
        if (rewardsHold) await rewardsHold;
        return { rewards: [], pointsBalance: 35 };
      }
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
    rewardsHold = null;
    turnsAnswer = { turns: [], myChildId: 'c-mathea' };
    todayTasks = null;
    householdsAnswer = [];
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

  it('ST-2143: asks for the week, and a weekly chore reads «Frist søndag», on the day «Frist i dag»', async () => {
    const dueDay = new Date(`${isoDay(4)}T12:00:00Z`).toLocaleDateString('nb-NO', {
      weekday: 'long',
      timeZone: 'UTC',
    });
    todayTasks = [
      {
        ...task('w1', 'Tømme oppvaskmaskinen', 4, 'pending'),
        points: 5,
        ruleType: 'weekly_rotation',
      },
      { ...task('w2', 'Vaske badet', 0, 'pending'), points: 5, ruleType: 'weekly_rotation' },
      { ...task('d1', 'Rydde rommet', 0, 'pending'), ruleType: 'daily' },
    ];
    const el = await render();

    expect(api.get).toHaveBeenCalledWith(`/children/me/tasks?date=${isoDay()}&week=true`);
    // The overdue ask stays one exact day
    expect(api.get).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`date=${isoDay(-1)}$`)));
    const metas = Array.from(el.querySelectorAll('app-chore-row .rm')).map((m) =>
      m.textContent!.replace(/\s+/g, ' ').trim(),
    );
    expect(metas).toContain(`Frist ${dueDay} – 5 poeng`);
    expect(metas).toContain('Frist i dag – 5 poeng');
    expect(metas).toContain('I dag – 10 poeng');
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

  // On a slow network the tasks may answer before the rewards the meter needs: the band keeps
  // its hold until both are in, so it does not drop to the no-goal height and grow back
  it('keeps the band hold until the rewards arrive after the tasks', async () => {
    let release!: () => void;
    rewardsHold = new Promise((r) => (release = r));
    const el = await render();

    expect(el.querySelector('.bandhold app-points-meter')).not.toBeNull();
    expect(el.querySelector('h1.page-title .page-title-bar')).not.toBeNull();
    expect(el.querySelector('.hero')?.closest('.bandhold')).not.toBeNull();

    release();
    await new Promise((r) => setTimeout(r));
    for (let i = 0; i < 4; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    expect(el.querySelector('.bandhold')).toBeNull();
    expect(el.querySelector('.hero')!.textContent).toBe('35');
    expect(el.querySelector('h1.page-title')!.textContent).toBe('Mathea');
  });

  // ST-2075 «Etter tur»: drawings 4, 5 and 6 on ST-2066 (approved on ST-2054)
  const dishwasher = (turnChildId: string) => ({
    taskId: 'task-1',
    name: 'Tømme oppvaskmaskinen',
    points: 5,
    assignmentId: 't1',
    order: [
      { childId: 'c-mathea', name: 'Mathea' },
      { childId: 'c-jonas', name: 'Jonas' },
      { childId: 'c-emma', name: 'Emma' },
    ],
    turnChildId,
    scanCode: null,
  });

  it('«Din tur»: a normal row with the normal tick and «Ferdig», next child on the second line', async () => {
    turnsAnswer = { turns: [dishwasher('c-mathea')], myChildId: 'c-mathea' };
    const el = await render();

    expect(el.textContent).toContain('Din tur');
    expect(rowTitles(el)[0]).toBe('Tømme oppvaskmaskinen');
    const row = el.querySelector('app-chore-row')!;
    expect(row.querySelector('.cb')).not.toBeNull();
    expect(row.querySelector('.rm')!.textContent!.trim()).toBe('neste: Jonas · 5 poeng');
    expect(row.querySelector('button.rbtn')!.textContent!.trim()).toBe('Ferdig');
  });

  it('«Etter tur»: someone else has the turn, no tick, and the child is told they are next', async () => {
    turnsAnswer = { turns: [dishwasher('c-emma')], myChildId: 'c-mathea' };
    const el = await render();

    expect(el.textContent).toContain('Etter tur');
    const row = el.querySelector('app-chore-row')!;
    expect(row.querySelector('.cb')).toBeNull();
    expect(row.querySelector('button.rbtn')).toBeNull();
    expect(row.querySelector('.rm')!.textContent!.replace(/\s+/g, ' ').trim()).toBe(
      'Emma har turen · du er nestemann',
    );
    expect(row.querySelector('.pts')!.textContent!.trim()).toBe('5 p');
  });

  it('the tick on «Din tur» opens «Haket av» and says who has the turn now', async () => {
    turnsAnswer = { turns: [dishwasher('c-mathea')], myChildId: 'c-mathea' };
    const el = await render();
    (el.querySelector('app-chore-row button.rbtn') as HTMLButtonElement).click();
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }

    expect(api.post).toHaveBeenCalledWith('/assignments/t1/complete', {});
    const moment = el.querySelector('app-tick-moment')!;
    expect(moment.querySelector('.ymeta')!.textContent).toMatch(/^Haket av \d\d\.\d\d$/);
    const inset = moment.querySelector('.inset.turn')!;
    expect(inset.querySelector('.rm')!.textContent!.trim()).toBe('Turen gikk videre til');
    expect(inset.querySelector('.rt')!.textContent!.trim()).toBe('Jonas');
  });

  // ===== ST-2227: one account, child here and admin elsewhere =====

  const twoHouseholds = [
    { id: 'fam', name: 'Familien Nordmann', role: 'child', createdAt: '', updatedAt: '' },
    { id: 'own', name: 'Jonas sin husstand', role: 'admin', createdAt: '', updatedAt: '' },
  ];

  it('in more than one household the sub-line says where and as what, in place of the date', async () => {
    householdsAnswer = twoHouseholds;
    TestBed.inject(HouseholdStore).setActiveHousehold('fam');
    const el = await render();
    const button = el.querySelector('.page-subtitle-menu') as HTMLButtonElement;
    expect(button.textContent).toContain('Familien Nordmann · Barn');
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    button.click();
    fixture.detectChanges();
    const sheet = el.querySelector('app-household-sheet') as HTMLElement;
    expect(sheet.textContent).toContain('Du er med i to husstander, med ulik rolle.');
    expect(sheet.textContent).toContain('Du er barn');
    expect(sheet.textContent).toContain('Du er administrator');
  });

  it('with one household the sub-line still says where and as what, without a menu', async () => {
    householdsAnswer = [twoHouseholds[0]];
    TestBed.inject(HouseholdStore).setActiveHousehold('fam');
    const el = await render();
    expect(el.querySelector('.page-subtitle-menu')).toBeNull();
    expect(el.textContent).toContain('Familien Nordmann · Barn');
  });

  it('after a link the informative toast is announced once', async () => {
    householdsAnswer = twoHouseholds;
    TestBed.inject(HouseholdStore).setActiveHousehold('fam');
    history.replaceState({ linkedHousehold: 'Familien Nordmann' }, '');
    const el = await render();
    const status = el.querySelector('[role="status"][aria-live="polite"]') as HTMLElement;
    expect(status.textContent).toContain(
      'Du er med i Familien Nordmann som barn. Jonas sin husstand finner du under «Bytt husstand».',
    );
    expect(history.state?.linkedHousehold).toBeUndefined();
  });
});
