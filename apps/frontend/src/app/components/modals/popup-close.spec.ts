import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import type { OutputEmitterRef, Type } from '@angular/core';
import type { TaskTurn } from '@st44/types';
import { AddChildModal } from './add-child-modal/add-child-modal';
import { ChildDetailsModal } from './child-details-modal/child-details-modal';
import { ChildInviteModal } from './child-invite-modal/child-invite-modal';
import { EditTaskModal } from './edit-task-modal/edit-task-modal';
import { QrCodeModal } from './qr-code-modal/qr-code-modal';
import { QuickAddModal } from './quick-add-modal/quick-add-modal';
import { ReassignTaskModal } from './reassign-task-modal/reassign-task-modal';
import { SubtaskChoreModal } from './subtask-chore-modal/subtask-chore-modal';
import { SubtaskReviewModal } from './subtask-review-modal/subtask-review-modal';
import { TaskFormModal } from './task-form-modal/task-form-modal';
import { TurnPopup } from '../turn-popup/turn-popup';
import { HouseholdDayService } from '../../services/household-day.service';
import { TurnService } from '../../services/turn.service';

const TURN: TaskTurn = {
  taskId: 't1',
  name: 'Tømme oppvaskmaskinen',
  points: 5,
  assignmentId: 'a1',
  order: [
    { childId: 'c1', name: 'Emma' },
    { childId: 'c2', name: 'Jonas' },
  ],
  turnChildId: 'c1',
  scanCode: '4KQ7MF',
};

const ASSIGNMENT = {
  id: 'a1',
  taskId: 't1',
  title: 'Rydd rommet',
  description: null,
  ruleType: 'daily',
  childId: 'c1',
  childName: 'Emma',
  date: '2026-11-02',
  status: 'pending',
  completedAt: null,
  createdAt: '2026-11-02T05:00:00.000Z',
  points: 20,
  subtasks: [],
  submittedAt: '2026-11-02T16:00:00.000Z',
};

interface PopupCase {
  name: string;
  component: Type<unknown>;
  /** The inputs that open it */
  inputs: Record<string, unknown>;
  /** The output the page listens to for «close» */
  closeOutput: string;
}

/**
 * Every popup built on <app-modal> (ST-2168). The ✕, the dimmed background and Escape must
 * each reach the output the page listens to. A wrong event name on <app-modal> compiles
 * without an error and leaves the ✕ dead, as on «Etter tur» and «Skannekode».
 */
const POPUPS: PopupCase[] = [
  {
    name: 'AddChildModal',
    component: AddChildModal,
    inputs: { open: true },
    closeOutput: 'closeRequested',
  },
  {
    name: 'ChildDetailsModal',
    component: ChildDetailsModal,
    inputs: { open: true, householdId: 'h1' },
    closeOutput: 'closeRequested',
  },
  {
    name: 'ChildInviteModal',
    component: ChildInviteModal,
    inputs: { open: true, householdId: 'h1', childId: 'c1', childName: 'Emma' },
    closeOutput: 'closeRequested',
  },
  {
    name: 'EditTaskModal',
    component: EditTaskModal,
    inputs: { open: true },
    closeOutput: 'closeRequested',
  },
  {
    name: 'QrCodeModal',
    component: QrCodeModal,
    inputs: { open: true, childId: 'c1', childName: 'Emma' },
    closeOutput: 'closeRequested',
  },
  {
    name: 'QuickAddModal',
    component: QuickAddModal,
    inputs: { open: true, children: [] },
    closeOutput: 'closeRequested',
  },
  {
    name: 'ReassignTaskModal',
    component: ReassignTaskModal,
    inputs: { open: true, taskName: 'Rydd rommet', currentChildId: 'c1', children: [] },
    closeOutput: 'closeRequested',
  },
  {
    name: 'SubtaskChoreModal',
    component: SubtaskChoreModal,
    inputs: { chore: { id: 'a1', taskName: 'Rydd rommet', subtasks: [] } },
    closeOutput: 'closed',
  },
  {
    name: 'SubtaskReviewModal',
    component: SubtaskReviewModal,
    inputs: { chore: ASSIGNMENT },
    closeOutput: 'closed',
  },
  {
    name: 'TaskFormModal',
    component: TaskFormModal,
    inputs: { open: true, householdId: 'h1', children: [], mode: 'create' },
    closeOutput: 'closeRequested',
  },
  ...(['history', 'move', 'code'] as const).map((view) => ({
    name: `TurnPopup (${view})`,
    component: TurnPopup,
    inputs: { householdId: 'h1', startView: view, turn: TURN },
    closeOutput: 'closed',
  })),
];

describe('Every popup closes (ST-2168)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: HouseholdDayService,
          useValue: { thisWeekChildId: () => Promise.resolve(null) },
        },
        {
          provide: TurnService,
          useValue: { turns: () => Promise.resolve([]), history: () => Promise.resolve([]) },
        },
      ],
    }).compileComponents();
  });

  function open(popup: PopupCase) {
    const fixture = TestBed.createComponent(popup.component);
    for (const [key, value] of Object.entries(popup.inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    let closes = 0;
    const out = (fixture.componentInstance as Record<string, OutputEmitterRef<void>>)[
      popup.closeOutput
    ];
    out.subscribe(() => closes++);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="dialog"]'), `${popup.name} did not open`).not.toBeNull();
    return { el, closes: () => closes };
  }

  for (const popup of POPUPS) {
    it(`${popup.name}: ✕ closes it`, () => {
      const { el, closes } = open(popup);
      el.querySelector<HTMLButtonElement>('.modal-close')!.click();
      expect(closes()).toBe(1);
    });

    it(`${popup.name}: the dimmed background closes it`, () => {
      const { el, closes } = open(popup);
      el.querySelector<HTMLElement>('.modal-overlay')!.click();
      expect(closes()).toBe(1);
    });

    it(`${popup.name}: Escape closes it`, () => {
      const { closes } = open(popup);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(closes()).toBe(1);
    });
  }
});
