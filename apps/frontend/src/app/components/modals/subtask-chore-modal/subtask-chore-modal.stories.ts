import { Meta, StoryObj, applicationConfig } from '@storybook/angular';
import type { AssignmentSubtask } from '@st44/types';
import { SubtaskChoreModal } from './subtask-chore-modal';
import { TaskService } from '../../../services/task.service';

const sub = (
  name: string,
  points: number,
  state: AssignmentSubtask['state'] = null,
  updatedAt: string | null = null,
): AssignmentSubtask => ({ id: name, name, points, position: 0, state, updatedAt });

/**
 * The child's chore with sub-tasks (ST-2074, drawn on ST-2042 sheet 3; Stig chose a popup).
 * Each tick or «Ikke mulig» is saved at once; «Ferdig» finishes the chore when every sub-task is
 * ticked, and otherwise sends it to a parent. The stories save into nothing.
 */
const meta: Meta<SubtaskChoreModal> = {
  title: 'Components/Modals/SubtaskChoreModal',
  component: SubtaskChoreModal,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: TaskService,
          useValue: {
            setSubtaskState: async () => [],
            submitTask: async () => new Date().toISOString(),
          },
        },
      ],
    }),
  ],
  parameters: { layout: 'fullscreen', viewport: { defaultViewport: 'mobile1' } },
  argTypes: {
    chore: { control: 'object', description: 'The chore and its sub-tasks; null closes it' },
    closed: { action: 'closed' },
    completed: { action: 'completed' },
    submitted: { action: 'submitted' },
  },
};

export default meta;
type Story = StoryObj<SubtaskChoreModal>;

/** 1 — Nothing done yet: «3 av 3 igjen» */
export const NothingDone: Story = {
  args: {
    chore: {
      id: 'a1',
      taskName: 'Rydd rommet',
      subtasks: [sub('Re opp sengen', 5), sub('Rydd pulten', 5), sub('Støvsug gulvet', 10)],
    },
  },
};

/** 2 — One ticked, one «Ikke mulig»: «Ferdig» sends it to a parent */
export const OneTickedOneNotPossible: Story = {
  args: {
    chore: {
      id: 'a1',
      taskName: 'Rydd rommet',
      subtasks: [
        sub('Re opp sengen', 5, 'done', '2026-11-02T16:02:00.000Z'),
        sub('Rydd pulten', 5),
        sub('Støvsug gulvet', 10, 'not_possible', '2026-11-02T16:03:00.000Z'),
      ],
    },
  },
};

/** 3 — All ticked: «Alt gjort!», «Du får 20 poeng.» */
export const AllDone: Story = {
  args: {
    chore: {
      id: 'a1',
      taskName: 'Rydd rommet',
      subtasks: [
        sub('Re opp sengen', 5, 'done', '2026-11-02T16:02:00.000Z'),
        sub('Rydd pulten', 5, 'done', '2026-11-02T16:09:00.000Z'),
        sub('Støvsug gulvet', 10, 'done', '2026-11-02T16:15:00.000Z'),
      ],
    },
  },
};
