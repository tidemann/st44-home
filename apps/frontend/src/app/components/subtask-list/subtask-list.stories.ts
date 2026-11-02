import type { Meta, StoryObj } from '@storybook/angular';
import { SubtaskList, subtaskDraft } from './subtask-list';

/** The editable rows of a chore's optional sub-tasks (ST-2074, drawn on ST-2042 sheets 2–4). */
const meta: Meta<SubtaskList> = {
  title: 'Components/SubtaskList',
  component: SubtaskList,
  tags: ['autodocs'],
  argTypes: {
    items: { control: 'object' },
    showErrors: { control: 'boolean' },
    itemsChange: { action: 'itemsChange' },
  },
  args: { items: [], showErrors: false },
  decorators: [
    () => ({
      template: '<div style="width: 313px; padding: 16px; background: #fff;"><story /></div>',
    }),
  ],
};

export default meta;
type Story = StoryObj<SubtaskList>;

export const Empty: Story = {};
export const One: Story = { args: { items: [subtaskDraft('Re opp sengen', 5)] } };
export const Three: Story = {
  args: {
    items: [
      subtaskDraft('Re opp sengen', 5),
      subtaskDraft('Rydd pulten', 5),
      subtaskDraft('Støvsug gulvet', 10),
    ],
  },
};
export const WithErrors: Story = {
  args: { items: [subtaskDraft('', 5), subtaskDraft('Rydd pulten', null)], showErrors: true },
};
export const Six: Story = {
  args: {
    items: [
      subtaskDraft('Støvsugingavhelekjellergulvetinklunderhyllene', 15),
      subtaskDraft('Ø', 1),
      subtaskDraft('Re opp sengen og legg pysjamasen under puta', 5),
      subtaskDraft('掃除機をかける', 999),
      subtaskDraft('Rydd pulten', 5),
      subtaskDraft('Støvsug gulvet', 10),
    ],
  },
};
