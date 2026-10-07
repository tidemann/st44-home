import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { Child } from '@st44/types';
import { SetupWizard } from './setup-wizard';
import { HouseholdService } from '../../services/household.service';
import { ChildrenService } from '../../services/children.service';
import { TaskService } from '../../services/task.service';
import { PushNotificationService, type PushState } from '../../services/push-notification.service';
import { QrCodeDisplayComponent } from '../../components/qr-code-display/qr-code-display';
import { StorageService } from '../../services/storage.service';
import { STORAGE_KEYS } from '../../services/storage-keys';

@Component({ selector: 'app-qr-code-display', template: '' })
class FakeQrCode {
  readonly childId = input.required<string>();
  readonly childName = input('');
}

describe('SetupWizard', () => {
  let component: SetupWizard;
  let fixture: ComponentFixture<SetupWizard>;
  let pushState: ReturnType<typeof signal<PushState>>;
  let household: {
    createHousehold: ReturnType<typeof vi.fn>;
    updateHousehold: ReturnType<typeof vi.fn>;
    setActiveHousehold: ReturnType<typeof vi.fn>;
  };
  let children: {
    createChild: ReturnType<typeof vi.fn>;
    listChildren: ReturnType<typeof vi.fn>;
  };
  let tasks: { createTask: ReturnType<typeof vi.fn> };
  let push: {
    state: typeof pushState;
    refresh: ReturnType<typeof vi.fn>;
    enable: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let stored: Record<string, unknown>;
  let storage: {
    get: ReturnType<typeof vi.fn>;
    setWithTTL: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  async function create(): Promise<void> {
    fixture = TestBed.createComponent(SetupWizard);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Let resume() load the children
    await new Promise((resolve) => setTimeout(resolve));
  }

  const child = (id: string, name: string): Child =>
    ({ id, householdId: 'h-1', name, birthYear: 2018 }) as Child;

  beforeEach(async () => {
    pushState = signal<PushState>('off');
    household = {
      createHousehold: vi.fn().mockResolvedValue({ id: 'h-1', name: 'Familien Dahl' }),
      updateHousehold: vi.fn().mockResolvedValue({ id: 'h-1', name: 'Dahl' }),
      setActiveHousehold: vi.fn(),
    };
    children = {
      createChild: vi
        .fn()
        .mockImplementation((_h: string, data: { name: string }) =>
          Promise.resolve(child(`c-${data.name}`, data.name)),
        ),
      listChildren: vi.fn().mockResolvedValue([]),
    };
    tasks = { createTask: vi.fn().mockImplementation(() => of({ id: 't' })) };
    push = {
      state: pushState,
      refresh: vi.fn().mockResolvedValue('off'),
      enable: vi.fn().mockImplementation(async () => {
        pushState.set('on');
        return 'on';
      }),
    };
    router = { navigate: vi.fn().mockResolvedValue(true) };
    stored = {};
    storage = {
      get: vi.fn((key: string) => stored[key] ?? null),
      setWithTTL: vi.fn((key: string, value: unknown) => {
        stored[key] = value;
      }),
      remove: vi.fn((key: string) => {
        delete stored[key];
      }),
    };

    await TestBed.configureTestingModule({
      imports: [SetupWizard],
      providers: [
        { provide: HouseholdService, useValue: household },
        { provide: ChildrenService, useValue: children },
        { provide: TaskService, useValue: tasks },
        { provide: PushNotificationService, useValue: push },
        { provide: Router, useValue: router },
        { provide: StorageService, useValue: storage },
      ],
    })
      .overrideComponent(SetupWizard, {
        remove: { imports: [QrCodeDisplayComponent] },
        add: { imports: [FakeQrCode] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SetupWizard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the family, makes it active and goes to step 2', async () => {
    component.familyName.set('  Familien Dahl ');
    await component.saveFamily();

    expect(household.createHousehold).toHaveBeenCalledWith('Familien Dahl');
    expect(household.setActiveHousehold).toHaveBeenCalledWith('h-1');
    expect(component.step()).toBe(2);
  });

  it('renames the family instead of making a second one after "Tilbake"', async () => {
    component.familyName.set('Familien Dahl');
    await component.saveFamily();
    component.back();
    component.familyName.set('Dahl');
    await component.saveFamily();

    expect(household.createHousehold).toHaveBeenCalledTimes(1);
    expect(household.updateHousehold).toHaveBeenCalledWith('h-1', 'Dahl');
  });

  it('stays on step 1 with a message when the family cannot be saved', async () => {
    household.createHousehold.mockRejectedValue(new Error('500'));
    component.familyName.set('Familien Dahl');
    await component.saveFamily();

    expect(component.step()).toBe(1);
    expect(component.error()).toContain('Prøv igjen');
    expect(component.busy()).toBe(false);
  });

  it('adds children with a birth year from the age, and shows a QR code for each', async () => {
    component.familyName.set('Familien Dahl');
    await component.saveFamily();

    component.childName.set('Emma');
    component.childAge.set('8');
    await component.addChild();
    component.childName.set('Jonas');
    component.childAge.set('');
    await component.addChild();
    fixture.detectChanges();

    expect(children.createChild).toHaveBeenCalledWith('h-1', {
      name: 'Emma',
      birthYear: new Date().getFullYear() - 8,
    });
    expect(children.createChild).toHaveBeenCalledWith('h-1', {
      name: 'Jonas',
      birthYear: undefined,
    });
    expect(component.childName()).toBe('');
    expect(fixture.nativeElement.querySelectorAll('app-qr-code-display').length).toBe(2);
  });

  it('suggests five chores with three ticked, and adds an own chore', () => {
    expect(component.chores().length).toBe(5);
    expect(component.chosenCount()).toBe(3);

    component.toggleChore(3);
    component.ownChore.set('Gå tur med hunden');
    component.addOwnChore();

    expect(component.chosenCount()).toBe(5);
    expect(component.chores().at(-1)).toEqual({
      name: 'Gå tur med hunden',
      points: 10,
      chosen: true,
    });
  });

  it('creates the chosen chores as daily chores shared by the children', async () => {
    component.familyName.set('Familien Dahl');
    await component.saveFamily();
    component.childName.set('Emma');
    await component.addChild();

    await component.saveChores();

    expect(tasks.createTask).toHaveBeenCalledTimes(3);
    expect(tasks.createTask).toHaveBeenCalledWith('h-1', {
      name: 'Re opp sengen',
      points: 5,
      ruleType: 'daily',
      ruleConfig: { assignedChildren: ['c-Emma'] },
    });
    expect(component.step()).toBe(4);
  });

  it('does not send a chore twice when saving is tried again', async () => {
    component.familyName.set('Familien Dahl');
    await component.saveFamily();
    tasks.createTask
      .mockReturnValueOnce(of({ id: 't1' }))
      .mockReturnValueOnce(throwError(() => new Error('500')));
    component.step.set(3);

    await component.saveChores();
    expect(component.step()).toBe(3);
    expect(component.error()).toContain('Prøv igjen');

    await component.saveChores();
    expect(tasks.createTask).toHaveBeenCalledTimes(4);
    expect(component.createdChores().length).toBe(3);
    expect(component.step()).toBe(4);
  });

  it('makes an own chore even when it has the same name as a suggestion', async () => {
    component.familyName.set('Familien Dahl');
    await component.saveFamily();
    component.ownChore.set('Re opp sengen');
    component.addOwnChore();

    await component.saveChores();

    expect(tasks.createTask).toHaveBeenCalledTimes(4);
    expect(component.createdChores().length).toBe(4);
  });

  it('sends nothing again and says "Neste" when the parent comes back to step 3', async () => {
    component.familyName.set('Familien Dahl');
    await component.saveFamily();
    await component.saveChores();
    component.back();
    fixture.detectChanges();

    expect(component.chosenCount()).toBe(0);
    component.toggleChore(0);
    expect(component.chores()[0].chosen).toBe(true);

    await component.saveChores();
    expect(tasks.createTask).toHaveBeenCalledTimes(3);
    expect(component.step()).toBe(4);
  });

  it('adds a typed child on "Neste" instead of dropping the name', async () => {
    component.familyName.set('Familien Dahl');
    await component.saveFamily();
    component.childName.set('Emma');

    await component.childrenDone();

    expect(children.createChild).toHaveBeenCalledWith('h-1', {
      name: 'Emma',
      birthYear: undefined,
    });
    expect(component.step()).toBe(3);
  });

  it('stays on step 2 when the typed child cannot be added', async () => {
    component.familyName.set('Familien Dahl');
    await component.saveFamily();
    children.createChild.mockRejectedValue(new Error('500'));
    component.childName.set('Emma');

    await component.childrenDone();

    expect(component.step()).toBe(2);
    expect(component.childName()).toBe('Emma');
  });

  it('goes to the summary with reminders off when turning them on fails', async () => {
    push.enable.mockRejectedValue(new Error('push failed'));
    component.step.set(4);

    await component.turnOnReminders();

    expect(component.busy()).toBe(false);
    expect(component.step()).toBe(5);
    expect(component.remindersOn()).toBe(false);
  });

  it('turns reminders on, then shows the summary and goes home', async () => {
    component.familyName.set('Familien Dahl');
    component.step.set(4);
    await component.turnOnReminders();
    fixture.detectChanges();

    expect(push.enable).toHaveBeenCalled();
    expect(component.step()).toBe(5);
    expect(fixture.nativeElement.textContent).toContain('Familien Dahl er klar');

    await component.finish();
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('skips reminders without asking the browser', () => {
    component.step.set(4);
    component.skipReminders();

    expect(push.enable).not.toHaveBeenCalled();
    expect(component.step()).toBe(5);
    expect(component.remindersOn()).toBe(false);
  });

  it('offers only "Neste" when reminders cannot be turned on here', () => {
    pushState.set('needs-install');
    component.step.set(4);
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).map((b) => b.textContent?.trim());
    expect(buttons).toEqual(['Neste']);
    expect(fixture.nativeElement.textContent).toContain('kan ikke slås på her');
  });

  it('counts steps 4a and 4b as step 4 on the progress line', () => {
    component.step.set(5);
    expect(component.progressStep()).toBe(4);
  });

  it('goes on with the same household after a reload, and forgets it at "Gå til Hjem"', async () => {
    component.familyName.set('Familien Dahl');
    await component.saveFamily();
    expect(stored[STORAGE_KEYS.SETUP_IN_PROGRESS]).toEqual({
      householdId: 'h-1',
      name: 'Familien Dahl',
    });

    // Reload: a new wizard picks up the household and its children
    children.listChildren.mockResolvedValue([child('c-1', 'Emma')]);
    await create();

    expect(component.step()).toBe(2);
    expect(component.householdId()).toBe('h-1');
    expect(component.familyName()).toBe('Familien Dahl');
    expect(component.children().map((c) => c.name)).toEqual(['Emma']);

    await component.finish();
    expect(stored[STORAGE_KEYS.SETUP_IN_PROGRESS]).toBeUndefined();
    expect(household.createHousehold).toHaveBeenCalledTimes(1);
  });

  it('says the parent is offline when a save fails without a connection', async () => {
    household.createHousehold.mockRejectedValue(new Error('network'));
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    component.familyName.set('Familien Dahl');

    try {
      await component.saveFamily();
      expect(component.error()).toContain('ikke på nett');
    } finally {
      // Back to the prototype's getter
      delete (navigator as { onLine?: boolean }).onLine;
    }
  });
});
