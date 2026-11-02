import type { Meta, StoryObj } from '@storybook/angular';
import type { Assignment, AssignmentSubtask } from '@st44/types';
import { SubtaskReviewModal } from './subtask-review-modal';

const sub = (
  name: string,
  points: number,
  state: AssignmentSubtask['state'] = null,
  updatedAt: string | null = null,
): AssignmentSubtask => ({ id: name, name, points, position: 0, state, updatedAt });

const chore = (subtasks: AssignmentSubtask[], submittedAt: string | null): Assignment => ({
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
  subtasks,
  submittedAt,
});

/**
 * The parent's approval of a chore with sub-tasks (ST-2074, drawn on ST-2042 sheet 4). The rows
 * are read only, with the thin grey read edge (ST-2052 choice 5); «Godkjenn» gives the points of
 * the done ones, «Ikke mulig» and not done give 0.
 */
const meta: Meta<SubtaskReviewModal> = {
  title: 'Components/Modals/SubtaskReviewModal',
  component: SubtaskReviewModal,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', viewport: { defaultViewport: 'mobile1' } },
  argTypes: {
    chore: { control: 'object', description: 'The chore being approved; null closes it' },
    busy: { control: 'boolean', description: 'The approval is on its way' },
    error: { control: 'text', description: 'Why the approval did not go through' },
    closed: { action: 'closed' },
    approve: { action: 'approve' },
  },
  args: { busy: false, error: null },
};

export default meta;
type Story = StoryObj<SubtaskReviewModal>;

/** 1 — Two done, one «Ikke mulig»: «Emma får 10 av 20 poeng» */
export const TwoDoneOneNotPossible: Story = {
  args: {
    chore: chore(
      [
        sub('Re opp sengen', 5, 'done', '2026-11-02T16:02:00.000Z'),
        sub('Rydd pulten', 5, 'done', '2026-11-02T16:09:00.000Z'),
        sub('Støvsug gulvet', 10, 'not_possible', '2026-11-02T16:10:00.000Z'),
      ],
      '2026-11-02T16:20:00.000Z',
    ),
  },
};

/** 2 — Nothing done: «Emma får 0 av 20 poeng»; the same button approves 0 */
export const NothingDone: Story = {
  args: {
    chore: chore(
      [
        sub('Re opp sengen', 5, 'not_possible', '2026-11-02T16:02:00.000Z'),
        sub('Rydd pulten', 5),
        sub('Støvsug gulvet', 10, 'not_possible', '2026-11-02T16:03:00.000Z'),
      ],
      '2026-11-02T16:20:00.000Z',
    ),
  },
};
