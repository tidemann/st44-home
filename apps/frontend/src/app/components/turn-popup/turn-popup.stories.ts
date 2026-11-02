import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import type { TaskTurn, TurnHistoryEntry } from '@st44/types';
import { TurnService } from '../../services/turn.service';
import { TurnPopup } from './turn-popup';

const TURN: TaskTurn = {
  taskId: '00000000-0000-4000-8000-000000000001',
  name: 'Tømme oppvaskmaskinen',
  points: 5,
  assignmentId: '00000000-0000-4000-8000-000000000002',
  order: [
    { childId: '00000000-0000-4000-8000-0000000000e1', name: 'Emma' },
    { childId: '00000000-0000-4000-8000-0000000000e2', name: 'Jonas' },
    { childId: '00000000-0000-4000-8000-0000000000e3', name: 'Mathea' },
  ],
  turnChildId: '00000000-0000-4000-8000-0000000000e1',
  scanCode: '4KQ7MF',
};

const HISTORY: TurnHistoryEntry[] = [
  { kind: 'app', childId: TURN.order[0].childId, childName: 'Emma', at: '2026-11-01T15:48:00.000Z', points: 5, movedByName: null },
  { kind: 'scan', childId: TURN.order[1].childId, childName: 'Jonas', at: '2026-11-01T08:14:00.000Z', points: 5, movedByName: null },
  { kind: 'moved', childId: TURN.order[2].childId, childName: 'Mathea', at: '2026-10-30T17:02:00.000Z', points: 0, movedByName: 'Mor' },
];

const meta: Meta<TurnPopup> = {
  title: 'Components/TurnPopup',
  component: TurnPopup,
  tags: ['autodocs'],
  argTypes: {
    householdId: { control: 'text' },
    turn: { control: 'object' },
    startView: { control: 'select', options: ['history', 'move', 'code'] },
    householdName: { control: 'text' },
  },
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: TurnService,
          useValue: {
            history: async () => HISTORY,
            moveTurn: async () => TURN,
          },
        },
      ],
    }),
  ],
};

export default meta;
type Story = StoryObj<TurnPopup>;

const sharedArgs = {
  householdId: 'hh-1',
  turn: TURN,
  householdName: 'Familien Nordmoen',
};

export const History: Story = {
  args: { ...sharedArgs, startView: 'history' },
};

export const Move: Story = {
  args: { ...sharedArgs, startView: 'move' },
};

export const Code: Story = {
  args: { ...sharedArgs, startView: 'code' },
};

export const HistoryEmpty: Story = {
  args: { ...sharedArgs, startView: 'history' },
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: TurnService,
          useValue: {
            history: async () => [],
            moveTurn: async () => TURN,
          },
        },
      ],
    }),
  ],
};
