import type { Meta, StoryObj } from '@storybook/angular';
import type { AssignmentSubtask } from '@st44/types';
import { SubtaskRow } from './subtask-row';

const subtask: AssignmentSubtask = {
  id: 's1',
  name: 'Rydd pulten',
  points: 5,
  position: 0,
  state: null,
  updatedAt: null,
};

/** The child or parent's one-row view of a sub-task (ST-2074, drawn on ST-2042 sheets 2–4). */
const meta: Meta<SubtaskRow> = {
  title: 'Components/Poeng/SubtaskRow',
  component: SubtaskRow,
  tags: ['autodocs'],
  argTypes: {
    subtask: { control: 'object' },
    readonly: { control: 'boolean' },
    busy: { control: 'boolean' },
    toggleDone: { action: 'toggleDone' },
    toggleNotPossible: { action: 'toggleNotPossible' },
  },
  args: { subtask, readonly: false, busy: false },
  decorators: [
    () => ({
      template: '<div style="width: 313px; padding: 16px; background: #fff;"><story /></div>',
    }),
  ],
};

export default meta;
type Story = StoryObj<SubtaskRow>;

export const Open: Story = {};
export const Done: Story = {
  args: { subtask: { ...subtask, state: 'done', updatedAt: '2026-11-02T16:02:00.000Z' } },
};
export const NotPossible: Story = {
  args: { subtask: { ...subtask, name: 'Støvsug gulvet', points: 10, state: 'not_possible' } },
};
export const ReadOnlyDone: Story = { args: { ...Done.args, readonly: true } };
export const ReadOnlyNotPossible: Story = { args: { ...NotPossible.args, readonly: true } };
export const Busy: Story = { args: { busy: true } };
export const LongName: Story = {
  args: {
    subtask: { ...subtask, name: 'Støvsugingavhelekjellergulvetinklunderhyllene', points: 999 },
  },
};
